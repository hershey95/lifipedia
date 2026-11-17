import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { ANSWER_RULES, isAnswer } from '@/lib/board';

export const dynamic = 'force-dynamic';

/**
 * 도움됨 표시 토글. 추천 요청 글 작성자만, 남의 답변에만, 글당 3개까지.
 * 기여 원장·신뢰도에는 적립하지 않는다(helpfulAt 기록만. 설계 W48 8.3·11절 결정 3).
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: {
        id: true, postId: true, parentId: true, authorId: true, isRemoved: true, helpfulAt: true,
        post: { select: { authorId: true, kind: true, isRemoved: true } },
      },
    });
    if (!comment || comment.isRemoved || comment.post.isRemoved) return fail(404, '댓글을 찾을 수 없습니다.');
    if (comment.post.authorId !== user.id) return fail(403, '글 작성자만 도움됨을 표시할 수 있습니다.');
    if (!isAnswer(comment.post, comment)) return fail(400, '추천 요청 글의 답변에만 표시할 수 있습니다.');
    if (comment.authorId === user.id) return fail(403, '본인 답변에는 표시할 수 없습니다.');

    const helpful = comment.helpfulAt === null;
    if (helpful) {
      const used = await prisma.postComment.count({ where: { postId: comment.postId, helpfulAt: { not: null } } });
      if (used >= ANSWER_RULES.MAX_HELPFUL_PER_POST) {
        return fail(409, `도움됨은 글당 ${ANSWER_RULES.MAX_HELPFUL_PER_POST}개까지 줄 수 있습니다.`);
      }
    }
    await prisma.postComment.update({ where: { id: commentId }, data: { helpfulAt: helpful ? new Date() : null } });
    return ok({ helpful });
  } catch (error) {
    return handleError(error);
  }
}
