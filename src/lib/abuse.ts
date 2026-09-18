/**
 * 어뷰징 탐지 — '규칙 위반' 판정만 한다. 콘텐츠의 옳고 그름은 판단하지 않는다.
 */

export const ABUSE_LIMITS = {
  /** 시간당 투표 상한 */
  VOTES_PER_HOUR: 40,
  /** 시간당 위키 편집 상한 */
  EDITS_PER_HOUR: 20,
  /** 시간당 테마 제안 상한 */
  THEME_PROPOSALS_PER_DAY: 3,
  /**
   * 한 유저가 짧은 시간에 같은 테마의 항목들에 몰아서 투표하면
   * 조작 가능성으로 표시한다(차단이 아니라 검토 큐 적재용).
   */
  BURST_WINDOW_MINUTES: 5,
  BURST_VOTE_THRESHOLD: 10,
} as const;

export type RateCheck = { allowed: boolean; reason?: string; retryAfterSeconds?: number };

export function checkRate(recentCount: number, limit: number, windowSeconds: number): RateCheck {
  if (recentCount < limit) return { allowed: true };
  return {
    allowed: false,
    reason: `요청이 너무 잦습니다. ${Math.ceil(windowSeconds / 60)}분 내 최대 ${limit}회까지 가능합니다.`,
    retryAfterSeconds: windowSeconds,
  };
}

/** 짧은 시간 창에 몰린 투표인지 — 조작 의심 플래그 */
export function looksLikeVoteBurst(voteTimestamps: Date[], now: Date = new Date()): boolean {
  const windowStart = now.getTime() - ABUSE_LIMITS.BURST_WINDOW_MINUTES * 60_000;
  const inWindow = voteTimestamps.filter((t) => t.getTime() >= windowStart).length;
  return inWindow >= ABUSE_LIMITS.BURST_VOTE_THRESHOLD;
}
