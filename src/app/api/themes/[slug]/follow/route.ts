import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { shouldPromote, promotionProgress, promotionThreshold } from '@/lib/theme-lifecycle';

export const dynamic = 'force-dynamic';

/**
 * 팔로우/언팔로우. 팔로워가 임계치에 도달하는 순간 테마는 자동으로 정식 승격된다.
 * 운영자 승인 단계는 없다.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const theme = await prisma.theme.findUnique({ where: { slug }, select: { id: true, status: true } });
    if (!theme) return fail(404, '테마를 찾을 수 없습니다.');

    const existing = await prisma.themeFollow.findUnique({
      where: { themeId_userId: { themeId: theme.id, userId: user.id } },
    });

    const following = !existing;

    const updated = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.themeFollow.delete({ where: { themeId_userId: { themeId: theme.id, userId: user.id } } });
      } else {
        await tx.themeFollow.create({ data: { themeId: theme.id, userId: user.id } });
      }

      // 카운터를 실제 행 수로 다시 세어 드리프트를 막는다.
      const followerCount = await tx.themeFollow.count({ where: { themeId: theme.id } });

      const promote = shouldPromote({ status: theme.status, followerCount });

      return tx.theme.update({
        where: { id: theme.id },
        data: {
          followerCount,
          lastActivityAt: new Date(),
          ...(promote ? { status: 'ACTIVE' as const, promotedAt: new Date() } : {}),
        },
        select: { slug: true, status: true, followerCount: true, promotedAt: true },
      });
    });

    return ok({
      following,
      theme: updated,
      promotion: promotionProgress(updated.followerCount, promotionThreshold()),
      justPromoted: updated.status === 'ACTIVE' && theme.status === 'PROPOSED',
    });
  } catch (error) {
    return handleError(error);
  }
}
