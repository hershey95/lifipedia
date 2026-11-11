import { describe, expect, it } from 'vitest';
import { categoryPath, isLeaf, planReassignment, type CategoryNode } from '@/lib/taxonomy';

const cats: CategoryNode[] = [
  { id: 'camp', parentId: null },
  { id: 'tent', parentId: 'camp' },
  { id: 'pack', parentId: 'tent' },
  { id: 'chair', parentId: 'camp' },
];

describe('categoryPath', () => {
  it('루트부터 자기까지 id 를 돌려준다', () => {
    expect(categoryPath('pack', cats)).toEqual(['camp', 'tent', 'pack']);
    expect(categoryPath('camp', cats)).toEqual(['camp']);
  });
  it('없는 id·순환·깊이 3 초과는 null', () => {
    expect(categoryPath('nope', cats)).toBeNull();
    expect(categoryPath('a', [{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }])).toBeNull();
    const deep = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
      { id: '4', parentId: '3' },
    ];
    expect(categoryPath('4', deep)).toBeNull();
  });
});

describe('isLeaf', () => {
  it('자식이 없으면 리프', () => {
    expect(isLeaf('pack', cats)).toBe(true);
    expect(isLeaf('chair', cats)).toBe(true);
    expect(isLeaf('tent', cats)).toBe(false);
  });
});

describe('planReassignment', () => {
  const items = [
    { id: 'i1', themeId: 'old1' },
    { id: 'i2', themeId: 'pack' },
    { id: 'i3', themeId: 'old3' },
    { id: 'i4', themeId: 'old4' },
  ];
  it('이동·제자리·미매핑을 구분하고, 비리프 대상은 미매핑으로 둔다', () => {
    const plan = planReassignment(items, { i1: 'chair', i2: 'pack', i4: 'tent' }, cats);
    expect(plan.moves).toEqual([{ itemId: 'i1', from: 'old1', to: 'chair' }]);
    expect(plan.unchanged).toEqual(['i2']);
    expect(plan.unmapped.sort()).toEqual(['i3', 'i4']);
  });
});
