import { describe, expect, it } from 'vitest';
import { STUB_MIN_BODY, countWanted, stubReasons } from '@/lib/upkeep';

const body = (n: number, extra = '') => 'a'.repeat(n) + '\n\n## 출처\n- x' + extra;
const full = { description: body(STUB_MIN_BODY), priceKrw: 1000, imageUrl: 'https://x.test/a.png' };

describe('stubReasons', () => {
  it('모두 갖추면 토막이 아니다', () => {
    expect(stubReasons(full)).toEqual([]);
  });

  it('본문 길이 경계: 300자 이상은 통과, 299자는 본문 짧음', () => {
    const withLen = (n: number) => 'a'.repeat(n - 6) + '\n## 출처'; // '\n## 출처' = 6자
    const at = { ...full, description: withLen(STUB_MIN_BODY) };
    expect(at.description.length).toBe(STUB_MIN_BODY);
    expect(stubReasons(at)).toEqual([]);
    const under = { ...full, description: withLen(STUB_MIN_BODY - 1) };
    expect(under.description.length).toBe(STUB_MIN_BODY - 1);
    expect(stubReasons(under)).toEqual(['본문 짧음']);
  });

  it('출처 절·가격·이미지 누락을 각각 알린다', () => {
    expect(stubReasons({ ...full, description: 'a'.repeat(400) })).toEqual(['출처 절 없음']);
    expect(stubReasons({ ...full, priceKrw: null })).toEqual(['가격 없음']);
    expect(stubReasons({ ...full, imageUrl: null })).toEqual(['이미지 없음']);
    expect(stubReasons({ description: '', priceKrw: null, imageUrl: '' })).toEqual([
      '본문 짧음',
      '출처 절 없음',
      '가격 없음',
      '이미지 없음',
    ]);
  });

  it('출처 절은 줄 머리의 `## 출처` 만 인정한다(코드 블록·문장 중간은 아님)', () => {
    expect(stubReasons({ ...full, description: 'a'.repeat(400) + ' ## 출처' })).toEqual(['출처 절 없음']);
    expect(stubReasons({ ...full, description: 'a'.repeat(400) + '\n### 출처\n- x' })).toEqual([]);
  });
});

describe('countWanted', () => {
  it('없는 제목만 문서 수 기준으로 센다(한 문서 안 중복은 1)', () => {
    const docs = ['[[A]] [[A]] [[B]]', '[[A]] [[이미있음]]', '[[C]]'];
    expect(countWanted(docs, ['이미있음'])).toEqual([
      { title: 'A', count: 2 },
      { title: 'B', count: 1 },
      { title: 'C', count: 1 },
    ]);
  });

  it('빈 입력·링크 없음은 빈 배열', () => {
    expect(countWanted([], [])).toEqual([]);
    expect(countWanted(['링크 없음', ''], [])).toEqual([]);
  });

  it('limit 으로 자른다', () => {
    expect(countWanted(['[[A]] [[B]] [[C]]'], [], 2)).toHaveLength(2);
  });
});
