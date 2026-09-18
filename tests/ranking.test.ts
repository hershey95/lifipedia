import { describe, expect, it } from 'vitest';
import {
  RANKING_CONSTANTS,
  computeMomentum,
  computeScore,
  rankItems,
  timeDecay,
  wilsonLowerBound,
  type ScoredVote,
} from '@/lib/ranking';

const NOW = new Date('2026-09-17T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function vote(overrides: Partial<ScoredVote> = {}): ScoredVote {
  return { type: 'UP', weight: 1, createdAt: NOW, userId: Math.random().toString(36), ...overrides };
}

function upvotes(count: number, at: Date = NOW, weight = 1): ScoredVote[] {
  return Array.from({ length: count }, (_, i) => vote({ createdAt: at, weight, userId: `u${i}` }));
}

describe('timeDecay', () => {
  it('오늘 표는 감쇠하지 않는다', () => {
    expect(timeDecay(NOW, NOW)).toBe(1);
  });

  it('반감기가 지나면 정확히 절반이 된다', () => {
    expect(timeDecay(daysAgo(RANKING_CONSTANTS.VOTE_HALF_LIFE_DAYS), NOW)).toBeCloseTo(0.5, 10);
  });

  it('미래 시각의 표는 1로 처리한다', () => {
    expect(timeDecay(new Date(NOW.getTime() + 86_400_000), NOW)).toBe(1);
  });
});

describe('wilsonLowerBound', () => {
  it('표가 없으면 0', () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it('표본이 작을수록 실제 비율보다 크게 깎인다', () => {
    const small = wilsonLowerBound(3, 3);
    const large = wilsonLowerBound(300, 300);
    expect(small).toBeLessThan(large);
    expect(large).toBeLessThan(1);
  });

  it('전부 비추천이면 0 이하로 내려가지 않는다', () => {
    expect(wilsonLowerBound(0, 50)).toBeGreaterThanOrEqual(0);
  });
});

describe('computeScore', () => {
  it('표가 없으면 0점이고 잠정 상태다', () => {
    const result = computeScore([], NOW);
    expect(result.score).toBe(0);
    expect(result.isProvisional).toBe(true);
  });

  it('추천 3개 만장일치가 추천 300개 90% 지지를 이기지 못한다', () => {
    const tiny = computeScore(upvotes(3), NOW);
    const big = computeScore(
      [...upvotes(270), ...Array.from({ length: 30 }, (_, i) => vote({ type: 'DOWN', userId: `d${i}` }))],
      NOW,
    );
    expect(big.score).toBeGreaterThan(tiny.score);
  });

  it('오래된 지지는 최신 지지보다 점수가 낮다', () => {
    const fresh = computeScore(upvotes(20), NOW);
    const stale = computeScore(upvotes(20, daysAgo(180)), NOW);
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it('가중치는 상한을 넘지 못한다', () => {
    const capped = computeScore(upvotes(10, NOW, 100), NOW);
    const atCap = computeScore(upvotes(10, NOW, RANKING_CONSTANTS.MAX_VOTE_WEIGHT), NOW);
    expect(capped.score).toBe(atCap.score);
  });

  it('참여자가 최소 인원 미만이면 잠정으로 표시한다', () => {
    const below = computeScore(upvotes(RANKING_CONSTANTS.MIN_DISTINCT_VOTERS - 1), NOW);
    const atLeast = computeScore(upvotes(RANKING_CONSTANTS.MIN_DISTINCT_VOTERS), NOW);
    expect(below.isProvisional).toBe(true);
    expect(atLeast.isProvisional).toBe(false);
  });

  it('같은 유저의 표가 여러 개여도 참여자 수는 1로 센다', () => {
    const result = computeScore([vote({ userId: 'same' }), vote({ userId: 'same' })], NOW);
    expect(result.distinctVoters).toBe(1);
  });

  it('비추천이 많으면 점수가 내려간다', () => {
    const positive = computeScore(upvotes(20), NOW);
    const mixed = computeScore(
      [...upvotes(20), ...Array.from({ length: 20 }, (_, i) => vote({ type: 'DOWN', userId: `d${i}` }))],
      NOW,
    );
    expect(mixed.score).toBeLessThan(positive.score);
  });
});

describe('rankItems', () => {
  const entry = (itemId: string, score: number, voters: number, createdAt: Date) => ({
    itemId,
    createdAt,
    breakdown: { ...computeScore([], NOW), score, distinctVoters: voters },
  });

  it('점수 내림차순으로 정렬한다', () => {
    const ranked = rankItems([
      entry('low', 10, 5, NOW),
      entry('high', 90, 5, NOW),
      entry('mid', 50, 5, NOW),
    ]);
    expect(ranked.map((r) => r.itemId)).toEqual(['high', 'mid', 'low']);
  });

  it('동점이면 참여 인원이 많은 쪽이 앞선다', () => {
    const ranked = rankItems([entry('few', 50, 5, NOW), entry('many', 50, 40, NOW)]);
    expect(ranked[0].itemId).toBe('many');
  });

  it('점수와 참여 인원이 같으면 먼저 등록된 쪽이 앞선다', () => {
    const ranked = rankItems([entry('new', 50, 5, NOW), entry('old', 50, 5, daysAgo(100))]);
    expect(ranked[0].itemId).toBe('old');
  });

  it('완전 동률이면 결정론적으로 같은 순서를 낸다', () => {
    const input = [entry('b', 50, 5, NOW), entry('a', 50, 5, NOW)];
    expect(rankItems(input).map((r) => r.itemId)).toEqual(['a', 'b']);
    expect(rankItems([...input].reverse()).map((r) => r.itemId)).toEqual(['a', 'b']);
  });

  it('입력 배열을 변형하지 않는다', () => {
    const input = [entry('b', 10, 5, NOW), entry('a', 90, 5, NOW)];
    rankItems(input);
    expect(input[0].itemId).toBe('b');
  });
});

describe('computeMomentum', () => {
  it('최근 30일 지지가 그 이전보다 많으면 양수다', () => {
    const votes = [...upvotes(10, daysAgo(5)), ...upvotes(2, daysAgo(45))];
    expect(computeMomentum(votes, NOW)).toBeGreaterThan(0);
  });

  it('식어가는 항목은 음수다', () => {
    const votes = [...upvotes(2, daysAgo(5)), ...upvotes(10, daysAgo(45))];
    expect(computeMomentum(votes, NOW)).toBeLessThan(0);
  });

  it('두 기간보다 오래된 표는 무시한다', () => {
    expect(computeMomentum(upvotes(50, daysAgo(200)), NOW)).toBe(0);
  });
});
