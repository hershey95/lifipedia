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
    const text = m[2].replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').trim();
    out.push({ id: headingId(text, seen), text, depth: m[1].length as 2 | 3 });
  }
  return out;
}

/** `[[제목]]` 해석 결과. one: 문서 하나, many: 동명 문서 목록, none: 문서 없음(빨간 링크). */
export type WikiResolution = { kind: 'one'; href: string } | { kind: 'many'; href: string } | { kind: 'none' };
export type WikiResolver = (title: string) => WikiResolution;

const WIKI_LINK = /\[\[([^\[\]\n]{1,80})\]\]/g;
const CODE_SPLIT = /(```[\s\S]*?```|`[^`\n]*`)/g;

/** 코드 블록(``` 및 `인라인`) 바깥의 `[[제목]]` 제목들. 공백을 자르고 중복을 없앤다. */
export function extractWikiLinks(md: string): string[] {
  const out = new Set<string>();
  md.split(CODE_SPLIT).forEach((part, i) => {
    if (i % 2 === 1) return;
    for (const m of part.matchAll(WIKI_LINK)) {
      const t = m[1].trim();
      if (t) out.add(t);
    }
  });
  return [...out];
}

/**
 * `[[제목]]` → 마크다운 링크. 코드 블록은 건드리지 않는다.
 * resolve 가 없으면 검색 링크(하위 호환). 있으면 문서/동명 문서/없음(`missing=1`)으로 간다.
 */
export function wikiLinksToMarkdown(md: string, resolve?: WikiResolver): string {
  return md
    .split(CODE_SPLIT)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(WIKI_LINK, (_, raw: string) => {
            const t = raw.trim();
            const q = encodeURIComponent(t);
            if (!resolve) return `[${t}](/search?q=${q})`;
            const r = resolve(t);
            if (r.kind === 'none') return `[${t}](/search?q=${q}&missing=1 "문서 없음")`;
            return `[${t}](${r.href})`;
          }),
    )
    .join('');
}
