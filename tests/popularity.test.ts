import { describe, expect, it } from 'vitest';
import { popularity, sortByPopularity, POPULARITY_RULES } from '@/lib/popularity';

const now = new Date('2026-11-11T00:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe('popularity', () => {
  it('30일 안의 투표 가중치 합 + 2×편집 + 댓글', () => {
    const p = popularity(
      {
        votes: [
          { weight: 1, createdAt: daysAgo(1) },
          { weight: 0.5, createdAt: daysAgo(29) },
          { weight: 9, createdAt: daysAgo(31) }, // 창 밖
        ],
        editCount: 3,
        commentCount: 4,
      },
      now,
    );
    expect(p).toBeCloseTo(1.5 + 6 + 4);
  });
  it('조회 항은 데이터가 30일 이상 쌓인 뒤에만 0.1 배로 더한다', () => {
    const base = { votes: [], editCount: 0, commentCount: 0, views: 100 };
    expect(popularity({ ...base, viewsTrackedDays: 10 }, now)).toBe(0);
    expect(popularity({ ...base, viewsTrackedDays: 30 }, now)).toBeCloseTo(100 * POPULARITY_RULES.VIEW_WEIGHT);
    expect(popularity(base, now)).toBe(0); // 조회 지표 없음 → 0
  });
});

describe('sortByPopularity', () => {
  it('점수 내림차순, 동점은 팔로워 많은 순, 그래도 같으면 id 순(재현 가능)', () => {
    const r = sortByPopularity([
      { id: 'b', score: 5, followerCount: 1 },
      { id: 'a', score: 5, followerCount: 1 },
      { id: 'c', score: 5, followerCount: 9 },
      { id: 'd', score: 7, followerCount: 0 },
    ]);
    expect(r.map((x) => x.id)).toEqual(['d', 'c', 'a', 'b']);
  });
});
