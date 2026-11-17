import { describe, expect, it } from 'vitest';
import {
  buildCommentTree,
  commentTally,
  CONCEPT_RULES,
  isConcept,
  parseCommentSort,
  type CommentVoteInput,
} from '@/lib/comments';
import { wilsonLowerBound } from '@/lib/ranking';

const DAY = 86_400_000;
const t0 = new Date('2026-11-01T00:00:00Z');
const old = new Date(t0.getTime() - 30 * DAY);
const v = (over: Partial<CommentVoteInput> = {}, i = 0): CommentVoteInput => ({
  type: 'UP',
  weight: 1,
  userId: `u${i}`,
  createdAt: new Date(t0.getTime() + DAY),
  voterCreatedAt: old,
  ...over,
});
const ups = (n: number, weight = 1) => Array.from({ length: n }, (_, i) => v({ weight }, i));
const top = { createdAt: t0, parentId: null };

describe('commentTally', () => {
  it('표 없음 → 0', () => {
    expect(commentTally([])).toEqual({ upCount: 0, downCount: 0, bestScore: 0 });
  });
  it('UP 3(가중 1) → wilson(3,3), 행 수는 3', () => {
    const t = commentTally(ups(3));
    expect(t.upCount).toBe(3);
    expect(t.bestScore).toBeCloseTo(wilsonLowerBound(3, 3), 10);
  });
  it('가중 5.0 은 3.0 으로 잘린다', () => {
    expect(commentTally([v({ weight: 5 })]).bestScore).toBeCloseTo(wilsonLowerBound(3, 3), 10);
  });
  it('DOWN 은 downCount 와 분모에 들어간다', () => {
    const t = commentTally([v(), v({ type: 'DOWN' }, 1)]);
    expect(t).toMatchObject({ upCount: 1, downCount: 1 });
    expect(t.bestScore).toBeCloseTo(wilsonLowerBound(1, 2), 10);
  });
});

describe('isConcept', () => {
  const weights = (ws: number[]) => ws.map((weight, i) => v({ weight }, i));
  it('가중 UP 8.0 · 추천자 5 → 참, 7.99 → 거짓', () => {
    expect(isConcept(top, weights([3, 3, 1, 0.5, 0.5]))).toBe(true);
    expect(isConcept(top, weights([3, 3, 1, 0.5, 0.49]))).toBe(false);
  });
  it('추천자 4명이면 가중 합이 9 여도 거짓', () => {
    expect(isConcept(top, weights([3, 3, 3, 0.1]))).toBe(false);
  });
  it('7일 창 밖 표는 빠진다', () => {
    const late = new Date(t0.getTime() + 8 * DAY);
    const outside = Array.from({ length: 4 }, (_, i) => v({ createdAt: late, weight: 3 }, 10 + i));
    expect(isConcept(top, [...ups(5), ...outside])).toBe(false);
    expect(isConcept(top, [...weights([3, 3, 3, 1, 1]), ...outside])).toBe(true);
  });
  it('투표 시점 계정 6.9일 표는 빠진다', () => {
    const young = new Date(t0.getTime() + DAY - 6.9 * DAY);
    const base = weights([3, 3, 2, 1]);
    expect(isConcept(top, [...base, v({ weight: 3, voterCreatedAt: young }, 9)])).toBe(false);
    expect(isConcept(top, [...base, v({ weight: 3 }, 9)])).toBe(true);
  });
  it('답글은 항상 거짓', () => {
    expect(isConcept({ createdAt: t0, parentId: 'p' }, ups(6, 3))).toBe(false);
  });
  it('Wilson < 0.6 이면 거짓', () => {
    const downs = Array.from({ length: 6 }, (_, i) => v({ type: 'DOWN', weight: 3 }, 20 + i));
    expect(isConcept(top, [...ups(6, 3), ...downs])).toBe(false);
  });
  it('규칙 상수는 설계값', () => {
    expect(CONCEPT_RULES.MIN_WEIGHTED_UP).toBe(8);
  });
});

describe('parseCommentSort', () => {
  it('그 밖의 값·배열 → best', () => {
    expect(parseCommentSort(undefined)).toBe('best');
    expect(parseCommentSort('hot')).toBe('best');
    expect(parseCommentSort(['new', 'old'])).toBe('best');
    expect(parseCommentSort('new')).toBe('new');
    expect(parseCommentSort('old')).toBe('old');
  });
});

describe('buildCommentTree', () => {
  const c = (id: string, parentId: string | null, over: Partial<{ isRemoved: boolean; createdAt: Date; bestScore: number }> = {}) => ({
    id,
    parentId,
    isRemoved: false,
    createdAt: new Date(t0.getTime() + Number(id.replace(/\D/g, '') || 0) * 1000),
    bestScore: 0,
    ...over,
  });
  const ids = (nodes: { id: string }[]) => nodes.map((n) => n.id);

  it('best: bestScore desc → createdAt asc, new/old 는 시각 순', () => {
    const flat = [c('c1', null, { bestScore: 1 }), c('c2', null, { bestScore: 5 }), c('c3', null, { bestScore: 1 })];
    expect(ids(buildCommentTree(flat, 'best'))).toEqual(['c2', 'c1', 'c3']);
    expect(ids(buildCommentTree(flat, 'new'))).toEqual(['c3', 'c2', 'c1']);
    expect(ids(buildCommentTree(flat, 'old'))).toEqual(['c1', 'c2', 'c3']);
  });
  it('자식은 부모 아래, 깊이가 붙는다', () => {
    const tree = buildCommentTree([c('c1', null), c('c2', 'c1')], 'best');
    expect(tree[0].children[0]).toMatchObject({ id: 'c2', depth: 1 });
  });
  it('고아는 최상위', () => {
    expect(ids(buildCommentTree([c('c1', 'none')], 'best'))).toEqual(['c1']);
  });
  it('깊이 10 체인 → 최대 depth 8', () => {
    const chain = Array.from({ length: 10 }, (_, i) => c(`c${i}`, i === 0 ? null : `c${i - 1}`));
    let node = buildCommentTree(chain, 'old')[0];
    let max = 0;
    while (node.children.length) {
      node = node.children[0];
      max = Math.max(max, node.depth);
    }
    expect(max).toBe(8);
  });
  it('삭제: 자식 없으면 제외, 자식 있으면 유지, 삭제만 있는 가지는 통째로 제외', () => {
    const flat = [
      c('c1', null, { isRemoved: true }),
      c('c2', null, { isRemoved: true }),
      c('c3', 'c2'),
      c('c4', null, { isRemoved: true }),
      c('c5', 'c4', { isRemoved: true }),
    ];
    expect(ids(buildCommentTree(flat, 'old'))).toEqual(['c2']);
  });
});
