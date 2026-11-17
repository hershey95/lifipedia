import { describe, expect, it } from 'vitest';
import { boardHref, isAnswer, itemTallyForPost, parseBoardParams, postBody, POST_KIND_LABEL } from '@/lib/board';

describe('parseBoardParams', () => {
  it('올바른 값은 그대로', () => {
    expect(parseBoardParams({ kind: 'QUESTION', sort: 'new' })).toEqual({ kind: 'QUESTION', sort: 'new', page: 1 });
  });
  it('잘못된 값·배열은 기본값', () => {
    expect(parseBoardParams({ kind: 'FOO', sort: ['new', 'top'] })).toEqual({ kind: null, sort: 'hot', page: 1 });
  });
  it('page 는 1 이상 정수만', () => {
    expect(parseBoardParams({ page: '3' }).page).toBe(3);
    expect(parseBoardParams({ page: '0' }).page).toBe(1);
    expect(parseBoardParams({ page: '-2' }).page).toBe(1);
    expect(parseBoardParams({ page: 'x' }).page).toBe(1);
  });
});

describe('boardHref', () => {
  it('기본값은 URL 에서 뺀다', () => {
    expect(boardHref('/theme/a', {})).toBe('/theme/a');
    expect(boardHref('/theme/a', { kind: null, sort: 'hot', page: 1 })).toBe('/theme/a');
  });
  it('값이 있으면 붙는다', () => {
    expect(boardHref('/theme/a', { kind: 'REVIEW', sort: 'top', page: 2 })).toBe('/theme/a?kind=REVIEW&sort=top&page=2');
  });
  it('기존 쿼리가 있는 base 에는 &로 잇는다', () => {
    expect(boardHref('/theme/a?tab=board', { sort: 'new' })).toBe('/theme/a?tab=board&sort=new');
  });
});

describe('postBody', () => {
  const ok = { kind: 'QUESTION', title: '제목', body: '본문' };
  it('정상', () => {
    expect(postBody.safeParse(ok).success).toBe(true);
  });
  it('제목 101자 → 실패', () => {
    expect(postBody.safeParse({ ...ok, title: 'a'.repeat(101) }).success).toBe(false);
  });
  it('본문 공백만 → 실패', () => {
    expect(postBody.safeParse({ ...ok, body: '   ' }).success).toBe(false);
  });
  it('모르는 종류 → 실패', () => {
    expect(postBody.safeParse({ ...ok, kind: 'AD' }).success).toBe(false);
  });
});

describe('isAnswer', () => {
  it('추천 요청 글의 최상위 댓글만 답변', () => {
    expect(isAnswer({ kind: 'QUESTION' }, { parentId: null })).toBe(true);
    expect(isAnswer({ kind: 'QUESTION' }, { parentId: 'c' })).toBe(false);
    expect(isAnswer({ kind: 'REVIEW' }, { parentId: null })).toBe(false);
  });
});

describe('itemTallyForPost', () => {
  const up = (weight = 1) => ({ type: 'UP' as const, weight });
  const ans = (itemIds: string[], votes: { type: 'UP' | 'DOWN'; weight: number }[] = [], over = {}) => ({
    isRemoved: false,
    itemIds,
    votes,
    helpfulAt: null,
    ...over,
  });
  it('같은 문서를 첨부한 답변 둘은 합산, answerCount 2', () => {
    const t = itemTallyForPost([ans(['a'], [up(), up()]), ans(['a', 'b'], [up()])]);
    expect(t.find((x) => x.itemId === 'a')).toMatchObject({ weightedUp: 3, answerCount: 2 });
    expect(t.find((x) => x.itemId === 'b')).toMatchObject({ weightedUp: 1, answerCount: 1 });
  });
  it('삭제 답변은 빠진다', () => {
    expect(itemTallyForPost([ans(['a'], [up()], { isRemoved: true })])).toEqual([]);
  });
  it('DOWN 은 합에 들어가지 않는다', () => {
    const t = itemTallyForPost([ans(['a'], [up(), { type: 'DOWN', weight: 3 }])]);
    expect(t[0].weightedUp).toBe(1);
  });
  it('가중 5.0 은 3.0 으로 잘린다', () => {
    expect(itemTallyForPost([ans(['a'], [up(5)])])[0].weightedUp).toBe(3);
  });
  it('정렬: weightedUp desc → answerCount desc → itemId asc, helpful 은 하나라도 있으면 참', () => {
    const t = itemTallyForPost([
      ans(['c'], [up()]),
      ans(['b'], [up()], { helpfulAt: new Date() }),
      ans(['z']),
      ans(['a']),
    ]);
    expect(t.map((x) => x.itemId)).toEqual(['b', 'c', 'a', 'z']);
    expect(t[0].helpful).toBe(true);
    expect(t[1].helpful).toBe(false);
  });
});

it('종류 라벨', () => {
  expect(POST_KIND_LABEL.QUESTION).toBe('추천 요청');
});
