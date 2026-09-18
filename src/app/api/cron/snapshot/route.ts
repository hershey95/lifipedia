import { z } from 'zod';
import { ok, fail, handleError, authorizeCron } from '@/lib/api';
import { generateSnapshots, previousMonthKey, previousYearKey } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const query = z.object({
  periodType: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  /** 생략하면 직전 기간(막 끝난 달/해)을 대상으로 한다. */
  periodKey: z.string().regex(/^\d{4}(-\d{2})?$/).optional(),
  topN: z.coerce.number().int().min(1).max(10).default(3),
});

/**
 * 월간/연간 Top 스냅샷 생성. Vercel Cron 등에서 호출한다.
 *   매달 1일 00:10 UTC → ?periodType=MONTHLY
 *   매년 1월 1일 00:30 UTC → ?periodType=YEARLY
 */
async function run(request: Request) {
  try {
    if (!authorizeCron(request)) return fail(401, '인증되지 않은 배치 요청입니다.');

    const params = query.parse(Object.fromEntries(new URL(request.url).searchParams));
    const periodKey =
      params.periodKey ?? (params.periodType === 'MONTHLY' ? previousMonthKey() : previousYearKey());

    const report = await generateSnapshots({
      periodType: params.periodType,
      periodKey,
      topN: params.topN,
    });

    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

// Vercel Cron 은 GET 으로 호출한다. 수동 실행 편의를 위해 POST 도 함께 받는다.
export const GET = run;
export const POST = run;
