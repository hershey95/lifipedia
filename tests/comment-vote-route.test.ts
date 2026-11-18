import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, db, count, auth, recompute } = vi.hoisted(() => ({
  tx: {
    commentVote: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    talkComment: { update: vi.fn() },
  },
  db: {
    talkComment: { findUnique: vi.fn() },
    item: { update: vi.fn() },
    $transaction: vi.fn(),
  },
  count: vi.fn(),
  auth: { user: { id: 'u1', trustScore: 1, createdAt: new Date(0), suspendedUntil: null } as Record<string, unknown> | null },
  recompute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/auth', () => ({ currentUser: async () => auth.user, isSuspended: () => false }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), countSince: (...a: unknown[]) => count(...a) }));
vi.mock('@/lib/scoring-service', () => ({ recomputeItemScore: (...a: unknown[]) => recompute(...a) }));

import { POST } from '@/app/api/talk/[commentId]/vote/route';

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const call = (type = 'UP') => POST(req({ type }), { params: Promise.resolve({ commentId: 'c1' }) });
const voter = (userId: string, createdAt = new Date()) => ({ type: 'UP', weight: 1, userId, createdAt, user: { createdAt: new Date(0) } });

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'u1', trustScore: 1, createdAt: new Date(0), suspendedUntil: null };
  count.mockResolvedValue(0);
  db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
  db.talkComment.findUnique.mockResolvedValue({
    id: 'c1', parentId: null, authorId: 'u2', createdAt: new Date(), isRemoved: false, conceptAt: null,
    item: { isRemoved: false, theme: { status: 'ACTIVE' } },
  });
  tx.commentVote.findUnique.mockResolvedValue(null);
  tx.commentVote.findMany.mockResolvedValue([voter('u1')]);
});

describe('POST /api/talk/[commentId]/vote', () => {
  it('신규 created, 같은 방향 removed, 반대 changed', async () => {
    expect((await (await call()).json()).action).toBe('created');
    expect(tx.commentVote.create).toHaveBeenCalledTimes(1);
    tx.commentVote.findUnique.mockResolvedValue({ type: 'UP' });
    expect((await (await call('UP')).json()).action).toBe('removed');
    expect(tx.commentVote.delete).toHaveBeenCalled();
    expect((await (await call('DOWN')).json()).action).toBe('changed');
    expect(tx.commentVote.update).toHaveBeenCalled();
  });

  it('쓰기는 트랜잭션 안에서만, 집계를 갱신하고 랭킹·기여는 건드리지 않는다', async () => {
    const res = await call();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.talkComment.update.mock.calls[0][0].data).toMatchObject({ upCount: 1, downCount: 0 });
    expect(recompute).not.toHaveBeenCalled();
    expect(db.item.update).not.toHaveBeenCalled();
    expect((await res.json()).myVote).toBe('UP');
  });

  it('비로그인 401, 잘못된 본문 400', async () => {
    auth.user = null;
    expect((await call()).status).toBe(401);
    auth.user = { id: 'u1', trustScore: 1, createdAt: new Date(0), suspendedUntil: null };
    expect((await call('SIDEWAYS')).status).toBe(400);
  });

  it('시간당 120표를 넘으면 429', async () => {
    count.mockResolvedValue(120);
    expect((await call()).status).toBe(429);
  });

  it('본인 댓글 403, 비ACTIVE 403, 삭제 댓글 404', async () => {
    db.talkComment.findUnique.mockResolvedValueOnce({
      id: 'c1', parentId: null, authorId: 'u1', createdAt: new Date(), isRemoved: false, conceptAt: null,
      item: { isRemoved: false, theme: { status: 'ACTIVE' } },
    });
    expect((await call()).status).toBe(403);
    db.talkComment.findUnique.mockResolvedValueOnce({
      id: 'c1', parentId: null, authorId: 'u2', createdAt: new Date(), isRemoved: false, conceptAt: null,
      item: { isRemoved: false, theme: { status: 'PROPOSED' } },
    });
    expect((await call()).status).toBe(403);
    db.talkComment.findUnique.mockResolvedValueOnce({
      id: 'c1', parentId: null, authorId: 'u2', createdAt: new Date(), isRemoved: true, conceptAt: null,
      item: { isRemoved: false, theme: { status: 'ACTIVE' } },
    });
    expect((await call()).status).toBe(404);
    expect(tx.commentVote.create).not.toHaveBeenCalled();
  });

  it('개념글 조건을 처음 채우면 conceptAt 을 기록하고 becameConcept 가 참', async () => {
    tx.commentVote.findMany.mockResolvedValue(['a', 'b', 'c', 'd', 'e'].map((u) => ({ ...voter(u), weight: 2 })));
    const body = await (await call()).json();
    expect(body.becameConcept).toBe(true);
    expect(tx.talkComment.update.mock.calls[0][0].data.conceptAt).toBeInstanceOf(Date);
  });

  it('conceptAt 이 이미 있으면 다시 쓰지 않는다', async () => {
    db.talkComment.findUnique.mockResolvedValueOnce({
      id: 'c1', parentId: null, authorId: 'u2', createdAt: new Date(), isRemoved: false, conceptAt: new Date(1),
      item: { isRemoved: false, theme: { status: 'ACTIVE' } },
    });
    tx.commentVote.findMany.mockResolvedValue(['a', 'b', 'c', 'd', 'e'].map((u) => ({ ...voter(u), weight: 2 })));
    const body = await (await call()).json();
    expect(body.becameConcept).toBe(false);
    expect(tx.talkComment.update.mock.calls[0][0].data).not.toHaveProperty('conceptAt');
  });
});
