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

/** 게시판 댓글 추천/비추천. 글 투표와 같은 규칙. 랭킹·신뢰도에는 영향이 없다. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const used =
      (await countSince(prisma.postVote, { userId: user.id }, 3_600)) +
      (await countSince(prisma.postCommentVote, { userId: user.id }, 3_600));
    const rate = checkRate(used, ABUSE_LIMITS.COMMENT_VOTES_PER_HOUR, 3_600);
    if (!rate.allowed) return fail(429, rate.reason!, { retryAfterSeconds: rate.retryAfterSeconds });

    const { type } = body.parse(await request.json());

    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, isRemoved: true, post: { select: { isRemoved: true, theme: { select: { status: true } } } } },
    });
    if (!comment || comment.isRemoved || comment.post.isRemoved) return fail(404, '댓글을 찾을 수 없습니다.');
    if (comment.authorId === user.id) return fail(403, '본인 댓글에는 투표할 수 없습니다.');
    if (!canContribute(comment.post.theme.status)) return fail(403, '정식 갤러리에서만 투표할 수 있습니다.');

    const weight = voteWeightFor({ trustScore: user.trustScore, accountCreatedAt: user.createdAt });
    const key = { commentId_userId: { commentId, userId: user.id } };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.postCommentVote.findUnique({ where: key, select: { type: true } });
      let action: 'created' | 'changed' | 'removed';
      if (!existing) {
        await tx.postCommentVote.create({ data: { commentId, userId: user.id, type, weight } });
        action = 'created';
      } else if (existing.type === type) {
        await tx.postCommentVote.delete({ where: key });
        action = 'removed';
      } else {
        await tx.postCommentVote.update({ where: key, data: { type, weight } });
        action = 'changed';
      }
      const votes = await tx.postCommentVote.findMany({
        where: { commentId },
        select: { type: true, weight: true, userId: true, createdAt: true, user: { select: { createdAt: true } } },
      });
      const tally = commentTally(votes.map((v) => ({ ...v, voterCreatedAt: v.user.createdAt })));
      await tx.postComment.update({ where: { id: commentId }, data: tally });
      return { action, upCount: tally.upCount, downCount: tally.downCount };
    });

    return ok({ ...result, myVote: result.action === 'removed' ? null : type });
  } catch (error) {
    return handleError(error);
  }
}
