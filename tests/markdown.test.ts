import { describe, expect, it } from 'vitest';
import { extractToc, headingId, wikiLinksToMarkdown } from '@/lib/markdown';

describe('extractToc', () => {
  it('##/### 만 뽑고 한글 id 를 보존한다', () => {
    expect(extractToc('# 제목\n## 개요\n본문\n### 세부 스펙\n#### 무시')).toEqual([
      { id: '개요', text: '개요', depth: 2 },
      { id: '세부-스펙', text: '세부 스펙', depth: 3 },
    ]);
  });
  it('중복 제목은 -2 를 붙인다', () => {
    expect(extractToc('## 한계\n## 한계').map((t) => t.id)).toEqual(['한계', '한계-2']);
  });
  it('코드 펜스 안의 # 는 제목이 아니다', () => {
    expect(extractToc('```\n## 가짜\n```\n## 진짜')).toHaveLength(1);
  });
  it('렌더러와 같은 규칙: headingId 를 같은 순서로 부르면 목차 id 와 일치', () => {
    const seen = new Map<string, number>();
    expect(['한계', '한계'].map((t) => headingId(t, seen))).toEqual(['한계', '한계-2']);
  });
});

describe('wikiLinksToMarkdown', () => {
  it('[[제품]] 을 검색 링크로 바꾼다', () => {
    expect(wikiLinksToMarkdown('참고: [[스노우피크 랜턴]]')).toBe('참고: [스노우피크 랜턴](/search?q=%EC%8A%A4%EB%85%B8%EC%9A%B0%ED%94%BC%ED%81%AC%20%EB%9E%9C%ED%84%B4)');
  });
  it('코드는 건드리지 않는다', () => {
    expect(wikiLinksToMarkdown('`[[a]]`')).toBe('`[[a]]`');
    expect(wikiLinksToMarkdown('```\n[[a]]\n```')).toBe('```\n[[a]]\n```');
  });
});
