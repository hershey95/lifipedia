/**
 * 조회 지표 (순수 함수, prisma 를 import 하지 않는다). 개인정보를 저장하지 않는다:
 * 방문자별 기록 없이 hash(vid+날+대상) 임시 표식(2일 후 삭제)으로 하루 1인 1회만 센다.
 * 조회수는 정렬 신호일 뿐 문서 점수(ranking.ts)에 넣지 않는다(ADR 0001).
 * 설계: docs/design/2026-W47-taxonomy-situation.md 7.3절
 */
import { createHash } from 'node:crypto';

export const VIEW_RULES = { MARK_RETENTION_DAYS: 2, IP_LIMIT_PER_MINUTE: 60 } as const;
export const VIEW_TARGETS = ['THEME', 'ITEM'] as const; // POST 는 P1 에서 enum 과 함께 추가
export type ViewTargetType = (typeof VIEW_TARGETS)[number];

const BOT = /bot|crawl|spider|slurp|curl|wget|python-requests|httpclient|headless|preview|facebookexternalhit/i;
export function isBotUa(ua: string | null | undefined): boolean {
  return !ua || BOT.test(ua);
}

/** 한국 시간 기준 'YYYY-MM-DD' */
export function viewDay(at: Date = new Date()): string {
  return new Date(at.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

export function markHash(vid: string, day: string, targetType: ViewTargetType, targetId: string): string {
  return createHash('sha256').update([vid, day, targetType, targetId].join('\u0000')).digest('hex');
}

/** IP 별 분당 한도. ponytail: 프로세스 메모리라 인스턴스가 늘면 인스턴스마다 따로 센다. 그때 DB 카운트로 */
export function createIpLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (ip: string, now: number = Date.now()): boolean => {
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(ip, recent);
      return false;
    }
    recent.push(now);
    hits.set(ip, recent);
    return true;
  };
}
