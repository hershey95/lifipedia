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
  const decision = judgeEdit({ ...p, creditedTodayOnItem });
  await tx.contributionEvent.create({
    data: { userId: p.userId, kind: 'EDIT', itemId: p.itemId, editId: p.editId, credited: decision.credited, reason: decision.reason },
  });
  await recomputeTrust(tx, p.userId);
  return decision;
}

/**
 * 리비전 `toRevision` 으로 되돌리면, 그 이후 ~ 되돌리기 직전까지의 편집이 취소된 것이다.
 * 해당 편집으로 받은 기여를 무효화하고 영향받은 사용자의 신뢰도를 다시 계산한다.
 * ponytail: 되돌리기를 다시 되돌려도 무효화는 복원하지 않는다. 필요해지면 voidedByEditId 로 복원.
 */
export async function voidRevertedContributions(
  tx: Prisma.TransactionClient,
  p: { itemId: string; toRevision: number; revertRevision: number; revertEditId: string },
) {
  const reverted = await tx.editHistory.findMany({
    where: { itemId: p.itemId, revision: { gt: p.toRevision, lt: p.revertRevision } },
    select: { id: true },
  });
  const events = await tx.contributionEvent.findMany({
    where: { editId: { in: reverted.map((r) => r.id) }, credited: true, voidedAt: null },
    select: { id: true, userId: true },
  });
  if (events.length === 0) return;
  await tx.contributionEvent.updateMany({
    where: { id: { in: events.map((e) => e.id) } },
    data: { voidedAt: new Date(), voidedByEditId: p.revertEditId },
  });
  for (const userId of new Set(events.map((e) => e.userId))) await recomputeTrust(tx, userId);
}
