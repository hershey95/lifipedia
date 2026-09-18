/**
 * 테마 생애주기 — PROPOSED → ACTIVE → DORMANT.
 *
 * 승격은 운영자 판단이 아니라 수요(팔로워 수)로만 결정된다.
 * 운영자가 하는 일은 임계치 상수를 관리하는 것뿐이다.
 */

export type ThemeStatus = 'PROPOSED' | 'ACTIVE' | 'DORMANT';

export const THEME_LIFECYCLE = {
  /** 정식 승격에 필요한 팔로워 수. 환경변수로 조정 가능. */
  defaultPromotionThreshold: 20,
  /** 이 기간 동안 활동(항목 생성/편집/투표)이 없으면 휴면 후보. */
  dormantAfterDays: 180,
  /** 휴면 테마가 다시 팔로워를 이만큼 모으면 자동 복귀. */
  reactivateFollowerGain: 5,
} as const;

export function promotionThreshold(): number {
  const fromEnv = Number(process.env.THEME_PROMOTION_THRESHOLD);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : THEME_LIFECYCLE.defaultPromotionThreshold;
}

export function shouldPromote(theme: { status: ThemeStatus; followerCount: number }, threshold = promotionThreshold()): boolean {
  return theme.status === 'PROPOSED' && theme.followerCount >= threshold;
}

export function shouldGoDormant(
  theme: { status: ThemeStatus; lastActivityAt: Date },
  now: Date = new Date(),
): boolean {
  if (theme.status !== 'ACTIVE') return false;
  const idleDays = (now.getTime() - theme.lastActivityAt.getTime()) / 86_400_000;
  return idleDays >= THEME_LIFECYCLE.dormantAfterDays;
}

/** 승격까지 남은 인원과 진행률 — 테마 페이지에 그대로 노출된다. */
export function promotionProgress(followerCount: number, threshold = promotionThreshold()) {
  const remaining = Math.max(0, threshold - followerCount);
  return {
    threshold,
    followerCount,
    remaining,
    ratio: Math.min(1, followerCount / threshold),
  };
}

/** ACTIVE 테마에서만 위키 작성/투표가 가능하다. */
export function canContribute(status: ThemeStatus): boolean {
  return status === 'ACTIVE';
}
