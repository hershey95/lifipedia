/** 문서 마크다운 보조 함수 — 목차 추출, 위키링크 변환. 렌더는 WikiMarkdown 컴포넌트가 한다. */

export type TocEntry = { id: string; text: string; depth: 2 | 3 };

/** 한글을 보존하는 제목 id. 같은 제목이 반복되면 -2, -3 을 붙인다. */
export function headingId(text: string, seen: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section';
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

/** 코드 펜스(```) 바깥의 `##`/`###` 제목만 목차로 뽑는다. 렌더러와 같은 id 규칙을 쓴다. */
export function extractToc(md: string): TocEntry[] {
  const seen = new Map<string, number>();
  const out: TocEntry[] = [];
  let fenced = false;
  for (const line of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].trim();
    out.push({ id: headingId(text, seen), text, depth: m[1].length as 2 | 3 });
  }
  return out;
}

/** `[[제품명]]` → 검색 링크. 코드 블록(``` 및 `인라인`)은 건드리지 않는다. */
export function wikiLinksToMarkdown(md: string): string {
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/\[\[([^\[\]\n]{1,80})\]\]/g, (_, t: string) => `[${t.trim()}](/search?q=${encodeURIComponent(t.trim())})`),
    )
    .join('');
}
