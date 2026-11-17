import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince } from '@/lib/api';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { voteWeightFor } from '@/lib/trust';
import { canContribute } from '@/lib/theme-lifecycle';
import { commentTally } from '@/lib/comments';

export const dynamic = 'force-dynamic';

const body = z.object({ type: z.enum(['UP', 'DOWN']) });

/**
 * 게시판 글 추천/비추천. 규칙은 문서 투표와 같다(같은 방향 재투표는 취소, 반대는 전환, 가중치는 시점 고정).
 * 랭킹(Item.score)·신뢰도에는 영향이 없다. 글의 점수는 가중 Wilson 하한(comments.ts)이다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const used =
      (await countSince(prisma.postVote, { userId: user.id }, 3_600)) +
      (await countSince(prisma.postCommentVote, { userId: user.id }, 3_600));
    const rate = checkRate(used, ABUSE_LIMITS.COMMENT_VOTES_PER_HOUR, 3_600);
    if (!rate.allowed) return fail(429, rate.reason!, { retryAfterSeconds: rate.retryAfterSeconds });

    const { type } = body.parse(await request.json());

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, isRemoved: true, theme: { select: { status: true } } },
    });
    if (!post || post.isRemoved) return fail(404, '글을 찾을 수 없습니다.');
    if (post.authorId === user.id) return fail(403, '본인 글에는 투표할 수 없습니다.');
    if (!canContribute(post.theme.status)) return fail(403, '정식 갤러리에서만 투표할 수 있습니다.');

    const weight = voteWeightFor({ trustScore: user.trustScore, accountCreatedAt: user.createdAt });
    const key = { postId_userId: { postId, userId: user.id } };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.postVote.findUnique({ where: key, select: { type: true } });
      let action: 'created' | 'changed' | 'removed';
      if (!existing) {
        await tx.postVote.create({ data: { postId, userId: user.id, type, weight } });
        action = 'created';
      } else if (existing.type === type) {
        await tx.postVote.delete({ where: key });
        action = 'removed';
      } else {
        await tx.postVote.update({ where: key, data: { type, weight } });
        action = 'changed';
      }
      const votes = await tx.postVote.findMany({
        where: { postId },
        select: { type: true, weight: true, userId: true, createdAt: true, user: { select: { createdAt: true } } },
      });
      const tally = commentTally(votes.map((v) => ({ ...v, voterCreatedAt: v.user.createdAt })));
      await tx.post.update({
        where: { id: postId },
        data: { upCount: tally.upCount, downCount: tally.downCount, score: tally.bestScore },
      });
      return { action, upCount: tally.upCount, downCount: tally.downCount };
    });

    return ok({ ...result, myVote: result.action === 'removed' ? null : type });
  } catch (error) {
    return handleError(error);
  }
}
