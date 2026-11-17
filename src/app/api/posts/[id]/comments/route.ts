import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince } from '@/lib/api';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { BOARD_RULES } from '@/lib/board';

export const dynamic = 'force-dynamic';

const body = z.object({
  bodyText: z.string().trim().min(1).max(BOARD_RULES.COMMENT_MAX),
  parentId: z.string().cuid().optional(),
});

/** 게시판 글의 댓글·답글. 기존 토론 댓글과 같은 한도(시간당 20)를 postComment 테이블로 따로 센다. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const recent = await countSince(prisma.postComment, { authorId: user.id }, 3_600);
    const rate = checkRate(recent, ABUSE_LIMITS.COMMENTS_PER_HOUR, 3_600);
    if (!rate.allowed) return fail(429, rate.reason!, { retryAfterSeconds: rate.retryAfterSeconds });

    const payload = body.parse(await request.json());

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, isRemoved: true } });
    if (!post || post.isRemoved) return fail(404, '글을 찾을 수 없습니다.');

    if (payload.parentId) {
      const parent = await prisma.postComment.findUnique({ where: { id: payload.parentId }, select: { postId: true } });
      if (!parent || parent.postId !== postId) return fail(400, '답글 대상을 찾을 수 없습니다.');
    }

    const comment = await prisma.postComment.create({
      data: { postId, authorId: user.id, parentId: payload.parentId, body: payload.bodyText },
      select: { id: true, body: true, createdAt: true, parentId: true },
    });
    return ok({ comment }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
