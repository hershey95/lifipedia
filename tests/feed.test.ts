import { describe, expect, it } from 'vitest';
import { feedHref, parseFeedParams } from '@/lib/feed';

describe('feed', () => {
  it('빈 입력은 기본값', () => {
    expect(parseFeedParams({})).toEqual({ tab: 'rank', sort: 'hot', tier: null });
  });
  it('정상 값 파싱', () => {
    expect(parseFeedParams({ tab: 'list', sort: 'new', tier: 'mid' })).toEqual({ tab: 'list', sort: 'new', tier: 'MID' });
  });
  it('잘못된 값·배열은 기본값', () => {
    expect(parseFeedParams({ tab: 'x', sort: 'rising', tier: 'gold' })).toEqual({ tab: 'rank', sort: 'hot', tier: null });
    expect(parseFeedParams({ sort: ['top', 'new'] }).sort).toBe('hot');
  });
  it('feedHref: 기본값은 URL 에서 빠진다', () => {
    expect(feedHref('s', {})).toBe('/theme/s');
    expect(feedHref('s', { tab: 'list', sort: 'hot' })).toBe('/theme/s?tab=list');
    expect(feedHref('s', { tab: 'list', sort: 'top', tier: 'PREMIUM' })).toBe('/theme/s?tab=list&sort=top&tier=premium');
    expect(feedHref('캠핑', {})).toBe('/theme/%EC%BA%A0%ED%95%91');
  });
});
