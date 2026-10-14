import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WikiMarkdown } from '@/components/WikiMarkdown';
import { extractToc } from '@/lib/markdown';

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
});
