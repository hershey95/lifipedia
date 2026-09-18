import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince } from '@/lib/api';
import { ABUSE_LIMITS, checkRate, looksLikeVoteBurst } from '@/lib/abuse';
import { voteWeightFor } from '@/lib/trust';
import { canContribute } from '@/lib/theme-lifecycle';
import { recomputeItemScore } from '@/lib/scoring-service';

export const dynamic = 'force-dynamic';

const body = z.object({ type: z.enum(['UP', 'DOWN']) });

/**
 * 추천/비추천.
 *  - 한 유저는 한 항목에 한 표만 가진다(DB unique). 같은 방향 재투표는 취소로 동작한다.
 *  - 가중치는 투표 '시점'의 신뢰도로 고정되어 과거 랭킹의 재현성을 보장한다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const { type } = body.parse(await request.json());

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, isRemoved: true, theme: { select: { id: true, status: true } } },
    });
    if (!item || item.isRemoved) return fail(404, '항목을 찾을 수 없습니다.');
    if (!canContribute(item.theme.status)) return fail(403, '정식 테마에서만 투표할 수 있습니다.');

    const recentVotes = await countSince(prisma.vote, { userId: user.id }, 3_600);
    const rate = checkRate(recentVotes, ABUSE_LIMITS.VOTES_PER_HOUR, 3_600);
    if (!rate.allowed) return fail(429, rate.reason!, { retryAfterSeconds: rate.retryAfterSeconds });

    const weight = voteWeightFor({ trustScore: user.trustScore, accountCreatedAt: user.createdAt });

    const existing = await prisma.vote.findUnique({
      where: { itemId_userId: { itemId, userId: user.id } },
      select: { type: true },
    });

    let action: 'created' | 'changed' | 'removed';
    if (!existing) {
      await prisma.vote.create({ data: { itemId, userId: user.id, type, weight } });
      action = 'created';
    } else if (existing.type === type) {
      // 같은 방향을 다시 누르면 투표 취소
      await prisma.vote.delete({ where: { itemId_userId: { itemId, userId: user.id } } });
      action = 'removed';
    } else {
      await prisma.vote.update({
        where: { itemId_userId: { itemId, userId: user.id } },
        data: { type, weight },
      });
      action = 'changed';
    }

    const breakdown = await recomputeItemScore(itemId);
    await prisma.theme.update({ where: { id: item.theme.id }, data: { lastActivityAt: new Date() } });

    // 조작 의심 패턴은 차단하지 않고 검토 큐에 적재한다(오탐으로 참여를 막지 않기 위해).
    const burst = await prisma.vote.findMany({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - ABUSE_LIMITS.BURST_WINDOW_MINUTES * 60_000) } },
      select: { createdAt: true },
    });
    if (looksLikeVoteBurst(burst.map((v) => v.createdAt))) {
      await prisma.report.create({
        data: {
          targetType: 'ITEM',
          targetId: itemId,
          reason: 'AUTOMATED_VOTE_BURST',
          detail: `유저 ${user.id} 가 ${ABUSE_LIMITS.BURST_WINDOW_MINUTES}분 내 ${burst.length}회 투표`,
        },
      });
    }

    return ok({ action, myVote: action === 'removed' ? null : type, breakdown });
  } catch (error) {
    return handleError(error);
  }
}
