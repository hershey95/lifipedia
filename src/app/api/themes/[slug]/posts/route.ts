import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince } from '@/lib/api';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { postBody } from '@/lib/board';
import { RANKING_CONSTANTS } from '@/lib/ranking';
import { canContribute } from '@/lib/theme-lifecycle';

export const dynamic = 'force-dynamic';

/** 게시판 글 작성 (상황 갤러리·분류 갤러리 공통). 랭킹·신뢰도에는 영향이 없다. */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    // 가입 7일 미만 계정은 하루 한도가 더 낮다
    const isNew = Date.now() - user.createdAt.getTime() < RANKING_CONSTANTS.NEW_ACCOUNT_DAYS * 86_400_000;
    const limit = isNew ? ABUSE_LIMITS.NEW_ACCOUNT_POSTS_PER_DAY : ABUSE_LIMITS.POSTS_PER_DAY;
    const rate = checkRate(await countSince(prisma.post, { authorId: user.id }, 86_400), limit, 86_400);
    if (!rate.allowed) return fail(429, rate.reason!, { retryAfterSeconds: rate.retryAfterSeconds });

    const payload = postBody.parse(await request.json());

    const theme = await prisma.theme.findUnique({ where: { slug }, select: { id: true, status: true } });
    if (!theme) return fail(404, '갤러리를 찾을 수 없습니다.');
    if (!canContribute(theme.status)) return fail(403, '정식 갤러리에서만 글을 쓸 수 있습니다.');

    const post = await prisma.post.create({
      data: { themeId: theme.id, authorId: user.id, ...payload },
      select: { id: true },
    });
    return ok({ post }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
