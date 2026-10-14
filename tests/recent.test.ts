import { describe, expect, it } from 'vitest';
import { changeKind, decodeCursor, encodeCursor } from '@/lib/recent';

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
});
