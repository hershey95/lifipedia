import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: { item: { findMany: vi.fn(), findFirst: vi.fn() } },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { buildWikiResolver, findBacklinks, itemNameExists } from '@/lib/wikilinks';
import { wikiLinksToMarkdown } from '@/lib/markdown';
import { pastItemView } from '@/lib/wiki';

beforeEach(() => {
  db.item.findMany.mockReset().mockResolvedValue([]);
  db.item.findFirst.mockReset().mockResolvedValue(null);
});

describe('buildWikiResolver', () => {
  it('ACTIVE 분류의 문서만 해석한다', async () => {
    await buildWikiResolver(['[[A]]']);
    const where = db.item.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isRemoved: false, theme: { status: 'ACTIVE' } });
  });
});

describe('findBacklinks', () => {
  it('설명·스펙 요약·추천 이유 세 필드와 ACTIVE 분류만 본다', async () => {
    await findBacklinks({ id: 'i1', name: '랜턴' });
    const where = db.item.findMany.mock.calls[0][0].where;
    expect(where.theme).toEqual({ status: 'ACTIVE' });
    expect(where.OR).toEqual([
      { description: { contains: '[[랜턴]]' } },
      { specSummary: { contains: '[[랜턴]]' } },
      { recommendReason: { contains: '[[랜턴]]' } },
    ]);
  });
});

describe('itemNameExists', () => {
  it('정확 일치 한 건을 찾는다 (30건 검색 결과에 의존하지 않음)', async () => {
    db.item.findFirst.mockResolvedValue({ id: 'x' });
    expect(await itemNameExists('랜턴')).toBe(true);
    expect(db.item.findFirst.mock.calls[0][0].where).toMatchObject({
      name: '랜턴',
      isRemoved: false,
      theme: { status: 'ACTIVE' },
    });
    db.item.findFirst.mockResolvedValue(null);
    expect(await itemNameExists('없음')).toBe(false);
  });
});

describe('wikiLinksToMarkdown 공백 트림 (회귀 방지)', () => {
  it('[[ A ]] 는 A 로 해석한다', () => {
    const seen: string[] = [];
    const out = wikiLinksToMarkdown('[[ A ]]', (t) => (seen.push(t), { kind: 'one', href: '/x' }));
    expect(seen).toEqual(['A']);
    expect(out).toBe('[A](/x)');
  });
});

describe('pastItemView (스냅샷 누락 필드 폴백)', () => {
  const current = { name: '현재 이름', tier: 'MID', priceKrw: 1000, description: '현재', specSummary: '현재', recommendReason: '현재' };
  it('누락된 본문 필드는 빈 값, name·tier 는 현재 값', () => {
    const v = pastItemView({ name: null, tier: null, description: null, specSummary: null, recommendReason: null, priceKrw: null }, current);
    expect(v.name).toBe('현재 이름');
    expect(v.tier).toBe('MID');
    expect(v.description).toBe('');
    expect(v.specSummary).toBe('');
    expect(v.recommendReason).toBe('');
    expect(v.priceKrw).toBeNull();
  });
  it('값이 있으면 과거 값을 쓴다', () => {
    const v = pastItemView({ name: '옛', tier: 'BUDGET', description: '옛 설명', priceKrw: 500 }, current);
    expect(v).toMatchObject({ name: '옛', tier: 'BUDGET', description: '옛 설명', priceKrw: 500 });
  });
  it('알 수 없는 tier 는 현재 값', () => {
    expect(pastItemView({ tier: 'GOLD' }, current).tier).toBe('MID');
  });
});
