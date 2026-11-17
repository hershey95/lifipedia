import { describe, expect, it } from 'vitest';
import { boardHref, parseBoardParams, postBody, POST_KIND_LABEL } from '@/lib/board';

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

it('종류 라벨', () => {
  expect(POST_KIND_LABEL.QUESTION).toBe('추천 요청');
});
