/**
 * 위키 편집 — 편집 이력과 동시 편집 충돌 처리.
 */
import { createTwoFilesPatch } from 'diff';

/** 편집 이력에 남기고 되돌릴 수 있는 필드들 */
export const EDITABLE_FIELDS = [
  'name',
  'tier',
  'priceKrw',
  'description',
  'specSummary',
  'recommendReason',
  'imageUrl',
  'purchaseLinks',
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type ItemSnapshot = Record<EditableField, unknown>;

export function toSnapshot(item: Record<string, unknown>): ItemSnapshot {
  const out = {} as ItemSnapshot;
  for (const field of EDITABLE_FIELDS) out[field] = item[field] ?? null;
  return out;
}

function render(snapshot: ItemSnapshot): string {
  return EDITABLE_FIELDS.map((field) => {
    const value = snapshot[field];
    const text = value === null || value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return `## ${field}\n${text}\n`;
  }).join('\n');
}

/** 두 리비전 사이의 unified diff. 편집 이력 화면에 그대로 표시된다. */
export function buildDiff(before: ItemSnapshot, after: ItemSnapshot, fromRevision: number, toRevision: number): string {
  return createTwoFilesPatch(
    `revision ${fromRevision}`,
    `revision ${toRevision}`,
    render(before),
    render(after),
    undefined,
    undefined,
    { context: 3 },
  );
}

export function changedFields(before: ItemSnapshot, after: ItemSnapshot): EditableField[] {
  return EDITABLE_FIELDS.filter((f) => JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null));
}

export type ConflictResult =
  | { status: 'clean'; merged: ItemSnapshot }
  | { status: 'stale-but-mergeable'; merged: ItemSnapshot; alsoChangedByOthers: EditableField[] }
  | { status: 'conflict'; conflictingFields: EditableField[] };

/**
 * 동시 편집 처리.
 *  - 내가 본 리비전이 최신이면 그대로 저장한다.
 *  - 그 사이 남이 '다른 필드'만 고쳤다면 필드 단위로 자동 병합한다.
 *  - 남과 내가 '같은 필드'를 고쳤다면 충돌로 돌려보내 유저가 직접 해결하게 한다.
 */
export function resolveEdit(params: {
  /** 편집자가 폼을 열 때 본 버전 */
  base: ItemSnapshot;
  /** 편집자가 제출한 버전 */
  incoming: ItemSnapshot;
  /** DB 의 현재 최신 버전 */
  current: ItemSnapshot;
}): ConflictResult {
  const mine = changedFields(params.base, params.incoming);
  const theirs = changedFields(params.base, params.current);

  const overlapping = mine.filter((f) => theirs.includes(f));
  const trulyConflicting = overlapping.filter(
    (f) => JSON.stringify(params.incoming[f] ?? null) !== JSON.stringify(params.current[f] ?? null),
  );

  if (trulyConflicting.length > 0) {
    return { status: 'conflict', conflictingFields: trulyConflicting };
  }

  const merged = { ...params.current };
  for (const field of mine) merged[field] = params.incoming[field];

  if (theirs.length === 0) return { status: 'clean', merged };
  return { status: 'stale-but-mergeable', merged, alsoChangedByOthers: theirs };
}
