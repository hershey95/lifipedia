/** DB 를 읽어 점수를 갱신하는 계층. 순수 계산은 lib/ranking.ts 에 있다. */
import { prisma } from './db';
import { computeScore, rankItems, type ScoredVote, type ScoreBreakdown } from './ranking';

export async function recomputeItemScore(itemId: string, asOf: Date = new Date()): Promise<ScoreBreakdown> {
  const votes = await prisma.vote.findMany({
    where: { itemId },
    select: { type: true, weight: true, createdAt: true, userId: true },
  });

  const breakdown = computeScore(votes as ScoredVote[], asOf);

  await prisma.item.update({
    where: { id: itemId },
    data: {
      score: breakdown.score,
      upCount: breakdown.rawUpCount,
      downCount: breakdown.rawDownCount,
      scoredAt: asOf,
    },
  });

  return breakdown;
}

export type RankedEntry = {
  item: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    priceKrw: number | null;
    description: string;
    createdAt: Date;
  };
  breakdown: ScoreBreakdown;
  rank: number;
};

/**
 * 한 테마 x 가격대의 현재 순위.
 * 기간을 주면 그 기간에 들어온 표만으로 계산한다(스냅샷용).
 */
export async function rankTier(params: {
  themeId: string;
  tier: 'BUDGET' | 'MID' | 'PREMIUM';
  asOf?: Date;
  votesFrom?: Date;
  votesUntil?: Date;
  limit?: number;
}): Promise<RankedEntry[]> {
  const asOf = params.asOf ?? new Date();

  const items = await prisma.item.findMany({
    where: { themeId: params.themeId, tier: params.tier, isRemoved: false },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      priceKrw: true,
      description: true,
      createdAt: true,
      votes: {
        where: {
          createdAt: {
            ...(params.votesFrom ? { gte: params.votesFrom } : {}),
            ...(params.votesUntil ? { lt: params.votesUntil } : {}),
          },
        },
        select: { type: true, weight: true, createdAt: true, userId: true },
      },
    },
  });

  const scored = items.map((item) => ({
    itemId: item.id,
    createdAt: item.createdAt,
    breakdown: computeScore(item.votes as ScoredVote[], asOf),
  }));

  const byId = new Map(items.map((i) => [i.id, i]));

  return rankItems(scored)
    .slice(0, params.limit ?? 50)
    .map((entry, index) => {
      const item = byId.get(entry.itemId)!;
      const { votes: _votes, ...rest } = item;
      return { item: rest, breakdown: entry.breakdown, rank: index + 1 };
    });
}
