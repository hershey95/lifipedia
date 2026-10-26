/**
 * 문서 보호 수준 (순수 함수, prisma 를 import 하지 않는다).
 * 보호 상태는 저장하지 않고 신호에서 매번 계산한다. 해제도 자동이다.
 * 설계: docs/design/2026-W44-protection-gallery.md 3절
 */
export const PROTECTION_RULES = {
  SEMI_MIN_ACCOUNT_DAYS: 4,
  SEMI_MIN_CONTRIBUTIONS: 5, // = CONTRIBUTOR 임계, = 되돌리기 최소 기여
  EXTENDED_MIN_ACCOUNT_DAYS: 30,
  EXTENDED_MIN_CONTRIBUTIONS: 25, // = EDITOR 임계
  EDIT_WAR_WINDOW_HOURS: 48,
  EDIT_WAR_SEMI_REVERTS: 3,
  EDIT_WAR_EXTENDED_REVERTS: 6,
  OPEN_REPORTERS_SEMI: 3, // 서로 다른 신고자(계정 4일 이상)의 OPEN 신고
} as const;

export type ProtectionLevel = 'NONE' | 'SEMI' | 'EXTENDED';
export type ProtectionReason = 'EDIT_WAR' | 'TOP_RANK' | 'REPORTS';
export type ProtectionSignals = { recentReverts: number; isTopRank: boolean; openReporters: number };

const ORDER: Record<ProtectionLevel, number> = { NONE: 0, SEMI: 1, EXTENDED: 2 };
const DAY_MS = 86_400_000;

/** 가장 높은 단계와, 그 단계에 기여한 모든 사유(고정 순서 EDIT_WAR, TOP_RANK, REPORTS). */
export function requiredProtection(s: ProtectionSignals): { level: ProtectionLevel; reasons: ProtectionReason[] } {
  const R = PROTECTION_RULES;
  const reasons: ProtectionReason[] = [];
  let level: ProtectionLevel = 'NONE';
  const raise = (l: ProtectionLevel) => {
    if (ORDER[l] > ORDER[level]) level = l;
  };
  if (s.recentReverts >= R.EDIT_WAR_SEMI_REVERTS) {
    reasons.push('EDIT_WAR');
    raise(s.recentReverts >= R.EDIT_WAR_EXTENDED_REVERTS ? 'EXTENDED' : 'SEMI');
  }
  if (s.isTopRank) {
    reasons.push('TOP_RANK');
    raise('SEMI');
  }
  if (s.openReporters >= R.OPEN_REPORTERS_SEMI) {
    reasons.push('REPORTS');
    raise('SEMI');
  }
  return { level, reasons };
}

/** 이 사용자가 편집할 수 있는 최고 단계. 입력이 이상하면 NONE. */
export function userLevel(u: { createdAt: Date; contributionCount: number }, now: Date = new Date()): ProtectionLevel {
  const days = (now.getTime() - u.createdAt.getTime()) / DAY_MS;
  const n = u.contributionCount;
  if (!Number.isFinite(days) || days < 0 || !Number.isFinite(n)) return 'NONE';
  const R = PROTECTION_RULES;
  if (days >= R.EXTENDED_MIN_ACCOUNT_DAYS && n >= R.EXTENDED_MIN_CONTRIBUTIONS) return 'EXTENDED';
  if (days >= R.SEMI_MIN_ACCOUNT_DAYS && n >= R.SEMI_MIN_CONTRIBUTIONS) return 'SEMI';
  return 'NONE';
}

export function canEditAt(required: ProtectionLevel, user: ProtectionLevel): boolean {
  return ORDER[user] >= ORDER[required];
}

const LABEL: Record<ProtectionLevel, string> = { NONE: '', SEMI: '반보호', EXTENDED: '확장 보호' };
export const protectionLabel = (l: ProtectionLevel) => LABEL[l];

/** 403 응답·배너에 같은 문구를 쓴다. */
export function protectionMessage(required: ProtectionLevel): string {
  const R = PROTECTION_RULES;
  if (required === 'EXTENDED') {
    return `이 문서는 확장 보호 상태입니다. 계정 ${R.EXTENDED_MIN_ACCOUNT_DAYS}일 이상·기여 ${R.EXTENDED_MIN_CONTRIBUTIONS}건 이상부터 편집할 수 있습니다. 고칠 내용은 토론에 남겨 주세요.`;
  }
  return `이 문서는 반보호 상태입니다. 계정 ${R.SEMI_MIN_ACCOUNT_DAYS}일 이상·기여 ${R.SEMI_MIN_CONTRIBUTIONS}건 이상부터 편집할 수 있습니다. 고칠 내용은 토론에 남겨 주세요.`;
}

export function reasonText(r: ProtectionReason, s: ProtectionSignals): string {
  if (r === 'EDIT_WAR') return `최근 ${PROTECTION_RULES.EDIT_WAR_WINDOW_HOURS}시간 되돌리기 ${s.recentReverts}회`;
  if (r === 'TOP_RANK') return '가격대 1위 문서';
  return `서로 다른 ${s.openReporters}명이 신고`;
}
