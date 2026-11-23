import { describe, expect, it } from 'vitest';
import { feedHref, parseFeedParams } from '@/lib/feed';

describe('feed', () => {
  it('빈 입력은 기본값', () => {
    expect(parseFeedParams({})).toEqual({ tab: 'rank', sort: 'hot', tier: null, best: false });
  });
  it('정상 값 파싱', () => {
    expect(parseFeedParams({ tab: 'list', sort: 'new', tier: 'mid' })).toEqual({ tab: 'list', sort: 'new', tier: 'MID', best: false });
  });
  it('잘못된 값·배열은 기본값', () => {
    expect(parseFeedParams({ tab: 'x', sort: 'rising', tier: 'gold' })).toEqual({ tab: 'rank', sort: 'hot', tier: null, best: false });
    expect(parseFeedParams({ sort: ['top', 'new'] }).sort).toBe('hot');
  });
  it('board 탭 파싱·링크', () => {
    expect(parseFeedParams({ tab: 'board' }).tab).toBe('board');
    expect(feedHref('s', { tab: 'board' })).toBe('/theme/s?tab=board');
  });
  it('feedHref: 기본값은 URL 에서 빠진다', () => {
    expect(feedHref('s', {})).toBe('/theme/s');
    expect(feedHref('s', { tab: 'list', sort: 'hot' })).toBe('/theme/s?tab=list');
    expect(feedHref('s', { tab: 'list', sort: 'top', tier: 'PREMIUM' })).toBe('/theme/s?tab=list&sort=top&tier=premium');
    expect(feedHref('캠핑', {})).toBe('/theme/%EC%BA%A0%ED%95%91');
  });
});

describe('feed best (개념글만)', () => {
  it('best=1 일 때만 true', () => {
    expect(parseFeedParams({ best: '1' }).best).toBe(true);
    expect(parseFeedParams({ best: '0' }).best).toBe(false);
    expect(parseFeedParams({ best: 'true' }).best).toBe(false);
    expect(parseFeedParams({ best: ['1', '1'] }).best).toBe(false);
  });
  it('feedHref 왕복: true 일 때만 best=1, 기본값은 URL 에서 빠진다', () => {
    expect(feedHref('s', { tab: 'talk', best: true })).toBe('/theme/s?tab=talk&best=1');
    expect(feedHref('s', { tab: 'talk', best: false })).toBe('/theme/s?tab=talk');
    const p = parseFeedParams({ tab: 'talk', best: '1' });
    expect(parseFeedParams(Object.fromEntries(new URL(feedHref('s', p), 'http://x').searchParams))).toEqual(p);
  });
});
