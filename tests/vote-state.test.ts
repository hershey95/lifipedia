import { describe, expect, it } from 'vitest';
import { applyVote } from '@/lib/vote-state';

const s = (up: number, down: number, mine: 'UP' | 'DOWN' | null) => ({ up, down, mine });

describe('applyVote', () => {
  it.each([
    ['새 추천', s(1, 1, null), 'UP', s(2, 1, 'UP')],
    ['새 비추천', s(1, 1, null), 'DOWN', s(1, 2, 'DOWN')],
    ['같은 버튼은 취소', s(2, 1, 'UP'), 'UP', s(1, 1, null)],
    ['비추천 취소', s(1, 2, 'DOWN'), 'DOWN', s(1, 1, null)],
    ['추천 → 비추천 전환', s(2, 1, 'UP'), 'DOWN', s(1, 2, 'DOWN')],
    ['비추천 → 추천 전환', s(1, 2, 'DOWN'), 'UP', s(2, 1, 'UP')],
  ] as const)('%s', (_, before, type, after) => {
    expect(applyVote(before, type)).toEqual(after);
  });
});
