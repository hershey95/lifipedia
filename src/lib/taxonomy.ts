/**
 * 분류 갤러리 트리 (순수 함수, prisma 를 import 하지 않는다).
 * 설계: docs/design/2026-W47-taxonomy-situation.md 1·5절
 */
export const MAX_CATEGORY_DEPTH = 3; // 대→중→소

export type CategoryNode = { id: string; parentId: string | null };

/** 루트→자기 id 배열. 없는 id·순환·깊이 초과는 null. */
export function categoryPath(id: string, cats: CategoryNode[]): string[] | null {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const path: string[] = [];
  let cur = byId.get(id);
  while (cur) {
    if (path.includes(cur.id) || path.length >= MAX_CATEGORY_DEPTH) return null;
    path.unshift(cur.id);
    if (cur.parentId === null) return path;
    cur = byId.get(cur.parentId);
  }
  return null; // 부모가 없는 id 를 가리킴
}

export function isLeaf(id: string, cats: CategoryNode[]): boolean {
  return !cats.some((c) => c.parentId === id);
}

/** 문서를 리프 분류로 옮기는 계획. 비리프·없는 분류가 대상이면 미매핑(사람 확인)으로 둔다. */
export function planReassignment(
  items: { id: string; themeId: string }[],
  mapping: Record<string, string>,
  cats: CategoryNode[],
) {
  const moves: { itemId: string; from: string; to: string }[] = [];
  const unchanged: string[] = [];
  const unmapped: string[] = [];
  for (const it of items) {
    const to = mapping[it.id];
    if (!to || !cats.some((c) => c.id === to) || !isLeaf(to, cats)) unmapped.push(it.id);
    else if (to === it.themeId) unchanged.push(it.id);
    else moves.push({ itemId: it.id, from: it.themeId, to });
  }
  return { moves, unchanged, unmapped };
}
