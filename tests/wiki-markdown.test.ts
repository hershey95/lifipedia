import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WikiMarkdown } from '@/components/WikiMarkdown';
import { extractToc, extractWikiLinks } from '@/lib/markdown';

const html = (s: string) => renderToStaticMarkup(WikiMarkdown({ source: s }));

describe('WikiMarkdown', () => {
  it('제목·표·목록을 렌더하고 목차 id 와 일치한다', () => {
    const md = '## 개요\n\n- a\n- b\n\n## 한계\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n## 한계\n\n끝';
    const out = html(md);
    expect(out).toContain('<h3 id="개요">');
    expect(out).toContain('<table>');
    for (const t of extractToc(md)) expect(out).toContain(`id="${t.id}"`);
  });
  it('raw HTML 은 문자로만 보인다 (XSS)', () => {
    const out = html('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
  });
  it('javascript: 링크는 막고, 외부 링크는 nofollow·새 창', () => {
    expect(html('[x](javascript:alert(1))')).not.toContain('javascript:');
    expect(html('[x](https://example.com)')).toContain('rel="noopener noreferrer nofollow ugc"');
  });
  it('[[위키링크]] 는 내부 검색 링크', () => {
    expect(html('[[랜턴]]')).toContain('href="/search?q=%EB%9E%9C%ED%84%B4"');
  });
  it('해석기가 있으면 문서·동명 문서·없음으로 갈린다', () => {
    const resolve = (t: string) =>
      t === 'A' ? { kind: 'one' as const, href: '/theme/x/item/a' }
      : t === 'B' ? { kind: 'many' as const, href: '/search?q=B&same=1' }
      : { kind: 'none' as const };
    const out = renderToStaticMarkup(WikiMarkdown({ source: '[[A]] [[B]] [[C]]', resolve }));
    expect(out).toContain('href="/theme/x/item/a"');
    expect(out).toContain('href="/search?q=B&amp;same=1"');
    expect(out).toContain('missing=1');
    expect(out).toContain('title="문서 없음"');
    expect(out).toContain('wiki-red');
  });
});

describe('extractWikiLinks', () => {
  it('코드 블록 제외·중복 제거·공백 정리', () => {
    const md = '[[ A ]] [[A]] `[[B]]`\n```\n[[C]]\n```\n[[D]]';
    expect(extractWikiLinks(md)).toEqual(['A', 'D']);
  });
  it('80자 넘는 제목은 링크가 아니다', () => {
    expect(extractWikiLinks(`[[${'가'.repeat(81)}]]`)).toEqual([]);
  });
});
