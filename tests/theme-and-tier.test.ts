import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '@/lib/slug';
import { tierFromSlug, validateTierAgainstPeers } from '@/lib/tier';
import { promotionProgress, shouldGoDormant, shouldPromote, THEME_LIFECYCLE, canContribute } from '@/lib/theme-lifecycle';
import { ABUSE_LIMITS, checkRate, looksLikeVoteBurst } from '@/lib/abuse';
import { monthKey, monthRange, previousMonthKey, yearRange } from '@/lib/snapshot';

describe('slugify', () => {
  it('한글을 보존한다', () => {
    expect(slugify('여행 인생템')).toBe('여행-인생템');
  });

  it('특수문자를 제거하고 공백을 하이픈으로 바꾼다', () => {
    expect(slugify('고3 인생템!! (수능)')).toBe('고3-인생템-수능');
  });

  it('영문은 소문자로 바꾼다', () => {
    expect(slugify('Camping Gear')).toBe('camping-gear');
  });

  it('앞뒤 하이픈과 연속 하이픈을 정리한다', () => {
    expect(slugify('  --자취--템--  ')).toBe('자취-템');
  });

  it('사용할 수 있는 문자가 없으면 빈 문자열', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('비어 있으면 그대로 쓴다', () => {
    expect(uniqueSlug('텐트', new Set())).toBe('텐트');
  });

  it('충돌하면 번호를 붙인다', () => {
    expect(uniqueSlug('텐트', new Set(['텐트']))).toBe('텐트-2');
    expect(uniqueSlug('텐트', new Set(['텐트', '텐트-2']))).toBe('텐트-3');
  });

  it('슬러그를 만들 수 없는 이름에는 대체값을 쓴다', () => {
    expect(uniqueSlug('???', new Set())).toBe('item');
  });
});

describe('tierFromSlug', () => {
  it('URL 세그먼트를 enum 으로 바꾼다', () => {
    expect(tierFromSlug('premium')).toBe('PREMIUM');
    expect(tierFromSlug('budget')).toBe('BUDGET');
  });

  it('알 수 없는 값은 null', () => {
    expect(tierFromSlug('luxury')).toBeNull();
  });
});

describe('validateTierAgainstPeers', () => {
  const peers = [10_000, 20_000, 30_000, 100_000, 120_000, 500_000, 600_000, 700_000, 900_000];

  it('비교 표본이 적으면 무조건 통과시킨다', () => {
    expect(validateTierAgainstPeers(999_999, 'BUDGET', [1000, 2000]).ok).toBe(true);
  });

  it('분포에 맞는 태깅은 통과한다', () => {
    expect(validateTierAgainstPeers(15_000, 'BUDGET', peers).ok).toBe(true);
    expect(validateTierAgainstPeers(800_000, 'PREMIUM', peers).ok).toBe(true);
  });

  it('고가 제품을 저가로 태깅하면 되묻는다', () => {
    const result = validateTierAgainstPeers(900_000, 'BUDGET', peers);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.suggestion).toBe('PREMIUM');
  });

  it('테마마다 기준이 다르다 — 절대 금액으로 판단하지 않는다', () => {
    const cheapTheme = [1000, 2000, 3000, 4000, 8000, 9000, 10_000];
    // 같은 5만원이 저렴한 테마에서는 고가다
    const result = validateTierAgainstPeers(50_000, 'BUDGET', cheapTheme);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.suggestion).toBe('PREMIUM');
  });
});

describe('테마 생애주기', () => {
  it('임계치에 도달한 제안 테마만 승격 대상이다', () => {
    expect(shouldPromote({ status: 'PROPOSED', followerCount: 20 }, 20)).toBe(true);
    expect(shouldPromote({ status: 'PROPOSED', followerCount: 19 }, 20)).toBe(false);
  });

  it('이미 정식이거나 휴면인 테마는 다시 승격하지 않는다', () => {
    expect(shouldPromote({ status: 'ACTIVE', followerCount: 999 }, 20)).toBe(false);
    expect(shouldPromote({ status: 'DORMANT', followerCount: 999 }, 20)).toBe(false);
  });

  it('활동이 오래 없는 정식 테마는 휴면 대상이다', () => {
    const now = new Date('2026-09-17T00:00:00Z');
    const stale = new Date(now.getTime() - (THEME_LIFECYCLE.dormantAfterDays + 1) * 86_400_000);
    const fresh = new Date(now.getTime() - 10 * 86_400_000);

    expect(shouldGoDormant({ status: 'ACTIVE', lastActivityAt: stale }, now)).toBe(true);
    expect(shouldGoDormant({ status: 'ACTIVE', lastActivityAt: fresh }, now)).toBe(false);
    expect(shouldGoDormant({ status: 'PROPOSED', lastActivityAt: stale }, now)).toBe(false);
  });

  it('승격 진행률을 계산한다', () => {
    const progress = promotionProgress(5, 20);
    expect(progress.remaining).toBe(15);
    expect(progress.ratio).toBeCloseTo(0.25, 6);
  });

  it('임계치를 넘겨도 진행률은 1을 넘지 않는다', () => {
    expect(promotionProgress(100, 20).ratio).toBe(1);
  });

  it('정식 테마에서만 기여할 수 있다', () => {
    expect(canContribute('ACTIVE')).toBe(true);
    expect(canContribute('PROPOSED')).toBe(false);
    expect(canContribute('DORMANT')).toBe(false);
  });
});

describe('어뷰징 방지', () => {
  it('한도 미만이면 허용한다', () => {
    expect(checkRate(5, 40, 3600).allowed).toBe(true);
  });

  it('한도에 도달하면 차단하고 사유를 준다', () => {
    const result = checkRate(40, 40, 3600);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('짧은 시간에 몰린 투표를 감지한다', () => {
    const now = new Date('2026-09-17T00:00:00Z');
    const burst = Array.from(
      { length: ABUSE_LIMITS.BURST_VOTE_THRESHOLD },
      (_, i) => new Date(now.getTime() - i * 1000),
    );
    expect(looksLikeVoteBurst(burst, now)).toBe(true);
  });

  it('시간을 두고 나눠 한 투표는 감지하지 않는다', () => {
    const now = new Date('2026-09-17T00:00:00Z');
    const spread = Array.from({ length: 20 }, (_, i) => new Date(now.getTime() - i * 10 * 60_000));
    expect(looksLikeVoteBurst(spread, now)).toBe(false);
  });
});

describe('스냅샷 기간 계산', () => {
  it('월 키를 만든다', () => {
    expect(monthKey(new Date('2026-09-17T00:00:00Z'))).toBe('2026-09');
    expect(monthKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
  });

  it('직전 달을 구하고 연초에는 전년 12월로 넘어간다', () => {
    expect(previousMonthKey(new Date('2026-09-17T00:00:00Z'))).toBe('2026-08');
    expect(previousMonthKey(new Date('2026-01-05T00:00:00Z'))).toBe('2025-12');
  });

  it('월 범위는 반열린 구간이다', () => {
    const { from, until } = monthRange('2026-02');
    expect(from.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(until.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('연 범위는 해당 연도 전체다', () => {
    const { from, until } = yearRange('2024');
    expect(from.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(until.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });
});
