/**
 * 월간/연간 Top 순위 아카이브 생성.
 *
 * 스냅샷은 그 기간에 들어온 표만으로 계산되므로
 * "2026년 9월의 1위"와 "지금의 1위"가 서로 독립적이다.
 * 한 번 생성된 스냅샷은 덮어쓰지 않는 한 영구 보존된다.
 */
import { prisma } from './db';
import { rankTier } from './scoring-service';
import { TIERS } from './tier';

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function yearKey(d: Date): string {
  return String(d.getUTCFullYear());
}

export function monthRange(key: string): { from: Date; until: Date } {
  const [y, m] = key.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), until: new Date(Date.UTC(y, m, 1)) };
}

export function yearRange(key: string): { from: Date; until: Date } {
  const y = Number(key);
  return { from: new Date(Date.UTC(y, 0, 1)), until: new Date(Date.UTC(y + 1, 0, 1)) };
}

/** 직전 달의 키. 인자 없으면 오늘 기준. */
export function previousMonthKey(now: Date = new Date()): string {
  return monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
}

export function previousYearKey(now: Date = new Date()): string {
  return String(now.getUTCFullYear() - 1);
}

export type SnapshotReport = {
  periodType: 'MONTHLY' | 'YEARLY';
  periodKey: string;
  themesProcessed: number;
  rowsWritten: number;
  provisionalTiers: number;
};

/** 기간 전체에 대해 모든 ACTIVE 테마 x 가격대의 상위 topN 을 기록한다. */
export async function generateSnapshots(params: {
  periodType: 'MONTHLY' | 'YEARLY';
  periodKey: string;
  topN?: number;
}): Promise<SnapshotReport> {
  const topN = params.topN ?? 3;
  const { from, until } =
    params.periodType === 'MONTHLY' ? monthRange(params.periodKey) : yearRange(params.periodKey);

  const themes = await prisma.theme.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });

  let rowsWritten = 0;
  let provisionalTiers = 0;

  for (const theme of themes) {
    for (const tier of TIERS) {
      const ranked = await rankTier({
        themeId: theme.id,
        tier,
        asOf: until,
        votesFrom: from,
        votesUntil: until,
        limit: topN,
      });

      // 표가 아예 없는 가격대는 스냅샷을 만들지 않는다.
      const meaningful = ranked.filter((r) => r.breakdown.effectiveTotal > 0);
      if (meaningful.length === 0) continue;

      if (meaningful[0].breakdown.isProvisional) provisionalTiers += 1;

      for (const entry of meaningful) {
        await prisma.rankingSnapshot.upsert({
          where: {
            themeId_tier_periodType_periodKey_rank: {
              themeId: theme.id,
              tier,
              periodType: params.periodType,
              periodKey: params.periodKey,
              rank: entry.rank,
            },
          },
          create: {
            themeId: theme.id,
            tier,
            periodType: params.periodType,
            periodKey: params.periodKey,
            rank: entry.rank,
            itemId: entry.item.id,
            score: entry.breakdown.score,
            breakdown: entry.breakdown as unknown as object,
            isProvisional: entry.breakdown.isProvisional,
          },
          update: {
            itemId: entry.item.id,
            score: entry.breakdown.score,
            breakdown: entry.breakdown as unknown as object,
            isProvisional: entry.breakdown.isProvisional,
            generatedAt: new Date(),
          },
        });
        rowsWritten += 1;
      }
    }
  }

  return {
    periodType: params.periodType,
    periodKey: params.periodKey,
    themesProcessed: themes.length,
    rowsWritten,
    provisionalTiers,
  };
}
