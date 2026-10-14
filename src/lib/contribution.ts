import type { Prisma } from '@prisma/client';
import { badgeFor, trustFromContributions } from './trust';
import { judgeEdit, type CreditDecision } from './contribution-rules';

/**
 * 신뢰도 = 원장에서 '적립됐고 무효화되지 않은' 이벤트 수. 이 경로로만 바뀐다 —
 * 운영자가 직접 수정하는 API 는 없다.
 */
export async function recomputeTrust(tx: Prisma.TransactionClient, userId: string) {
  const contributionCount = await tx.contributionEvent.count({ where: { userId, credited: true, voidedAt: null } });
  const trustScore = trustFromContributions(contributionCount);
  await tx.user.update({ where: { id: userId }, data: { contributionCount, trustScore, badgeLevel: badgeFor(contributionCount) } });
  return { contributionCount, trustScore };
}

/** 문서 생성 1건을 원장에 적립한다. */
export async function recordCreate(tx: Prisma.TransactionClient, p: { userId: string; itemId: string; editId: string }) {
  await tx.contributionEvent.create({ data: { userId: p.userId, kind: 'ITEM_CREATE', itemId: p.itemId, editId: p.editId, credited: true } });
  return recomputeTrust(tx, p.userId);
}

/** 편집 1건을 규칙에 따라 판정해 원장에 남기고(미적립 포함) 신뢰도를 다시 계산한다. */
export async function recordEdit(
  tx: Prisma.TransactionClient,
  p: { userId: string; itemId: string; editId: string; revertOfRevision: number | null; changedFields: string[]; deltaChars: number },
): Promise<CreditDecision> {
  const dayStart = new Date(Date.now() - 86_400_000);
  const creditedTodayOnItem = await tx.contributionEvent.count({
    where: { userId: p.userId, itemId: p.itemId, kind: 'EDIT', credited: true, voidedAt: null, createdAt: { gte: dayStart } },
  });
  const creditedToday = await tx.contributionEvent.count({
    where: { userId: p.userId, credited: true, voidedAt: null, createdAt: { gte: dayStart } },
  });
  const decision = judgeEdit({ ...p, creditedTodayOnItem, creditedToday });
  await tx.contributionEvent.create({
    data: { userId: p.userId, kind: 'EDIT', itemId: p.itemId, editId: p.editId, credited: decision.credited, reason: decision.reason },
  });
  await recomputeTrust(tx, p.userId);
  return decision;
}

/**
 * 리비전 `toRevision` 으로 되돌리면, 그 이후 ~ 되돌리기 직전까지의 편집이 취소된 것이다.
 * 해당 편집으로 받은 기여를 무효화한다. 반대로 이번 되돌리기가 이전 되돌리기의 구간을 다시 덮으면
 * (되돌리기를 되돌림) 그 되돌리기가 무효화했던 기여를 복원한다. 영향받은 사용자는 신뢰도를 다시 계산한다.
 */
export async function voidRevertedContributions(
  tx: Prisma.TransactionClient,
  p: { itemId: string; toRevision: number; revertRevision: number; revertEditId: string },
) {
  const range = await tx.editHistory.findMany({
    where: { itemId: p.itemId, revision: { gt: p.toRevision, lt: p.revertRevision } },
    select: { id: true },
  });
  const ids = range.map((r) => r.id);
  const affected = new Set<string>();

  // 복원: 범위 안의 되돌리기 편집이 무효화했던 이벤트
  const restore = await tx.contributionEvent.findMany({
    where: { voidedByEditId: { in: ids }, voidedAt: { not: null } },
    select: { id: true, userId: true },
  });
  if (restore.length) {
    await tx.contributionEvent.updateMany({ where: { id: { in: restore.map((e) => e.id) } }, data: { voidedAt: null, voidedByEditId: null } });
    restore.forEach((e) => affected.add(e.userId));
  }

  // 무효화: 범위 안의, 아직 유효한 적립 이벤트 (복원된 것은 제외하려고 복원 뒤에 조회)
  const events = await tx.contributionEvent.findMany({
    where: { editId: { in: ids }, credited: true, voidedAt: null },
    select: { id: true, userId: true },
  });
  if (events.length) {
    await tx.contributionEvent.updateMany({
      where: { id: { in: events.map((e) => e.id) } },
      data: { voidedAt: new Date(), voidedByEditId: p.revertEditId },
    });
    events.forEach((e) => affected.add(e.userId));
  }
  for (const userId of affected) await recomputeTrust(tx, userId);
}
