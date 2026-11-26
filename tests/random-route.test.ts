import { afterEach, describe, expect, it, vi } from 'vitest';

const count = vi.fn();
const findMany = vi.fn();
vi.mock('@/lib/db', () => ({ prisma: { item: { count: (a: unknown) => count(a), findMany: (a: unknown) => findMany(a) } } }));
// next/navigation 의 redirect 는 예외를 던진다(기본 307). 목적지만 확인한다.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

import { GET } from '@/app/random/route';

const get = (query = '') => GET(new Request(`http://localhost/random${query}`));
const visible = { isRemoved: false, theme: { status: 'ACTIVE' } };

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('GET /random', () => {
  it('삭제되지 않은 ACTIVE 분류의 문서 중 하나로 보낸다 (한글 슬러그는 인코딩)', async () => {
    count.mockResolvedValue(3);
    findMany.mockResolvedValue([{ slug: '랜턴', theme: { slug: '캠핑' } }]);
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    await expect(get()).rejects.toThrow(`redirect:/theme/${encodeURIComponent('캠핑')}/item/${encodeURIComponent('랜턴')}`);
    expect(count).toHaveBeenCalledWith({ where: visible });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: visible, skip: 2, take: 1 }));
  });
  it('category 는 분류 갤러리 slug 로 거른다', async () => {
    count.mockResolvedValue(0);
    await expect(get('?category=camping')).rejects.toThrow('redirect:/contribute');
    expect(count).toHaveBeenCalledWith({ where: { isRemoved: false, theme: { status: 'ACTIVE', slug: 'camping' } } });
  });
  it('형식이 틀린 category 는 무시한다', async () => {
    count.mockResolvedValue(0);
    await expect(get('?category=%27%20OR')).rejects.toThrow('redirect:/contribute');
    expect(count).toHaveBeenCalledWith({ where: visible });
  });
  it('문서가 없으면 기여할 거리로 보낸다', async () => {
    count.mockResolvedValue(0);
    await expect(get()).rejects.toThrow('redirect:/contribute');
    expect(findMany).not.toHaveBeenCalled();
  });
});
