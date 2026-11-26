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
  it('값·편집 요약과 함께 작성 당시의 기준 리비전을 돌려준다 (그 기준으로 제출해야 서버가 병합·충돌을 판정한다)', () => {
    expect(readDraft(writeDraft(3, values, '가격 갱신'))).toEqual({ baseRevision: 3, values, summary: '가격 갱신' });
  });
  it('없거나 깨진 저장본은 null', () => {
    for (const bad of [null, '', '{', '3', 'null', '{"baseRevision":3}', '{"baseRevision":3,"summary":"","values":{"name":1}}']) {
      expect(readDraft(bad)).toBeNull();
    }
  });
});
