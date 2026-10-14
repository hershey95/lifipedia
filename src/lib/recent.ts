/** 최근 변경 피드 보조 함수 — 커서(createdAt+id) 인코딩과 변경 종류 판정. */

export type ChangeKind = 'create' | 'edit' | 'revert';

export function changeKind(revision: number, revertOfRevision: number | null): ChangeKind {
  if (revertOfRevision != null) return 'revert';
  return revision === 1 ? 'create' : 'edit';
}

export function encodeCursor(createdAt: Date, id: string): string {
  return `${createdAt.getTime()}_${id}`;
}

/** 잘못된 커서는 null — 호출자는 첫 페이지로 취급한다. */
export function decodeCursor(raw: string | undefined): { createdAt: Date; id: string } | null {
  const m = /^(\d{1,15})_([A-Za-z0-9]{1,40})$/.exec(raw ?? '');
  if (!m) return null;
  const t = Number(m[1]);
  return Number.isFinite(t) ? { createdAt: new Date(t), id: m[2] } : null;
}
