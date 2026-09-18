import { describe, expect, it } from 'vitest';
import { RANKING_CONSTANTS } from '@/lib/ranking';
import { badgeFor, trustFromContributions, voteWeightFor } from '@/lib/trust';

const NOW = new Date('2026-09-17T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe('trustFromContributions', () => {
  it('기여가 없으면 최소 신뢰도 1.0', () => {
    expect(trustFromContributions(0)).toBe(1);
  });

  it('기여가 늘면 단조 증가한다', () => {
    expect(trustFromContributions(100)).toBeGreaterThan(trustFromContributions(10));
  });

  it('로그 스케일이라 증가폭이 점점 줄어든다', () => {
    const first = trustFromContributions(10) - trustFromContributions(0);
    const later = trustFromContributions(110) - trustFromContributions(100);
    expect(later).toBeLessThan(first);
  });

  it('아무리 많이 기여해도 상한을 넘지 않는다', () => {
    expect(trustFromContributions(10_000_000)).toBe(RANKING_CONSTANTS.MAX_VOTE_WEIGHT);
  });

  it('음수 입력도 안전하게 처리한다', () => {
    expect(trustFromContributions(-5)).toBe(1);
  });
});

describe('badgeFor', () => {
  it('기여 수에 따라 단계가 오른다', () => {
    expect(badgeFor(0)).toBe('NEWCOMER');
    expect(badgeFor(5)).toBe('CONTRIBUTOR');
    expect(badgeFor(25)).toBe('EDITOR');
    expect(badgeFor(80)).toBe('CURATOR');
    expect(badgeFor(250)).toBe('STEWARD');
  });
});

describe('voteWeightFor', () => {
  it('신규 계정의 표는 대폭 축소된다', () => {
    const fresh = voteWeightFor({ trustScore: 2, accountCreatedAt: daysAgo(1), now: NOW });
    const settled = voteWeightFor({ trustScore: 2, accountCreatedAt: daysAgo(30), now: NOW });
    expect(fresh).toBeCloseTo(2 * RANKING_CONSTANTS.NEW_ACCOUNT_MULTIPLIER, 6);
    expect(settled).toBe(2);
  });

  it('유예 기간 경계에서 정상 가중치로 돌아온다', () => {
    const at = voteWeightFor({
      trustScore: 1,
      accountCreatedAt: daysAgo(RANKING_CONSTANTS.NEW_ACCOUNT_DAYS),
      now: NOW,
    });
    expect(at).toBe(1);
  });

  it('신뢰도가 조작된 값이어도 상한을 넘지 못한다', () => {
    const weight = voteWeightFor({ trustScore: 999, accountCreatedAt: daysAgo(365), now: NOW });
    expect(weight).toBe(RANKING_CONSTANTS.MAX_VOTE_WEIGHT);
  });

  it('음수 신뢰도는 0으로 막는다', () => {
    expect(voteWeightFor({ trustScore: -10, accountCreatedAt: daysAgo(365), now: NOW })).toBe(0);
  });
});
