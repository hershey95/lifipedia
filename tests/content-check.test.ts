import { describe, expect, it } from 'vitest';
import { checkContent } from '@/lib/content-check';

const GAL = ['캠핑·차박 갤러리', '주방 & 미식 갤러리'];
const item = (over: Record<string, unknown> = {}) => ({
  name: '브랜드A 모델1',
  tier: 'BUDGET',
  priceKrw: 10000,
  specSummary: null,
  description: '가'.repeat(250),
  recommendReason: null,
  sources: [
    { title: 'a', url: 'https://shop.example/product/1', accessedAt: '2026-10-09' },
    { title: 'b', url: 'https://maker.example/p/1', accessedAt: '2026-10-09' },
  ],
  purchaseLinks: [{ label: 'x', url: 'https://shop.example/product/1' }],
  ...over,
});
const run = (items: unknown[], gallery = '캠핑·차박 갤러리') => checkContent({ gallery, items }, GAL);
const errors = (items: unknown[]) => run(items).filter((i) => i.level === 'error').map((i) => i.msg);

describe('checkContent', () => {
  it('정상 아이템은 오류가 없다', () => {
    expect(errors([item()])).toEqual([]);
  });

  it('출처가 2개 미만이면 오류', () => {
    expect(errors([item({ sources: [item().sources[0]] })]).join()).toContain('출처가 1개');
  });

  it('브랜드/카테고리 목록 URL 은 출처·구매링크 모두 오류', () => {
    const bad = errors([
      item({
        sources: [
          { title: 'a', url: 'https://www.kolonmall.com/Brands/coleman', accessedAt: '2026-10-09' },
          { title: 'b', url: 'https://www.kolonmall.com/Category/List/133021000540', accessedAt: '2026-10-09' },
        ],
        purchaseLinks: [{ label: 'x', url: 'https://www.costco.co.kr/Kovea/c/Kovea' }],
      }),
    ]);
    expect(bad.filter((m) => m.includes('목록/브랜드 페이지'))).toHaveLength(3);
  });

  it('서로 다른 제품이 같은 구매링크를 쓰면 오류', () => {
    const link = [{ label: 'x', url: 'https://shop.example/product/9' }];
    const bad = errors([item({ name: '가 모델', purchaseLinks: link }), item({ name: '나 모델', purchaseLinks: link })]);
    expect(bad.join()).toContain('같은 구매링크');
  });

  it('구매링크가 다른 제품의 출처로 쓰이면 경고', () => {
    const other = item({ name: '나 모델', purchaseLinks: [{ label: 'x', url: 'https://shop.example/product/2' }] });
    const warn = run([item(), { ...other, sources: [...other.sources.slice(1), { title: 'c', url: 'https://shop.example/product/1', accessedAt: '2026-10-09' }] }]);
    expect(warn.some((i) => i.level === 'warn' && i.msg.includes('같은 URL'))).toBe(true);
  });

  it('광고 문구·잘못된 교차링크·확인일 누락·잘못된 가격을 잡는다', () => {
    const bad = errors([
      item({
        description: '가'.repeat(250) + ' 최고의 선택 [[없는 갤러리]]',
        priceKrw: -5,
        sources: [
          { title: 'a', url: 'https://a.example/p/1', accessedAt: '어제' },
          { title: 'b', url: 'https://b.example/p/1', accessedAt: '2026-10-09' },
        ],
      }),
    ]).join('|');
    expect(bad).toContain('광고성');
    expect(bad).toContain('[[없는 갤러리]]');
    expect(bad).toContain('priceKrw');
    expect(bad).toContain('확인일');
  });

  it('브랜드 쏠림과 빈 티어는 경고, 알 수 없는 갤러리는 오류', () => {
    const many = ['A', 'B', 'C', 'D'].map((n, i) =>
      item({ name: `콜맨 ${n}`, purchaseLinks: [{ label: 'x', url: `https://shop.example/product/${i + 10}` }] }),
    );
    expect(run(many).filter((i) => i.level === 'warn').map((i) => i.msg).join()).toContain('브랜드 쏠림');
    expect(run([item()], '없는 갤러리').some((i) => i.level === 'error')).toBe(true);
  });

  it('evidence 는 선택이지만 있으면 형식과 출처 번호를 검사한다', () => {
    expect(errors([item({ evidence: [{ claim: '무게 0.89kg', source: 1, quote: '결합 무게 0.89kg' }] })])).toEqual([]);
    const bad = errors([item({ evidence: [{ claim: '', source: 3, quote: '' }] })]).join('|');
    expect(bad).toContain('claim 과 quote');
    expect(bad).toContain('출처 번호');
    expect(errors([item({ evidence: 'x' })]).join()).toContain('배열');
    expect(errors([item({ evidence: [{ claim: '무게', source: 1, quote: '2.0' }] })]).join()).toContain('12자');
  });

  it('claim 수치가 quote 에 없으면 오류, 설명 수치가 evidence 에 없으면 경고', () => {
    const base = { sources: item().sources, description: '가'.repeat(250) + ' 총중량 363g 입니다.' };
    const bad = errors([item({ ...base, evidence: [{ claim: '총중량 363g', source: 1, quote: 'Spark Ultralight Down Sleeping Bag Title' }] })]).join();
    expect(bad).toContain('363g');
    const ok = run([item({ ...base, evidence: [{ claim: '총중량 363g', source: 1, quote: 'Total weight: 363g (12.8 oz)' }] })]);
    expect(ok.filter((i) => i.level !== 'warn' || i.msg.includes('수치'))).toEqual([]);
    const warn = run([item({ ...base, evidence: [{ claim: '제품명 확인', source: 1, quote: 'Spark Ultralight Down Sleeping Bag Title' }] })]);
    expect(warn.some((i) => i.level === 'warn' && i.msg.includes('363g'))).toBe(true);
  });

  it('가격 순서와 어긋난 티어는 오류', () => {
    const mk = (name: string, tier: string, priceKrw: number, n: number) =>
      item({ name, tier, priceKrw, purchaseLinks: [{ label: 'x', url: `https://shop.example/product/${n}` }] });
    expect(errors([mk('싼데 중가', 'MID', 62000, 1), mk('비싼데 저가', 'BUDGET', 193200, 2)]).join()).toContain('티어 역전');
    expect(errors([mk('저가', 'BUDGET', 62000, 3), mk('중가', 'MID', 193200, 4), mk('고가', 'PREMIUM', 413100, 5)]).join()).not.toContain('티어 역전');
  });
});
