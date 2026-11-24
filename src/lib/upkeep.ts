/**
 * 기여할 거리(W49 W3). 모두 규칙으로 계산하며 점수·인기에는 영향을 주지 않는다(ADR 0001 취지).
 * 기준 상수는 `/contribute` 화면에 그대로 공개한다.
 */
import { extractWikiLinks } from '@/lib/markdown';

/** 본문(description) 최소 글자 수. 이보다 짧으면 토막 문서. */
export const STUB_MIN_BODY = 300;

export type StubReason = '본문 짧음' | '출처 절 없음' | '가격 없음' | '이미지 없음';

const SOURCE_SECTION = /^#{2,3}\s*출처\s*$/m;

export function stubReasons(item: {
  description: string;
  priceKrw: number | null;
  imageUrl: string | null;
}): StubReason[] {
  const out: StubReason[] = [];
  if (item.description.length < STUB_MIN_BODY) out.push('본문 짧음');
  if (!SOURCE_SECTION.test(item.description)) out.push('출처 절 없음');
  if (item.priceKrw == null) out.push('가격 없음');
  if (!item.imageUrl) out.push('이미지 없음');
  return out;
}

/**
 * 문서들의 `[[제목]]` 중 존재하지 않는 제목을 "그 제목을 건 문서 수" 순으로 센다.
 * docs 는 문서마다 위키링크가 들어 있는 본문들을 이어 붙인 문자열.
 */
export function countWanted(docs: string[], existingNames: Iterable<string>, limit = 20) {
  const existing = new Set(existingNames);
  const counts = new Map<string, number>();
  for (const d of docs) {
    for (const title of extractWikiLinks(d)) {
      if (!existing.has(title)) counts.set(title, (counts.get(title) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count || (a.title < b.title ? -1 : 1))
    .slice(0, limit);
}
