import { describe, expect, it } from 'vitest';
import { isBotUa, viewDay, markHash, createIpLimiter, VIEW_RULES } from '@/lib/views';

describe('isBotUa', () => {
  it('크롤러·빈 UA 는 봇', () => {
    expect(isBotUa('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUa('curl/8.4.0')).toBe(true);
    expect(isBotUa('')).toBe(true);
    expect(isBotUa(null)).toBe(true);
  });
  it('일반 브라우저는 사람', () => {
    expect(isBotUa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15')).toBe(false);
  });
});

describe('viewDay', () => {
  it('한국 시간 기준 날짜다', () => {
    expect(viewDay(new Date('2026-11-11T15:30:00Z'))).toBe('2026-11-12');
    expect(viewDay(new Date('2026-11-11T14:59:00Z'))).toBe('2026-11-11');
  });
});

describe('markHash', () => {
  it('같은 방문자·날·대상은 같은 해시, 하나라도 다르면 다른 해시', () => {
    const base = markHash('v1', '2026-11-12', 'ITEM', 'a');
    expect(markHash('v1', '2026-11-12', 'ITEM', 'a')).toBe(base);
    expect(markHash('v2', '2026-11-12', 'ITEM', 'a')).not.toBe(base);
    expect(markHash('v1', '2026-11-13', 'ITEM', 'a')).not.toBe(base);
    expect(markHash('v1', '2026-11-12', 'THEME', 'a')).not.toBe(base);
  });
  it('원본 방문자 id 를 해시에 그대로 담지 않는다', () => {
    expect(markHash('visitor-secret', '2026-11-12', 'ITEM', 'a')).not.toContain('visitor-secret');
  });
});

describe('createIpLimiter', () => {
  it('창 안에서 한도를 넘으면 막고, 창이 지나면 다시 허용', () => {
    const lim = createIpLimiter(2, 60_000);
    expect(lim('1.1.1.1', 0)).toBe(true);
    expect(lim('1.1.1.1', 1_000)).toBe(true);
    expect(lim('1.1.1.1', 2_000)).toBe(false);
    expect(lim('2.2.2.2', 2_000)).toBe(true);
    expect(lim('1.1.1.1', 61_000)).toBe(true);
  });
  it('보존 기간 상수가 2일이다', () => {
    expect(VIEW_RULES.MARK_RETENTION_DAYS).toBe(2);
  });
});
