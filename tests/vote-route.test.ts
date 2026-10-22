import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, db, recompute, burst } = vi.hoisted(() => ({
  tx: {
    vote: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    theme: { update: vi.fn() },
  },
  db: {
    item: { findUnique: vi.fn() },
    vote: { findMany: vi.fn() },
    report: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  recompute: vi.fn(),
  burst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/auth', () => ({
  currentUser: async () => ({ id: 'u1', trustScore: 1, createdAt: new Date(0), suspendedUntil: null }),
  isSuspended: () => false,
}));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), countSince: async () => 0 }));
vi.mock('@/lib/abuse', async (orig) => ({
  ...(await orig<typeof import('@/lib/abuse')>()),
  looksLikeVoteBurst: (d: Date[]) => burst(d),
}));
vi.mock('@/lib/scoring-service', () => ({ recomputeItemScore: (...a: unknown[]) => recompute(...a) }));

import { POST } from '@/app/api/items/[id]/vote/route';

const call = (type = 'UP') =>
  POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ type }) }), {
    params: Promise.resolve({ id: 'i1' }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.item.findUnique.mockResolvedValue({ id: 'i1', isRemoved: false, theme: { id: 't1', status: 'ACTIVE' } });
  db.vote.findMany.mockResolvedValue([{ createdAt: new Date() }]);
  db.report.findFirst.mockResolvedValue(null);
  db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
  tx.vote.findUnique.mockResolvedValue(null);
  recompute.mockResolvedValue({ rawUpCount: 1, rawDownCount: 0 });
  burst.mockReturnValue(false);
});

describe('POST /api/items/[id]/vote', () => {
  it('쓰기와 점수 재계산은 트랜잭션 안에서만 일어난다', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(tx.vote.create).toHaveBeenCalledTimes(1);
    expect(recompute.mock.calls[0][2]).toBe(tx);
    expect(tx.theme.update).toHaveBeenCalledTimes(1);
  });
  it('같은 방향 재투표는 removed, 반대 방향은 changed', async () => {
    tx.vote.findUnique.mockResolvedValue({ type: 'UP' });
    expect((await (await call('UP')).json()).action).toBe('removed');
    expect(tx.vote.delete).toHaveBeenCalled();
    expect((await (await call('DOWN')).json()).action).toBe('changed');
    expect(tx.vote.update).toHaveBeenCalled();
  });
  it('동시 요청의 P2002 는 409', async () => {
    db.$transaction.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
    expect((await call()).status).toBe(409);
  });
  it('몰림 신고는 USER 대상 OPEN 1건만 만든다', async () => {
    burst.mockReturnValue(true);
    await call();
    expect(db.report.create).toHaveBeenCalledTimes(1);
    expect(db.report.create.mock.calls[0][0].data).toMatchObject({
      targetType: 'USER',
      targetId: 'u1',
      reason: 'AUTOMATED_VOTE_BURST',
    });
    db.report.create.mockClear();
    db.report.findFirst.mockResolvedValue({ id: 'r1' });
    await call();
    expect(db.report.create).not.toHaveBeenCalled();
  });
});
