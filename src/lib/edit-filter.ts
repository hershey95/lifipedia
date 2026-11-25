/**
 * 편집 필터와 계산형 변경 태그(W49 W4). 모두 리비전에서 계산하며 저장하지 않는다.
 * block 만 서버 방어이고, confirm 은 마찰, hint 는 안내다.
 */

/** 가격이 이 비율을 넘게 바뀌면 한 번 더 확인한다. */
export const PRICE_SWING_RATIO = 0.5;
/** 본문이 이 비율을 넘게 줄면 대량 삭제로 본다. 원래 본문이 MIN 미만이면 건너뛴다. */
export const MASS_DELETE_RATIO = 0.5;
export const MASS_DELETE_MIN_BODY = 100;

/**
 * 차단 도메인(서브도메인 포함): 목적지를 가리는 단축 URL. 판매처·제휴 도메인은 넣지 않는다.
 * 잠정 목록이며 갱신은 코드 수정과 커밋으로만 한다.
 */
export const BLOCKED_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly', 'rebrand.ly',
  'me2.do', 'url.kr', 'han.gl', 'vo.la',
];

export function isBlockedUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/\.+$/, '');
  } catch {
    return false;
  }
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

type Snap = Partial<Record<'priceKrw' | 'description' | 'purchaseLinks', unknown>>;

const text = (v: unknown) => (typeof v === 'string' ? v : '');
const linkUrls = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((l: { url?: unknown } | null) => text(l?.url)).filter(Boolean) : [];
const sourceUrls = (v: unknown): string[] => text(v).match(/https?:\/\/[^\s)\]>"']+/g) ?? [];

function priceSwing(before: Snap, after: Snap): boolean {
  const from = before.priceKrw;
  if (typeof from !== 'number' || from === 0) return false;
  const to = after.priceKrw;
  return typeof to !== 'number' || Math.abs(to - from) > from * PRICE_SWING_RATIO;
}

function massDelete(before: Snap, after: Snap): boolean {
  const from = text(before.description).length;
  return from >= MASS_DELETE_MIN_BODY && from - text(after.description).length > from * MASS_DELETE_RATIO;
}

export function checkEdit(before: Snap, after: Snap): { block: string[]; confirm: string[]; hint: string[] } {
  const old = new Set(linkUrls(before.purchaseLinks));
  const block = linkUrls(after.purchaseLinks)
    .filter((u) => !old.has(u) && isBlockedUrl(u))
    .map((u) => `단축 URL 은 구매 링크로 쓸 수 없습니다: ${new URL(u).hostname}`);

  const confirm: string[] = [];
  if (priceSwing(before, after)) confirm.push(`가격이 ${PRICE_SWING_RATIO * 100}% 넘게 바뀌거나 지워집니다.`);
  if (massDelete(before, after)) confirm.push(`본문이 ${MASS_DELETE_RATIO * 100}% 넘게 줄어듭니다.`);

  const hint: string[] = [];
  const known = new Set(sourceUrls(before.description));
  if ((before.priceKrw ?? null) !== (after.priceKrw ?? null) && sourceUrls(after.description).every((u) => known.has(u))) {
    hint.push('가격을 바꿨습니다. 본문에 출처 URL 을 붙여 주세요.');
  }
  return { block, confirm, hint };
}

export type ChangeTag = '새 문서' | '되돌리기' | '가격 변경' | '대량 삭제';

/** prev 가 null 이면 첫 리비전이다. */
export function changeTags(prev: Snap | null, snapshot: Snap, revertOfRevision: number | null): ChangeTag[] {
  if (!prev) return ['새 문서'];
  const tags: ChangeTag[] = [];
  if (revertOfRevision != null) tags.push('되돌리기');
  if ((prev.priceKrw ?? null) !== (snapshot.priceKrw ?? null)) tags.push('가격 변경');
  if (massDelete(prev, snapshot)) tags.push('대량 삭제');
  return tags;
}
