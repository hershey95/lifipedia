/**
 * 유저 신뢰도 — 기여 이력에서 파생된다. 운영자가 임의로 올려줄 수 없다.
 *
 * 신뢰도는 투표 가중치로 쓰이며, 투표 시점에 Vote.weight 로 고정된다.
 * 따라서 나중에 신뢰도가 변해도 과거 랭킹 스냅샷은 그대로 재현된다.
 */

import { RANKING_CONSTANTS } from './ranking';

export type BadgeLevel = 'NEWCOMER' | 'CONTRIBUTOR' | 'EDITOR' | 'CURATOR' | 'STEWARD';

export const BADGE_THRESHOLDS: { level: BadgeLevel; minContributions: number }[] = [
  { level: 'STEWARD', minContributions: 250 },
  { level: 'CURATOR', minContributions: 80 },
  { level: 'EDITOR', minContributions: 25 },
  { level: 'CONTRIBUTOR', minContributions: 5 },
  { level: 'NEWCOMER', minContributions: 0 },
];

export function badgeFor(contributionCount: number): BadgeLevel {
  return BADGE_THRESHOLDS.find((b) => contributionCount >= b.minContributions)!.level;
}

/**
 * 기여 수 → 신뢰 점수. 로그 스케일이라 다작만으로 무한히 오르지 않는다.
 * 기여 0건 = 1.0 (최소치), 상한은 MAX_VOTE_WEIGHT.
 */
export function trustFromContributions(contributionCount: number): number {
  const raw = 1 + Math.log10(1 + Math.max(0, contributionCount));
  return Number(Math.min(raw, RANKING_CONSTANTS.MAX_VOTE_WEIGHT).toFixed(4));
}

/**
 * 실제 한 표에 실릴 가중치.
 * 신규 계정은 대폭 축소해 대량 생성 계정의 조작을 무력화한다.
 */
export function voteWeightFor(params: {
  trustScore: number;
  accountCreatedAt: Date;
  now?: Date;
}): number {
  const now = params.now ?? new Date();
  const ageDays = (now.getTime() - params.accountCreatedAt.getTime()) / 86_400_000;
  const base = Math.min(Math.max(params.trustScore, 0), RANKING_CONSTANTS.MAX_VOTE_WEIGHT);
  const multiplier =
    ageDays < RANKING_CONSTANTS.NEW_ACCOUNT_DAYS ? RANKING_CONSTANTS.NEW_ACCOUNT_MULTIPLIER : 1;
  return Number((base * multiplier).toFixed(4));
}
