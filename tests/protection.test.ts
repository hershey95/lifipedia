import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canEditAt,
  requiredProtection,
  userLevel,
  type ProtectionLevel,
  type ProtectionSignals,
} from '@/lib/protection';

const sig = (o: Partial<ProtectionSignals> = {}): ProtectionSignals => ({
  recentReverts: 0,
  isTopRank: false,
  openReporters: 0,
  ...o,
});

describe('requiredProtection', () => {
  it('되돌리기 횟수 경계', () => {
    expect(requiredProtection(sig({ recentReverts: 2 })).level).toBe('NONE');
    expect(requiredProtection(sig({ recentReverts: 3 })).level).toBe('SEMI');
    expect(requiredProtection(sig({ recentReverts: 5 })).level).toBe('SEMI');
    expect(requiredProtection(sig({ recentReverts: 6 })).level).toBe('EXTENDED');
  });
  it('1위만 SEMI, 신고자 3명부터 SEMI', () => {
    expect(requiredProtection(sig({ isTopRank: true }))).toEqual({ level: 'SEMI', reasons: ['TOP_RANK'] });
    expect(requiredProtection(sig({ openReporters: 2 })).level).toBe('NONE');
    expect(requiredProtection(sig({ openReporters: 3 }))).toEqual({ level: 'SEMI', reasons: ['REPORTS'] });
  });
  it('가장 높은 단계와 모든 사유를 고정 순서로 낸다', () => {
    expect(requiredProtection(sig({ recentReverts: 6, isTopRank: true }))).toEqual({
      level: 'EXTENDED',
      reasons: ['EDIT_WAR', 'TOP_RANK'],
    });
    expect(requiredProtection(sig())).toEqual({ level: 'NONE', reasons: [] });
  });
});

describe('userLevel', () => {
  const now = new Date('2026-10-26T00:00:00Z');
  const aged = (days: number) => new Date(now.getTime() - days * 86_400_000);
  it('경계', () => {
    expect(userLevel({ createdAt: aged(3.99), contributionCount: 100 }, now)).toBe('NONE');
    expect(userLevel({ createdAt: aged(4), contributionCount: 5 }, now)).toBe('SEMI');
    expect(userLevel({ createdAt: aged(4), contributionCount: 4 }, now)).toBe('NONE');
    expect(userLevel({ createdAt: aged(30), contributionCount: 25 }, now)).toBe('EXTENDED');
    expect(userLevel({ createdAt: aged(29.9), contributionCount: 999 }, now)).toBe('SEMI');
  });
  it('이상한 입력은 NONE', () => {
    expect(userLevel({ createdAt: aged(40), contributionCount: NaN }, now)).toBe('NONE');
    expect(userLevel({ createdAt: aged(-1), contributionCount: 100 }, now)).toBe('NONE');
    expect(userLevel({ createdAt: new Date(NaN), contributionCount: 100 }, now)).toBe('NONE');
  });
});

describe('canEditAt', () => {
  const L: ProtectionLevel[] = ['NONE', 'SEMI', 'EXTENDED'];
  it('3x3 표', () => {
    for (const [ri, req] of L.entries()) for (const [ui, usr] of L.entries()) expect(canEditAt(req, usr)).toBe(ui >= ri);
  });
});

// ---- 라우트: 보호 미달이면 트랜잭션 전에 403
const { db, protect } = vi.hoisted(() => ({
  db: {
    item: { findUnique: vi.fn() },
    editHistory: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  protect: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ prisma: db }));
const me = { id: 'u1', createdAt: new Date(), contributionCount: 10, trustScore: 1, suspendedUntil: null };
vi.mock('@/lib/auth', () => ({ currentUser: async () => me, isSuspended: () => false }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), countSince: async () => 0 }));
vi.mock('@/lib/protection-service', () => ({ loadProtection: (...a: unknown[]) => protect(...a) }));

import { POST as edit } from '@/app/api/items/[id]/edit/route';
import { POST as revert } from '@/app/api/items/[id]/revert/route';

const ctx = { params: Promise.resolve({ id: 'i1' }) };
type Route = (r: Request, c: typeof ctx) => Promise<Response>;
const post = (route: Route, body: unknown) =>
  route(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), ctx);
const editBody = { baseRevision: 1, name: 'n', tier: 'MID', description: '0123456789', purchaseLinks: [] };

beforeEach(() => {
  vi.clearAllMocks();
  db.item.findUnique.mockResolvedValue({
    id: 'i1', themeId: 't1', tier: 'MID', isRemoved: false, revision: 2, theme: { id: 't1', status: 'ACTIVE' },
  });
});

describe('보호 수준 403', () => {
  // me: 계정 0일 → userLevel NONE
  for (const [name, route, body] of [
    ['edit', edit, editBody],
    ['revert', revert, { toRevision: 1, baseRevision: 2 }],
  ] as const) {
    it(`${name}: 반보호에서 신규 계정은 403 이고 쓰기가 없다`, async () => {
      protect.mockResolvedValue({ level: 'SEMI', reasons: ['TOP_RANK'], signals: sig({ isTopRank: true }) });
      const res = await post(route, body);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.protection).toEqual({ required: 'SEMI', reasons: ['TOP_RANK'], userLevel: 'NONE' });
      expect(db.$transaction).not.toHaveBeenCalled();
    });
    it(`${name}: 보호가 없으면 보호 검사를 통과해 다음 단계로 간다`, async () => {
      protect.mockResolvedValue({ level: 'NONE', reasons: [], signals: sig() });
      const res = await post(route, body);
      expect(res.status).not.toBe(403 as number);
    });
  }
});
