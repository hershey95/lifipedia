import { describe, expect, it } from 'vitest';
import { buildSituationCards, parseTaxonomySeed, summarizeChildren } from '@/lib/situation';

const NOW = new Date('2026-11-12T00:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const cats = [
  { id: 'camp', slug: 'camping', name: '캠핑', parentId: null, followerCount: 0 },
  { id: 'tent', slug: 'tent', name: '텐트', parentId: 'camp', followerCount: 0 },
  { id: 'bp', slug: 'backpacking-tent', name: '백패킹 텐트', parentId: 'tent', followerCount: 0 },
  { id: 'chair', slug: 'chair', name: '의자', parentId: 'camp', followerCount: 5 },
  { id: 'rice', slug: 'rice-cooker', name: '밥솥', parentId: null, followerCount: 1 },
];
const item = (id: string, themeId: string, score = 0) => ({ id, themeId, name: id, slug: id, score });

describe('buildSituationCards', () => {
  it('중분류 카드는 하위 리프의 문서·투표를 합산하고 경로를 만든다', () => {
    const [card] = buildSituationCards({
      cats, linkedIds: ['tent'], items: [item('a', 'bp', 3), item('b', 'bp', 9)],
      votes: [{ themeId: 'bp', weight: 1.5, createdAt: day(1) }], edits: [], comments: [], asOf: NOW,
    });
    expect(card.pathNames).toEqual(['캠핑', '텐트']);
    expect(card.itemCount).toBe(2);
    expect(card.topItem?.slug).toBe('b');
    expect(card.score).toBe(1.5);
  });

  it('인기순으로 정렬하고 동점은 followerCount 로 가른다', () => {
    const cards = buildSituationCards({
      cats, linkedIds: ['rice', 'chair', 'bp'], items: [],
      votes: [{ themeId: 'bp', weight: 4, createdAt: day(2) }],
      edits: [], comments: [], asOf: NOW,
    });
    expect(cards.map((c) => c.id)).toEqual(['bp', 'chair', 'rice']);
  });

  it('30일 밖 편집·댓글은 세지 않는다', () => {
    const [card] = buildSituationCards({
      cats, linkedIds: ['chair'], items: [],
      votes: [], edits: [{ themeId: 'chair', createdAt: day(31) }, { themeId: 'chair', createdAt: day(1) }],
      comments: [{ themeId: 'chair', createdAt: day(40) }], asOf: NOW,
    });
    expect(card.score).toBe(2);
  });

  it('없는 분류 id 는 건너뛴다', () => {
    expect(buildSituationCards({ cats, linkedIds: ['nope'], items: [], votes: [], edits: [], comments: [], asOf: NOW })).toEqual([]);
  });
});

describe('buildSituationCards 조회 항', () => {
  const run = (viewsTrackedDays: number, views: { themeId: string; count: number }[]) =>
    buildSituationCards({ cats, linkedIds: ['tent'], items: [], votes: [], edits: [], comments: [], views, viewsTrackedDays, asOf: NOW });

  it('조회 지표가 30일 미만이면 조회가 커도 점수가 변하지 않는다', () => {
    expect(run(29, [{ themeId: 'bp', count: 1000 }])[0].score).toBe(0);
  });
  it('30일이면 하위 분류의 조회 1000 이 +100', () => {
    expect(run(30, [{ themeId: 'bp', count: 1000 }])[0].score).toBeCloseTo(100);
  });
  it('배치되지 않은 분류의 조회는 섞이지 않는다', () => {
    expect(run(30, [{ themeId: 'rice', count: 1000 }])[0].score).toBe(0);
  });
});

describe('summarizeChildren', () => {
  const sub = (parentId: string, its: ReturnType<typeof item>[]) => summarizeChildren({ parentId, cats, items: its });

  it('손자 소분류의 문서가 중분류 자식 카드에 모인다', () => {
    const { ranked } = sub('camp', [item('a', 'bp', 1), item('b', 'bp', 5), item('c', 'bp', 2)]);
    expect(ranked.map((r) => r.slug)).toEqual(['tent']);
    expect(ranked[0].itemCount).toBe(3);
    expect(ranked[0].top?.slug).toBe('b');
  });

  it('문서 3개 미만 자식은 merged 로 가고 ranked 에 없다', () => {
    const { ranked, merged } = sub('camp', [item('a', 'chair', 1), item('b', 'chair', 2)]);
    expect(ranked).toEqual([]);
    expect(merged.map((m) => m.slug)).toEqual(['b', 'a']);
    expect(merged[0].themeSlug).toBe('chair');
  });

  it('3개면 ranked, 1위는 최고 score, 동점은 id 순', () => {
    const { ranked } = sub('camp', [
      item('a', 'chair', 4), item('b', 'chair', 4), item('c', 'chair', 1),
      item('x', 'bp', 9), item('y', 'bp', 1), item('z', 'bp', 1),
    ]);
    expect(ranked.map((r) => r.slug)).toEqual(['tent', 'chair']);
    expect(ranked[1].top?.slug).toBe('a');
  });

  it('자식이 없으면 둘 다 빈 배열', () => {
    expect(sub('rice', [item('a', 'rice', 1)])).toEqual({ ranked: [], merged: [] });
  });
});

describe('parseTaxonomySeed', () => {
  const ok = {
    categories: [
      { slug: 'camping', name: '캠핑', parent: null },
      { slug: 'tent', name: '텐트', parent: 'camping' },
    ],
    situations: [{ slug: 'camping-trip', name: '캠핑·차박', categories: ['tent'] }],
  };

  it('정상 시드를 통과시킨다', () => {
    expect(parseTaxonomySeed(ok).errors).toEqual([]);
  });

  it('없는 부모·없는 연결·중복 슬러그·깊이 초과를 오류로 모은다', () => {
    const bad = {
      categories: [
        { slug: 'a', name: 'A', parent: null },
        { slug: 'a', name: 'A2', parent: null },
        { slug: 'b', name: 'B', parent: 'zzz' },
        { slug: 'c1', name: 'C1', parent: 'a' },
        { slug: 'c2', name: 'C2', parent: 'c1' },
        { slug: 'c3', name: 'C3', parent: 'c2' },
      ],
      situations: [{ slug: 's', name: 'S', categories: ['nope'] }],
    };
    const { errors } = parseTaxonomySeed(bad);
    expect(errors.some((e) => e.includes('중복'))).toBe(true);
    expect(errors.some((e) => e.includes('zzz'))).toBe(true);
    expect(errors.some((e) => e.includes('nope'))).toBe(true);
    expect(errors.some((e) => e.includes('c3'))).toBe(true);
  });

  it('형식이 틀리면 오류를 돌려주고 던지지 않는다', () => {
    expect(parseTaxonomySeed(null).errors.length).toBeGreaterThan(0);
  });
});
