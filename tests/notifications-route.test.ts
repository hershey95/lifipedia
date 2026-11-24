import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, db, count, auth } = vi.hoisted(() => ({
  tx: { talkComment: { create: vi.fn() }, notification: { createMany: vi.fn() } },
  db: {
    item: { findUnique: vi.fn() },
    talkComment: { findUnique: vi.fn() },
    notification: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
  count: vi.fn(),
  auth: { user: { id: 'u1', suspendedUntil: null } as Record<string, unknown> | null },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/auth', () => ({ currentUser: async () => auth.user, isSuspended: () => false }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), countSince: (...a: unknown[]) => count(...a) }));

import { POST as talkPost } from '@/app/api/items/[id]/talk/route';
import { POST as readPost } from '@/app/api/notifications/read/route';

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const PARENT = 'cm0000000000000000000000a';
const talk = (body: unknown) => talkPost(req(body), { params: Promise.resolve({ id: 'i1' }) });

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'u1', suspendedUntil: null };
  count.mockResolvedValue(0);
  db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
  db.item.findUnique.mockResolvedValue({ id: 'i1', isRemoved: false });
  db.talkComment.findUnique.mockResolvedValue({ itemId: 'i1', authorId: 'u2' });
  tx.talkComment.create.mockResolvedValue({ id: 'new1', body: 'x', createdAt: new Date(), parentId: PARENT });
});

describe('POST /api/items/[id]/talk 알림', () => {
  it('답글이면 같은 트랜잭션에서 부모 작성자에게 알림 1건', async () => {
    expect((await talk({ bodyText: 'x', parentId: PARENT })).status).toBe(201);
    expect(tx.notification.createMany.mock.calls[0][0].data).toEqual([
      { userId: 'u2', kind: 'TALK_REPLY', actorId: 'u1', itemId: 'i1', refId: 'new1' },
    ]);
  });

  it('최상위 댓글·내 댓글에 단 답글은 알림 없음', async () => {
    await talk({ bodyText: 'x' });
    db.talkComment.findUnique.mockResolvedValue({ itemId: 'i1', authorId: 'u1' });
    await talk({ bodyText: 'x', parentId: PARENT });
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/notifications/read', () => {
  it('비로그인 401, 본문이 {all:true} 가 아니면 400', async () => {
    auth.user = null;
    expect((await readPost(req({ all: true }))).status).toBe(401);
    auth.user = { id: 'u1' };
    expect((await readPost(req({}))).status).toBe(400);
    expect((await readPost(req({ all: true, userId: 'u9' }))).status).toBe(400);
    expect(db.notification.updateMany).not.toHaveBeenCalled();
  });

  it('내 안 읽은 알림만 읽음 처리', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 3 });
    const res = await readPost(req({ all: true }));
    expect((await res.json()).updated).toBe(3);
    expect(db.notification.updateMany.mock.calls[0][0].where).toEqual({ userId: 'u1', readAt: null });
  });
});
