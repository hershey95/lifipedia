import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: {
    theme: { count: vi.fn() },
    item: { count: vi.fn() },
    viewMark: { create: vi.fn() },
    pageView: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { POST } from '@/app/api/views/route';

const BROWSER = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15';
// 한도기는 모듈 수준 상태라 사례마다 다른 IP 를 쓴다
let n = 0;
const call = (body: unknown, headers: Record<string, string> = {}, ip = `10.0.0.${++n}`) =>
  POST(
    new Request('http://x/api/views', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'user-agent': BROWSER, 'x-forwarded-for': ip, ...headers },
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  db.theme.count.mockResolvedValue(1);
  db.item.count.mockResolvedValue(1);
  db.viewMark.create.mockReturnValue('mark');
  db.pageView.upsert.mockReturnValue('pv');
  db.$transaction.mockResolvedValue([]);
});

describe('POST /api/views', () => {
  it('잘못된 본문은 400', async () => {
    expect((await call({ targetType: 'USER', targetId: 'a' })).status).toBe(400);
    expect((await call({ targetType: 'ITEM' })).status).toBe(400);
  });

  it('봇 UA 는 202 counted:false 이고 DB 를 건드리지 않는다', async () => {
    const res = await call({ targetType: 'ITEM', targetId: 'i1' }, { 'user-agent': 'Googlebot/2.1' });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ counted: false });
    expect(db.item.count).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('없는 대상은 202 counted:false 이고 표식을 만들지 않는다', async () => {
    db.item.count.mockResolvedValue(0);
    const res = await call({ targetType: 'ITEM', targetId: 'nope' });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ counted: false });
    expect(db.viewMark.create).not.toHaveBeenCalled();
  });

  it('첫 방문은 vid 쿠키를 심고 Secure 는 https 일 때만 붙는다', async () => {
    const plain = (await call({ targetType: 'THEME', targetId: 't1' })).headers.get('set-cookie') ?? '';
    expect(plain).toMatch(/^vid=/);
    expect(plain).toContain('HttpOnly');
    expect(plain).not.toContain('Secure');
    const https = (await call({ targetType: 'THEME', targetId: 't1' }, { 'x-forwarded-proto': 'https' })).headers.get('set-cookie') ?? '';
    expect(https).toContain('Secure');
  });

  it('같은 날 재방문(P2002)은 500 이 아니라 202 counted:false', async () => {
    db.$transaction.mockRejectedValue({ code: 'P2002' });
    const res = await call({ targetType: 'ITEM', targetId: 'i1' }, { cookie: 'vid=aaaaaaaaaaaaaaaaaaaa' });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ counted: false });
  });

  it('센 방문은 counted:true', async () => {
    const res = await call({ targetType: 'ITEM', targetId: 'i1' });
    expect(await res.json()).toEqual({ counted: true });
  });

  it('같은 IP 의 61번째 요청은 429', async () => {
    const ip = '203.0.113.9';
    for (let i = 0; i < 60; i++) await call({ targetType: 'ITEM', targetId: 'i1' }, {}, ip);
    expect((await call({ targetType: 'ITEM', targetId: 'i1' }, {}, ip)).status).toBe(429);
  });
});
