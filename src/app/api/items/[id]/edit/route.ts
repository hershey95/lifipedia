import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince, httpUrl } from '@/lib/api';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { canContribute } from '@/lib/theme-lifecycle';
import { recordEdit } from '@/lib/contribution';
import { buildDiff, changedFields, diffDelta, resolveEdit, snapshotHash, toSnapshot, type ItemSnapshot } from '@/lib/wiki';
import { REVERT_LOOKBACK_REVISIONS } from '@/lib/contribution-rules';

export const dynamic = 'force-dynamic';

const body = z.object({
  /** 편집자가 폼을 열 때 본 리비전. 동시 편집 감지의 기준. */
  baseRevision: z.number().int().min(1),
  summary: z.string().trim().max(200).optional(),
  name: z.string().trim().min(1).max(80),
  tier: z.enum(['BUDGET', 'MID', 'PREMIUM']),
  priceKrw: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  description: z.string().trim().min(10).max(20_000),
  specSummary: z.string().trim().max(5_000).nullable().optional(),
  recommendReason: z.string().trim().max(5_000).nullable().optional(),
  imageUrl: httpUrl.nullable().optional(),
  purchaseLinks: z.array(z.object({ label: z.string().trim().min(1).max(40), url: httpUrl })).max(8),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

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

    const current = toSnapshot(item as unknown as Record<string, unknown>);

    // 편집자가 기준으로 삼은 리비전의 스냅샷을 이력에서 꺼내온다.
    const baseHistory = await prisma.editHistory.findUnique({
      where: { itemId_revision: { itemId, revision: payload.baseRevision } },
      select: { snapshot: true },
    });
    if (!baseHistory) return fail(400, '기준 리비전을 찾을 수 없습니다. 최신 문서를 다시 불러와 주세요.');

    const base = baseHistory.snapshot as unknown as ItemSnapshot;
    const incoming = toSnapshot(payload as unknown as Record<string, unknown>);

    const resolution = resolveEdit({ base, incoming, current });

    if (resolution.status === 'conflict') {
      return fail(409, '다른 사용자가 같은 항목을 먼저 수정했습니다. 변경 내용을 확인하고 다시 저장해 주세요.', {
        conflict: true,
        conflictingFields: resolution.conflictingFields,
        currentRevision: item.revision,
        currentSnapshot: current,
      });
    }

    if (changedFields(current, resolution.merged).length === 0) {
      return fail(400, '변경된 내용이 없습니다.');
    }

    const nextRevision = item.revision + 1;
    const diff = buildDiff(current, resolution.merged, item.revision, nextRevision);
    const contentHash = snapshotHash(resolution.merged);

    // 최근 리비전 중 같은 내용이 있으면 '수동 되돌리기'로 보고 미적립 처리한다.
    // 타인 기여의 무효화는 되돌리기 API 에서만 일어난다 (오탐으로 남의 기여를 깎지 않도록).
    const lookback = await prisma.editHistory.findFirst({
      where: { itemId, contentHash, revision: { gte: item.revision - REVERT_LOOKBACK_REVISIONS, lt: item.revision } },
      orderBy: { revision: 'desc' },
      select: { revision: true },
    });
    const revertOfRevision = lookback?.revision ?? null;

    const saved = await prisma.$transaction(async (tx) => {
      const { count } = await tx.item.updateMany({
        where: { id: itemId, revision: item.revision },
        data: {
          ...(resolution.merged as unknown as Record<string, never>),
          revision: nextRevision,
        },
      });
      if (count === 0) throw Object.assign(new Error('revision race'), { code: 'P2002' });
      const updated = { revision: nextRevision };

      const history = await tx.editHistory.create({
        data: {
          itemId,
          editorId: user.id,
          revision: nextRevision,
          summary: payload.summary,
          diff,
          snapshot: resolution.merged as unknown as object,
          contentHash,
          revertOfRevision,
        },
      });

      await tx.theme.update({ where: { id: item.theme.id }, data: { lastActivityAt: new Date() } });
      await recordEdit(tx, {
        userId: user.id,
        itemId,
        editId: history.id,
        revertOfRevision,
        changedFields: changedFields(current, resolution.merged),
        deltaChars: diffDelta(diff),
      });

      return updated;
    });

    return ok({
      revision: saved.revision,
      autoMerged: resolution.status === 'stale-but-mergeable',
      alsoChangedByOthers: resolution.status === 'stale-but-mergeable' ? resolution.alsoChangedByOthers : [],
    });
  } catch (error) {
    return handleError(error);
  }
}
