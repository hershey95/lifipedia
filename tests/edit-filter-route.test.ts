import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: {
    item: { findUnique: vi.fn(), findMany: vi.fn() },
    theme: { findUnique: vi.fn() },
    editHistory: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));
const me = { id: 'u1', createdAt: new Date(0), contributionCount: 10, trustScore: 1, suspendedUntil: null };
vi.mock('@/lib/auth', () => ({ currentUser: async () => me, isSuspended: () => false }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), countSince: async () => 0 }));
vi.mock('@/lib/protection-service', () => ({
  loadProtection: async () => ({ level: 'NONE', reasons: [], signals: {} }),
}));

import { POST as edit } from '@/app/api/items/[id]/edit/route';
import { POST as create } from '@/app/api/items/route';

const stored = {
  name: 'n', tier: 'MID', priceKrw: 10_000, description: '0123456789',
  specSummary: null, recommendReason: null, imageUrl: null, purchaseLinks: [],
};
const send = (body: Record<string, unknown>) =>
  edit(new Request('http://x', { method: 'POST', body: JSON.stringify({ baseRevision: 1, ...stored, ...body }) }), {
    params: Promise.resolve({ id: 'i1' }),
  });
const shortLink = [{ label: 'l', url: 'https://bit.ly/x' }];

beforeEach(() => {
  vi.clearAllMocks();
  db.item.findUnique.mockResolvedValue({
    id: 'i1', themeId: 't1', isRemoved: false, revision: 1, theme: { id: 't1', status: 'ACTIVE' }, ...stored,
  });
  db.editHistory.findUnique.mockResolvedValue({ snapshot: stored });
  db.$transaction.mockResolvedValue({ revision: 2 });
});

describe('edit 라우트의 편집 필터', () => {
  it('가격 급변은 422 confirm 이고 쓰기가 없다', async () => {
    const res = await send({ priceKrw: 100_000 });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('confirm');
    expect(json.confirm).toHaveLength(1);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('confirmed 면 저장하고 hint 를 돌려준다', async () => {
    const res = await send({ priceKrw: 100_000, confirmed: true });
    expect(res.status).toBe(200);
    expect((await res.json()).hint).toHaveLength(1);
  });
  it('차단 링크는 confirmed 여도 422 blocked', async () => {
    const res = await send({ purchaseLinks: shortLink, confirmed: true });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('blocked');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('문서 생성 라우트', () => {
  it('차단 링크로 새 문서를 만들어 우회할 수 없다', async () => {
    db.theme.findUnique.mockResolvedValue({ id: 't1', status: 'ACTIVE' });
    db.item.findMany.mockResolvedValue([]);
    const body = { themeSlug: 's', name: 'n', tier: 'MID', description: '0123456789', purchaseLinks: shortLink };
    const res = await create(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('blocked');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
