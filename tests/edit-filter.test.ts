import { describe, expect, it } from 'vitest';
import { changeTags, checkEdit, isBlockedUrl } from '@/lib/edit-filter';

const body = 'a'.repeat(200);
const snap = (o: Record<string, unknown> = {}) => ({ priceKrw: 10_000, description: body, purchaseLinks: [], ...o });
const link = (url: string) => ({ label: 'l', url });

describe('isBlockedUrl', () => {
  it.each([
    ['https://bit.ly/x', true],
    ['https://BIT.LY/x', true],
    ['https://bit.ly./x', true],
    ['https://a.bit.ly/x', true],
    ['https://amazon.com@bit.ly/x', true],
    ['https://evil-bit.ly/x', false],
    ['https://bit.ly.example.com/x', false],
    ['https://example.com/?u=https://bit.ly/x', false],
    ['not a url', false],
  ])('%s → %s', (url, expected) => {
    expect(isBlockedUrl(url)).toBe(expected);
  });
});

describe('checkEdit', () => {
  it.each([
    [10_000, 15_000, 0],
    [10_000, 15_001, 1],
    [10_000, 5_000, 0],
    [10_000, 4_999, 1],
    [10_000, 0, 1],
    [10_000, null, 1], // 가격을 지우는 것도 한 번 더 확인
    [null, 999_999, 0],
    [0, 999_999, 0],
  ])('가격 %s → %s: confirm %s건', (from, to, n) => {
    expect(checkEdit(snap({ priceKrw: from }), snap({ priceKrw: to })).confirm).toHaveLength(n);
  });

  it.each([
    [200, 100, 0],
    [200, 99, 1],
    [99, 10, 0], // 원래 본문이 100자 미만이면 건너뜀
    [100, 10, 1],
  ])('본문 %s자 → %s자: confirm %s건', (from, to, n) => {
    const r = checkEdit(snap({ description: 'a'.repeat(from) }), snap({ description: 'a'.repeat(to) }));
    expect(r.confirm).toHaveLength(n);
  });

  it('새로 추가한 차단 도메인 링크만 거부한다', () => {
    const old = link('https://bit.ly/old');
    expect(checkEdit(snap({ purchaseLinks: [old] }), snap({ purchaseLinks: [old] })).block).toEqual([]);
    const r = checkEdit(snap({ purchaseLinks: [old] }), snap({ purchaseLinks: [old, link('https://tinyurl.com/new')] }));
    expect(r.block).toHaveLength(1);
    expect(r.block[0]).toContain('tinyurl.com');
  });

  it('가격을 바꾸고 본문에 새 출처 URL 이 없으면 hint', () => {
    expect(checkEdit(snap(), snap({ priceKrw: 11_000 })).hint).toHaveLength(1);
    const withSource = snap({ priceKrw: 11_000, description: `${body}\nhttps://shop.example.com/p` });
    expect(checkEdit(snap(), withSource).hint).toEqual([]);
    expect(checkEdit(snap(), snap()).hint).toEqual([]);
  });
});

describe('changeTags', () => {
  it('새 문서', () => expect(changeTags(null, snap(), null)).toEqual(['새 문서']));
  it('되돌리기 + 가격 변경 + 대량 삭제', () => {
    expect(changeTags(snap(), snap({ priceKrw: 12_000, description: 'a'.repeat(10) }), 1)).toEqual([
      '되돌리기',
      '가격 변경',
      '대량 삭제',
    ]);
  });
  it('바뀐 것이 없으면 태그도 없다', () => expect(changeTags(snap(), snap(), null)).toEqual([]));
});
