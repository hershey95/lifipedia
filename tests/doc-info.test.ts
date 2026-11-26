import { describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();
const count = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { editHistory: { findMany: (a: unknown) => findMany(a) }, item: { count: (a: unknown) => count(a) } },
}));

import { loadDocInfo } from '@/lib/doc-info';

describe('문서 정보', () => {
  it('편집자 수는 탈퇴(null)를 뺀 서로 다른 사람, 역링크 수는 상한 없이 센다', async () => {
    findMany.mockResolvedValue([{ editorId: 'a' }, { editorId: 'b' }]);
    count.mockResolvedValue(31);
    expect(await loadDocInfo({ id: 'i1', name: '랜턴' })).toEqual({ editorCount: 2, backlinkCount: 31 });
    expect(findMany).toHaveBeenCalledWith({
      where: { itemId: 'i1', editorId: { not: null } },
      distinct: ['editorId'],
      select: { editorId: true },
    });
    const where = count.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: { not: 'i1' }, isRemoved: false, theme: { status: 'ACTIVE' } });
    expect(JSON.stringify(where.OR)).toContain('[[랜턴]]');
  });
});
