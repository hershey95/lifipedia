import { beforeEach, describe, expect, it, vi } from 'vitest';

const update = vi.fn();
const currentUser = vi.fn();
vi.mock('@/lib/db', () => ({ prisma: { user: { update: (a: unknown) => update(a) } } }));
vi.mock('@/lib/auth', () => ({
  currentUser: () => currentUser(),
  isSuspended: (u: { suspendedUntil: Date | null }) => !!u.suspendedUntil && u.suspendedUntil > new Date(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { PATCH } from '@/app/api/me/route';

const req = (body: unknown, raw = false) =>
  new Request('http://x/api/me', { method: 'PATCH', body: raw ? (body as string) : JSON.stringify(body) });
const user = { id: 'u1', trustScore: 1, createdAt: new Date(), suspendedUntil: null };

beforeEach(() => {
  update.mockReset().mockResolvedValue({ name: '철수', bio: null });
  currentUser.mockReset().mockResolvedValue(user);
});

describe('PATCH /api/me', () => {
  it('비로그인은 401, DB 를 건드리지 않는다', async () => {
    currentUser.mockResolvedValue(null);
    expect((await PATCH(req({ name: 'a' }))).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
  it('정지 사용자는 403', async () => {
    currentUser.mockResolvedValue({ ...user, suspendedUntil: new Date(Date.now() + 86_400_000) });
    expect((await PATCH(req({ name: 'a' }))).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
  it('깨진 JSON·빈 본문·모르는 키는 400', async () => {
    expect((await PATCH(req('{bad', true))).status).toBe(400);
    expect((await PATCH(req({}))).status).toBe(400);
    expect((await PATCH(req({ name: 'a', trustScore: 3 }))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
  it('성공하면 세션의 id 로만 name/bio 를 갱신한다', async () => {
    const res = await PATCH(req({ name: ' 철수 ', bio: '' }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: '철수', bio: null },
      select: { name: true, bio: true },
    });
  });
});
