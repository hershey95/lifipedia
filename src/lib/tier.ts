export const TIERS = ['BUDGET', 'MID', 'PREMIUM'] as const;
export type Tier = (typeof TIERS)[number];

/** URL 세그먼트 ↔ enum */
export const TIER_SLUGS: Record<Tier, string> = {
  BUDGET: 'budget',
  MID: 'mid',
  PREMIUM: 'premium',
};

export const TIER_LABELS: Record<Tier, string> = {
  BUDGET: '저가',
  MID: '중가',
  PREMIUM: '고가',
};

export function tierFromSlug(slug: string): Tier | null {
  const entry = (Object.entries(TIER_SLUGS) as [Tier, string][]).find(([, s]) => s === slug);
  return entry ? entry[0] : null;
}

/**
 * 유저가 입력한 가격이 선택한 가격대와 크게 어긋나는지 검증한다.
 * 테마마다 절대 금액 기준이 다르므로(캠핑 vs 0세 인생템), 같은 테마 안의
 * 기존 항목 가격 분포를 기준으로 상대 판정한다. 기준 삼을 표본이 적으면 통과시킨다.
 */
export function validateTierAgainstPeers(
  priceKrw: number,
  tier: Tier,
  peerPrices: number[],
): { ok: true } | { ok: false; suggestion: Tier; message: string } {
  const prices = peerPrices.filter((p) => p > 0).sort((a, b) => a - b);
  if (prices.length < 6) return { ok: true };

  const at = (q: number) => prices[Math.min(prices.length - 1, Math.floor(prices.length * q))];
  const lowCut = at(1 / 3);
  const highCut = at(2 / 3);

  const suggestion: Tier = priceKrw <= lowCut ? 'BUDGET' : priceKrw >= highCut ? 'PREMIUM' : 'MID';
  if (suggestion === tier) return { ok: true };

  return {
    ok: false,
    suggestion,
    message: `이 테마의 가격 분포상 ${priceKrw.toLocaleString('ko-KR')}원은 '${TIER_LABELS[suggestion]}'에 가깝습니다. 그래도 '${TIER_LABELS[tier]}'로 등록하려면 확인이 필요합니다.`,
  };
}
