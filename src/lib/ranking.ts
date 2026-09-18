/**
 * Lifipedia 랭킹 산정식 — 전 과정이 공개된다.
 *
 * 설계 원칙 (운영자 큐레이션 금지):
 *   운영자는 어떤 항목에도 가점을 줄 수 없다. 아래 함수의 입력은 전부
 *   유저 활동에서 파생된 값뿐이며, 조정 가능한 상수는 이 파일에 전부 노출되어 있다.
 *
 * 산정 4단계:
 *   1) 시간 감쇠  — 오래된 표는 지수적으로 약해진다. 신제품/최신 트렌드가 반영되도록.
 *   2) 신뢰도 가중 — 투표 시점에 고정된 투표자 가중치를 곱한다.
 *   3) 품질 추정  — 유효 찬성 비율의 Wilson 하한. 표본이 적으면 보수적으로 깎인다.
 *   4) 참여 보정  — 유효 표수에 로그를 취해 곱한다. 소수 정예의 만장일치가
 *                   대규모 지지를 이기지 못하게 한다.
 *
 * 최종 점수 = wilsonLowerBound(찬성비율, 유효표수) * log10(1 + 유효표수) * 100
 */

export const RANKING_CONSTANTS = {
  /** 표의 영향력이 절반이 되는 기간(일). 45일 ≈ 한 달 반. */
  VOTE_HALF_LIFE_DAYS: 45,
  /** Wilson 하한의 신뢰수준 z값. 1.96 = 95%. */
  WILSON_Z: 1.96,
  /** 이 인원 미만이 참여한 가격대는 Top1을 "미정"으로 둔다. */
  MIN_DISTINCT_VOTERS: 5,
  /** 한 표가 가질 수 있는 최대 가중치. 고신뢰 유저의 과대대표 방지. */
  MAX_VOTE_WEIGHT: 3.0,
  /** 계정 생성 후 이 기간 동안은 가중치를 축소한다(어뷰징 방지). */
  NEW_ACCOUNT_DAYS: 7,
  /** 신규 계정 가중치 배수. */
  NEW_ACCOUNT_MULTIPLIER: 0.25,
} as const;

export type ScoredVote = {
  type: 'UP' | 'DOWN';
  /** 투표 시점에 고정된 가중치 */
  weight: number;
  createdAt: Date;
  userId: string;
};

export type ScoreBreakdown = {
  score: number;
  effectiveUp: number;
  effectiveDown: number;
  effectiveTotal: number;
  distinctVoters: number;
  upRatio: number;
  wilsonLowerBound: number;
  participationFactor: number;
  /** 최소 참여 인원 미달 — Top1 으로 확정할 수 없다 */
  isProvisional: boolean;
  rawUpCount: number;
  rawDownCount: number;
};

/** 표 나이에 따른 감쇠 계수. 0일이면 1.0, 반감기마다 절반. */
export function timeDecay(voteDate: Date, asOf: Date, halfLifeDays = RANKING_CONSTANTS.VOTE_HALF_LIFE_DAYS): number {
  const ageMs = asOf.getTime() - voteDate.getTime();
  if (ageMs <= 0) return 1;
  const ageDays = ageMs / 86_400_000;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * 찬성 비율의 Wilson 점수 하한.
 * 표본이 작을수록 0에 가깝게 끌어내려, 표 3개짜리 만장일치가
 * 표 300개짜리 90% 지지를 이기는 일을 막는다.
 */
export function wilsonLowerBound(positive: number, total: number, z = RANKING_CONSTANTS.WILSON_Z): number {
  if (total <= 0) return 0;
  const p = positive / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return Math.max(0, (centre - margin) / denominator);
}

/** 투표 목록으로부터 아이템 점수와 그 산정 근거를 계산한다. */
export function computeScore(votes: ScoredVote[], asOf: Date = new Date()): ScoreBreakdown {
  let effectiveUp = 0;
  let effectiveDown = 0;
  let rawUpCount = 0;
  let rawDownCount = 0;
  const voters = new Set<string>();

  for (const vote of votes) {
    voters.add(vote.userId);
    const effective = Math.min(vote.weight, RANKING_CONSTANTS.MAX_VOTE_WEIGHT) * timeDecay(vote.createdAt, asOf);
    if (vote.type === 'UP') {
      effectiveUp += effective;
      rawUpCount += 1;
    } else {
      effectiveDown += effective;
      rawDownCount += 1;
    }
  }

  const effectiveTotal = effectiveUp + effectiveDown;
  const upRatio = effectiveTotal > 0 ? effectiveUp / effectiveTotal : 0;
  const lower = wilsonLowerBound(effectiveUp, effectiveTotal);
  const participationFactor = Math.log10(1 + effectiveTotal);
  const score = lower * participationFactor * 100;

  return {
    score: Number(score.toFixed(4)),
    effectiveUp: Number(effectiveUp.toFixed(4)),
    effectiveDown: Number(effectiveDown.toFixed(4)),
    effectiveTotal: Number(effectiveTotal.toFixed(4)),
    distinctVoters: voters.size,
    upRatio: Number(upRatio.toFixed(4)),
    wilsonLowerBound: Number(lower.toFixed(4)),
    participationFactor: Number(participationFactor.toFixed(4)),
    isProvisional: voters.size < RANKING_CONSTANTS.MIN_DISTINCT_VOTERS,
    rawUpCount,
    rawDownCount,
  };
}

export type RankableItem = {
  itemId: string;
  breakdown: ScoreBreakdown;
  createdAt: Date;
};

/**
 * 동점 처리: 점수 → 참여 인원 수 → 먼저 등록된 항목 순.
 * 완전 동률이면 itemId 로 결정론적으로 정렬한다(스냅샷 재현성).
 */
export function rankItems(items: RankableItem[]): RankableItem[] {
  return [...items].sort((a, b) => {
    if (b.breakdown.score !== a.breakdown.score) return b.breakdown.score - a.breakdown.score;
    if (b.breakdown.distinctVoters !== a.breakdown.distinctVoters) {
      return b.breakdown.distinctVoters - a.breakdown.distinctVoters;
    }
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return a.itemId.localeCompare(b.itemId);
  });
}

/**
 * "이번 달 급상승" 용 지표.
 * 최근 기간의 유효 찬성에서 직전 동일 기간의 유효 찬성을 뺀 증가폭.
 */
export function computeMomentum(votes: ScoredVote[], asOf: Date = new Date(), windowDays = 30): number {
  const windowMs = windowDays * 86_400_000;
  const currentStart = asOf.getTime() - windowMs;
  const previousStart = currentStart - windowMs;

  let current = 0;
  let previous = 0;
  for (const vote of votes) {
    const t = vote.createdAt.getTime();
    const signed = (vote.type === 'UP' ? 1 : -1) * Math.min(vote.weight, RANKING_CONSTANTS.MAX_VOTE_WEIGHT);
    if (t >= currentStart) current += signed;
    else if (t >= previousStart) previous += signed;
  }
  return Number((current - previous).toFixed(4));
}
