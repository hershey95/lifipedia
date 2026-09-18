import { prisma } from '@/lib/db';
import { ok, fail, handleError, authorizeCron } from '@/lib/api';
import { THEME_LIFECYCLE, promotionThreshold } from '@/lib/theme-lifecycle';

export const dynamic = 'force-dynamic';

/**
 * 테마 생애주기 정리 배치.
 *  - 임계치를 넘겼는데 아직 PROPOSED 인 테마를 승격한다(팔로우 시 승격이 누락된 경우 대비).
 *  - 장기간 활동 없는 ACTIVE 테마를 휴면 처리한다.
 * 어느 쪽도 콘텐츠 판단이 아니라 활동량만 본다.
 */
async function run(request: Request) {
  try {
    if (!authorizeCron(request)) return fail(401, '인증되지 않은 배치 요청입니다.');

    const threshold = promotionThreshold();
    const dormantCutoff = new Date(Date.now() - THEME_LIFECYCLE.dormantAfterDays * 86_400_000);

    const promoted = await prisma.theme.updateMany({
      where: { status: 'PROPOSED', followerCount: { gte: threshold } },
      data: { status: 'ACTIVE', promotedAt: new Date() },
    });

    const slept = await prisma.theme.updateMany({
      where: { status: 'ACTIVE', lastActivityAt: { lt: dormantCutoff } },
      data: { status: 'DORMANT' },
    });

    return ok({ promoted: promoted.count, madeDormant: slept.count, threshold });
  } catch (error) {
    return handleError(error);
  }
}

// Vercel Cron 은 GET 으로 호출한다. 수동 실행 편의를 위해 POST 도 함께 받는다.
export const GET = run;
export const POST = run;
