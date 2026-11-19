/** 리비전 쿼리(`?rev=`, `?from=&to=`) 검증 — 순수 함수. */

/** 1..max 의 십진 정수 문자열만 받는다. 아니면 null. */
export function parseRev(v: string | string[] | undefined, max: number): number | null {
  if (typeof v !== 'string' || !/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= max ? n : null;
}

/** 두 리비전. 순서가 거꾸면 뒤집고, 같거나 하나라도 잘못되면 null. */
export function parseRevRange(
  from: string | string[] | undefined,
  to: string | string[] | undefined,
  max: number,
): { from: number; to: number } | null {
  const a = parseRev(from, max);
  const b = parseRev(to, max);
  if (a === null || b === null || a === b) return null;
  return a < b ? { from: a, to: b } : { from: b, to: a };
}
