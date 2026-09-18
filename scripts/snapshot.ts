/**
 * 수동 스냅샷 생성 스크립트.
 *   npm run rank:snapshot -- --type MONTHLY --key 2026-08
 *   npm run rank:snapshot -- --type YEARLY
 * 인자를 생략하면 직전 기간을 대상으로 한다.
 */
import { generateSnapshots, previousMonthKey, previousYearKey } from '../src/lib/snapshot';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const periodType = (arg('type') ?? 'MONTHLY').toUpperCase() as 'MONTHLY' | 'YEARLY';
  const periodKey = arg('key') ?? (periodType === 'MONTHLY' ? previousMonthKey() : previousYearKey());
  const topN = Number(arg('top') ?? 3);

  console.log(`[snapshot] ${periodType} ${periodKey} (top ${topN})`);
  const report = await generateSnapshots({ periodType, periodKey, topN });
  console.log('[snapshot] done', report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
