import { describe, expect, it } from 'vitest';
import { draftKey, readDraft, writeDraft } from '@/lib/draft';

const values = {
  name: '랜턴',
  tier: 'MID' as const,
  priceKrw: null,
  description: '쓰다 만 설명',
  specSummary: null,
  recommendReason: null,
  imageUrl: null,
  purchaseLinks: [{ label: '', url: '' }],
};

describe('편집 임시 저장', () => {
  it('키는 새 문서(갤러리)와 편집(문서)을 구분한다', () => {
    expect(draftKey({ mode: 'create', themeSlug: 'abc' })).toBe('lifipedia:draft:new:abc');
    expect(draftKey({ mode: 'edit', itemId: 'abc' })).toBe('lifipedia:draft:edit:abc');
  });
  it('같은 기준 리비전이면 값과 편집 요약이 복원된다', () => {
    expect(readDraft(writeDraft(3, values, '가격 갱신'), 3)).toEqual({ values, summary: '가격 갱신' });
  });
  it('기준 리비전이 다르면 복원하지 않는다 (남의 편집을 덮어쓰지 않도록)', () => {
    expect(readDraft(writeDraft(3, values, ''), 4)).toBeNull();
  });
  it('없거나 깨진 저장본은 null', () => {
    for (const bad of [null, '', '{', '3', 'null', '{"baseRevision":3}', '{"baseRevision":3,"summary":"","values":{"name":1}}']) {
      expect(readDraft(bad, 3)).toBeNull();
    }
  });
});
