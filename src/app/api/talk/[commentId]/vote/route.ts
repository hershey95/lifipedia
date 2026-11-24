import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince } from '@/lib/api';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { voteWeightFor } from '@/lib/trust';
import { canContribute } from '@/lib/theme-lifecycle';
import { commentTally, isConcept } from '@/lib/comments';
import { notificationsFor } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const body = z.object({ type: z.enum(['UP', 'DOWN']) });

/** 토론 댓글 추천/비추천. 문서 투표와 같은 규칙. 랭킹(Item.score)·신뢰도에는 영향이 없다. 개념글 등재는 한 번 기록하면 지우지 않는다. */
export async function POST(request: Request, ctx: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const used =
      (await countSince(prisma.commentVote, { userId: user.id }, 3_600)) +
      (await countSince(prisma.postVote, { userId: user.id }, 3_600)) +
      (await countSince(prisma.postCommentVote, { userId: user.id }, 3_600));
    const rate = checkRate(used, ABUSE_LIMITS.COMMENT_VOTES_PER_HOUR, 3_600);
    if (!rate.allowed) return fail(429, rate.reason!, { retryAfterSeconds: rate.retryAfterSeconds });

    const { type } = body.parse(await request.json());

    const comment = await prisma.talkComment.findUnique({
      where: { id: commentId },
      select: {
        id: true, itemId: true, parentId: true, authorId: true, createdAt: true, isRemoved: true, conceptAt: true,
        item: { select: { isRemoved: true, theme: { select: { status: true } } } },
      },
    });
    if (!comment || comment.isRemoved || comment.item.isRemoved) return fail(404, '댓글을 찾을 수 없습니다.');
    if (comment.authorId === user.id) return fail(403, '본인 댓글에는 투표할 수 없습니다.');
    if (!canContribute(comment.item.theme.status)) return fail(403, '정식 갤러리에서만 투표할 수 있습니다.');

    const weight = voteWeightFor({ trustScore: user.trustScore, accountCreatedAt: user.createdAt });
    const key = { commentId_userId: { commentId, userId: user.id } };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.commentVote.findUnique({ where: key, select: { type: true } });
      let action: 'created' | 'changed' | 'removed';
      if (!existing) {
        await tx.commentVote.create({ data: { commentId, userId: user.id, type, weight } });
        action = 'created';
      } else if (existing.type === type) {
        await tx.commentVote.delete({ where: key });
        action = 'removed';
      } else {
        await tx.commentVote.update({ where: key, data: { type, weight } });
        action = 'changed';
      }
      const votes = await tx.commentVote.findMany({
        where: { commentId },
        select: { type: true, weight: true, userId: true, createdAt: true, user: { select: { createdAt: true } } },
      });
      const input = votes.map((v) => ({ ...v, voterCreatedAt: v.user.createdAt }));
      const tally = commentTally(input);
      // 개념글 등재는 조건부 updateMany 로 한 번만 성립한다: 동시에 두 표가 조건을 넘겨도 count === 1 인 쪽만 참.
      let becameConcept = false;
      if (comment.conceptAt === null && isConcept(comment, input)) {
        const claim = await tx.talkComment.updateMany({
          where: { id: commentId, conceptAt: null },
          data: { conceptAt: new Date() },
        });
        becameConcept = claim.count === 1;
        // claim 이 성립한 쪽만 알린다(conceptAt 원자화 덕에 중복 알림이 없다).
        if (becameConcept) {
          const rows = notificationsFor({ kind: 'CONCEPT_REACHED', recipientId: comment.authorId, itemId: comment.itemId, refId: commentId });
          if (rows.length) await tx.notification.createMany({ data: rows });
        }
      }
      await tx.talkComment.update({ where: { id: commentId }, data: tally });
      return { action, ...tally, becameConcept };
    });

    return ok({ ...result, myVote: result.action === 'removed' ? null : type });
  } catch (error) {
    return handleError(error);
  }
}
