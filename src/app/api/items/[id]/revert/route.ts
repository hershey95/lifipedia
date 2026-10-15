import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince, httpUrl } from '@/lib/api';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { canContribute } from '@/lib/theme-lifecycle';
import { recordEdit, voidRevertedContributions } from '@/lib/contribution';
import { CONTRIBUTION_RULES, REVERT_LOOKBACK_REVISIONS } from '@/lib/contribution-rules';
import { buildDiff, changedFields, diffDelta, snapshotHash, toSnapshot, type ItemSnapshot } from '@/lib/wiki';

export const dynamic = 'force-dynamic';

const body = z.strictObject({
  toRevision: z.number().int().min(1),
  /** 되돌리기는 자동 병합하지 않는다 — 사용자가 본 최신 리비전이 어긋나면 거절. */
  baseRevision: z.number().int().min(1),
  summary: z.string().trim().max(200).optional(),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    if (user.contributionCount < CONTRIBUTION_RULES.MIN_CONTRIBUTIONS_TO_REVERT) {
      return fail(403, `되돌리기는 기여 ${CONTRIBUTION_RULES.MIN_CONTRIBUTIONS_TO_REVERT}건 이상부터 할 수 있습니다.`);
    }

    const recentEdits = await countSince(prisma.editHistory, { editorId: user.id }, 3_600);
    const rate = checkRate(recentEdits, ABUSE_LIMITS.EDITS_PER_HOUR, 3_600);
    if (!rate.allowed) return fail(429, rate.reason!);

    const payload = body.parse(await request.json().catch(() => null));

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { theme: { select: { id: true, status: true } } },
    });
    if (!item || item.isRemoved) return fail(404, '항목을 찾을 수 없습니다.');
    if (!canContribute(item.theme.status)) return fail(403, '정식 테마에서만 편집할 수 있습니다.');
    if (payload.baseRevision !== item.revision) {
      return fail(409, '그 사이 문서가 바뀌었습니다. 최신 문서를 확인하고 다시 시도해 주세요.', { currentRevision: item.revision });
    }
    if (payload.toRevision >= item.revision) return fail(400, '현재보다 이전 리비전으로만 되돌릴 수 있습니다.');
    if (item.revision - payload.toRevision > REVERT_LOOKBACK_REVISIONS) {
      return fail(400, `최근 ${REVERT_LOOKBACK_REVISIONS}개 리비전 안으로만 되돌릴 수 있습니다.`);
    }

    const target = await prisma.editHistory.findUnique({
      where: { itemId_revision: { itemId, revision: payload.toRevision } },
      select: { snapshot: true },
    });
    if (!target) return fail(404, '되돌릴 리비전을 찾을 수 없습니다.');

    const current = toSnapshot(item as unknown as Record<string, unknown>);
    const restored = toSnapshot(target.snapshot as unknown as ItemSnapshot);
    // 구 리비전이 느슨한 스키마 시절의 값(javascript: 등)을 담고 있을 수 있어 현재 규칙으로 다시 검증한다.
    const r = restored as unknown as { imageUrl?: string | null; purchaseLinks?: { url: string }[] | null };
    const urls = [r.imageUrl, ...(r.purchaseLinks ?? []).map((l) => l.url)].filter((u): u is string => !!u);
    if (!urls.every((u) => httpUrl.safeParse(u).success)) {
      return fail(400, '복원할 스냅샷에 허용되지 않는 링크가 있어 되돌릴 수 없습니다. 직접 편집해 주세요.');
    }
    const fields = changedFields(current, restored);
    if (fields.length === 0) return fail(400, '현재 내용과 같아 되돌릴 것이 없습니다.');

    const nextRevision = item.revision + 1;
    const diff = buildDiff(current, restored, item.revision, nextRevision);

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.item.updateMany({
        where: { id: itemId, revision: item.revision },
        data: { ...(restored as unknown as Record<string, never>), revision: nextRevision },
      });
      if (count === 0) throw Object.assign(new Error('revision race'), { code: 'P2002' });
      const history = await tx.editHistory.create({
        data: {
          itemId,
          editorId: user.id,
          revision: nextRevision,
          summary: payload.summary ?? `r${payload.toRevision}로 되돌림`,
          diff,
          snapshot: restored as unknown as object,
          contentHash: snapshotHash(restored),
          revertOfRevision: payload.toRevision,
        },
      });
      await tx.theme.update({ where: { id: item.theme.id }, data: { lastActivityAt: new Date() } });
      // 되돌리기 자체는 기여로 적립하지 않는다(REVERT). 되돌려진 편집의 기여는 무효화된다.
      await recordEdit(tx, {
        userId: user.id,
        itemId,
        editId: history.id,
        revertOfRevision: payload.toRevision,
        changedFields: fields,
        deltaChars: diffDelta(diff),
      });
      await voidRevertedContributions(tx, { itemId, toRevision: payload.toRevision, revertRevision: nextRevision, revertEditId: history.id });
    });

    return ok({ revision: nextRevision, revertOfRevision: payload.toRevision });
  } catch (error) {
    return handleError(error);
  }
}
