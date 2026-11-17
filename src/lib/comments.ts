/**
 * 댓글·게시판 글 공통 규칙 (순수 함수, prisma 를 import 하지 않는다).
 * 토론 댓글(TalkComment)과 게시판(Post·PostComment)이 같은 규칙을 쓴다. 랭킹·신뢰도에는 들어가지 않는다.
 * 설계: docs/design/2026-W45-comment-vote-notify.md 4.2, 2026-W48-board-taxonomy.md 7.2
 */
import { RANKING_CONSTANTS, wilsonLowerBound } from '@/lib/ranking';

export const COMMENT_RULES = { MAX_PER_ITEM_FETCH: 500, MAX_DEPTH: 8 } as const;
export const CONCEPT_RULES = {
  MIN_WEIGHTED_UP: 8.0,
  MIN_DISTINCT_UPVOTERS: 5,
  MIN_WILSON: 0.6,
  WINDOW_DAYS: 7,
  /** 표를 던진 시점에 계정 나이가 이 일수 미만이면 개념글 집계에서 뺀다 */
  MIN_VOTER_ACCOUNT_DAYS: 7,
} as const;

const DAY_MS = 86_400_000;
const cap = (w: number) => Math.min(w, RANKING_CONSTANTS.MAX_VOTE_WEIGHT);

export type CommentVoteInput = {
  type: 'UP' | 'DOWN';
  weight: number;
  userId: string;
  createdAt: Date;
  voterCreatedAt: Date;
};

/** 행 수와 가중 Wilson 하한. 시간 감쇠는 없다(토론은 오래돼도 가치가 있다). */
export function commentTally(votes: CommentVoteInput[]): { upCount: number; downCount: number; bestScore: number } {
  let up = 0;
  let down = 0;
  let wUp = 0;
  let wDown = 0;
  for (const x of votes) {
    if (x.type === 'UP') {
      up += 1;
      wUp += cap(x.weight);
    } else {
      down += 1;
      wDown += cap(x.weight);
    }
  }
  return { upCount: up, downCount: down, bestScore: wilsonLowerBound(wUp, wUp + wDown) };
}

/** 최상위 댓글만 대상. 작성 후 7일 안의, 투표 시점 계정 나이 7일 이상인 표로 세 조건을 모두 만족해야 참. */
export function isConcept(comment: { createdAt: Date; parentId: string | null }, votes: CommentVoteInput[]): boolean {
  if (comment.parentId !== null) return false;
  const until = comment.createdAt.getTime() + CONCEPT_RULES.WINDOW_DAYS * DAY_MS;
  const valid = votes.filter(
    (x) =>
      x.createdAt.getTime() <= until &&
      x.createdAt.getTime() - x.voterCreatedAt.getTime() >= CONCEPT_RULES.MIN_VOTER_ACCOUNT_DAYS * DAY_MS,
  );
  const upVoters = new Set(valid.filter((x) => x.type === 'UP').map((x) => x.userId));
  const wUp = valid.filter((x) => x.type === 'UP').reduce((s, x) => s + cap(x.weight), 0);
  const wDown = valid.filter((x) => x.type === 'DOWN').reduce((s, x) => s + cap(x.weight), 0);
  return (
    wUp >= CONCEPT_RULES.MIN_WEIGHTED_UP &&
    upVoters.size >= CONCEPT_RULES.MIN_DISTINCT_UPVOTERS &&
    wilsonLowerBound(wUp, wUp + wDown) >= CONCEPT_RULES.MIN_WILSON
  );
}

export type CommentSort = 'best' | 'new' | 'old';
const SORTS: readonly CommentSort[] = ['best', 'new', 'old'];
export function parseCommentSort(v: unknown): CommentSort {
  return SORTS.find((s) => s === v) ?? 'best';
}

export type FlatComment = { id: string; parentId: string | null; isRemoved: boolean; createdAt: Date; bestScore: number };
export type CommentNode<T> = T & { children: CommentNode<T>[]; depth: number };

const SIBLING_ORDER: Record<CommentSort, (a: FlatComment, b: FlatComment) => number> = {
  best: (a, b) =>
    b.bestScore - a.bestScore || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  new: (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
  old: (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
};

/**
 * 평면 목록 → 트리. 부모가 목록에 없는 댓글(고아)은 최상위로 올린다.
 * 깊이가 MAX_DEPTH 를 넘으면 MAX_DEPTH 단계에 평탄화한다.
 * 삭제 댓글은 (살아 있는) 자손이 있으면 남기고, 없으면 뺀다.
 */
export function buildCommentTree<T extends FlatComment>(flat: T[], sort: CommentSort): CommentNode<T>[] {
  const ids = new Set(flat.map((c) => c.id));
  const byParent = new Map<string | null, T[]>();
  for (const c of flat) {
    const key = c.parentId !== null && ids.has(c.parentId) ? c.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const order = SIBLING_ORDER[sort];
  const build = (parent: string | null, depth: number): CommentNode<T>[] =>
    (byParent.get(parent) ?? [])
      .sort(order)
      .map((c) => ({ ...c, depth, children: build(c.id, Math.min(depth + 1, COMMENT_RULES.MAX_DEPTH)) }))
      // 삭제됐고 남은 자식이 없으면 뺀다(아래 가지부터 이미 걸러졌다)
      .filter((n) => !n.isRemoved || n.children.length > 0);
  return build(null, 0);
}
