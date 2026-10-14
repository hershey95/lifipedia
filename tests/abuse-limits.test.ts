import { describe, expect, it } from 'vitest';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';

describe('생성·댓글·신고 한도', () => {
  it('문서 생성은 하루 ITEMS_PER_DAY 건까지', () => {
    expect(checkRate(ABUSE_LIMITS.ITEMS_PER_DAY - 1, ABUSE_LIMITS.ITEMS_PER_DAY, 86_400).allowed).toBe(true);
    const r = checkRate(ABUSE_LIMITS.ITEMS_PER_DAY, ABUSE_LIMITS.ITEMS_PER_DAY, 86_400);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBe(86_400);
  });
  it('한도는 신뢰도 파밍을 막을 만큼 작다 (100건 도달에 10일 이상)', () => {
    expect(100 / ABUSE_LIMITS.ITEMS_PER_DAY).toBeGreaterThanOrEqual(10);
  });
});
