import { describe, expect, it } from 'vitest';
import { changeKind, decodeCursor, encodeCursor, recentWhere } from '@/lib/recent';

describe('recent', () => {
  it('변경 종류', () => {
    expect(changeKind(1, null)).toBe('create');
    expect(changeKind(4, null)).toBe('edit');
    expect(changeKind(4, 2)).toBe('revert');
  });
  it('커서 왕복', () => {
    const d = new Date('2026-10-15T01:02:03.456Z');
    expect(decodeCursor(encodeCursor(d, 'cabc123'))).toEqual({ createdAt: d, id: 'cabc123' });
  });
  it('잘못된 커서는 null', () => {
    for (const bad of [undefined, '', 'x', '1_', "1_a'b", 'abc_def', '1_a_b']) expect(decodeCursor(bad)).toBeNull();
  });
  it('recentWhere: 기본은 필터 없음', () => {
    expect(recentWhere(null, null)).toEqual({ item: { isRemoved: false } });
  });
  it('recentWhere: 커서와 주시목록 OR 가 AND 로 함께 남는다', () => {
    const w = recentWhere({ createdAt: new Date(0), id: 'a' }, 'u1') as any;
    expect(w.AND).toHaveLength(2);
    expect(w.OR).toBeUndefined();
    expect(w.item.theme.followers.some.userId).toBe('u1');
    expect(JSON.stringify(w.AND[1])).toContain('"not":"u1"');
  });
});
