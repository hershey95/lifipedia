/** 기여 적립 규칙 — 순수 함수. 원장에 미적립 사유까지 남겨 결과를 재현할 수 있게 한다. */
export const CONTRIBUTION_RULES = {
  /** 이보다 적게 바뀐 편집은 미적립 (가격·티어·구매링크·이름 변경은 예외) */
  MIN_EDIT_DELTA_CHARS: 20,
  /** 같은 문서에 사용자 한 명이 하루에 적립받을 수 있는 편집 수 */
  MAX_CREDITED_EDITS_PER_ITEM_PER_DAY: 2,
} as const;

/** 크기와 무관하게 의미 있는 변경으로 치는 필드 */
const SUBSTANTIVE = new Set(['tier', 'priceKrw', 'purchaseLinks', 'name']);

export type CreditReason = 'REVERT' | 'TOO_SMALL' | 'DAILY_ITEM_CAP';
export type CreditDecision = { credited: true; reason: null } | { credited: false; reason: CreditReason };

export function judgeEdit(input: {
  revertOfRevision: number | null;
  changedFields: string[];
  deltaChars: number;
  creditedTodayOnItem: number;
}): CreditDecision {
  if (input.revertOfRevision != null) return { credited: false, reason: 'REVERT' };
  const substantive = input.changedFields.some((f) => SUBSTANTIVE.has(f));
  if (!substantive && input.deltaChars < CONTRIBUTION_RULES.MIN_EDIT_DELTA_CHARS) return { credited: false, reason: 'TOO_SMALL' };
  if (input.creditedTodayOnItem >= CONTRIBUTION_RULES.MAX_CREDITED_EDITS_PER_ITEM_PER_DAY) return { credited: false, reason: 'DAILY_ITEM_CAP' };
  return { credited: true, reason: null };
}

/** 수동 되돌리기 감지를 위해 거슬러 올라가 비교하는 리비전 수 */
export const REVERT_LOOKBACK_REVISIONS = 10;
