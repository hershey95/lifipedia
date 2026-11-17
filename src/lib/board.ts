/**
 * 게시판 규칙 (순수 함수, prisma 를 import 하지 않는다).
 * 정렬 키는 feed.ts 의 FEED_ORDER_BY 를 그대로 쓴다(Post 필드 이름을 맞췄다).
 * 설계: docs/design/2026-W48-board-taxonomy.md 7.3
 */
import { z } from 'zod';
import { RANKING_CONSTANTS } from '@/lib/ranking';

export const POST_KINDS = ['QUESTION', 'REVIEW', 'TALK'] as const;
export type PostKindValue = (typeof POST_KINDS)[number];
export const POST_KIND_LABEL: Record<PostKindValue, string> = { QUESTION: '추천 요청', REVIEW: '후기', TALK: '잡담' };
export const BOARD_RULES = { TITLE_MAX: 100, BODY_MAX: 10_000, COMMENT_MAX: 5_000, PAGE_SIZE: 20 } as const;

const SORTS = ['hot', 'new', 'top'] as const;
export type BoardParams = { kind: PostKindValue | null; sort: (typeof SORTS)[number]; page: number };
export const BOARD_DEFAULTS: BoardParams = { kind: null, sort: 'hot', page: 1 };
type Sp = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export function parseBoardParams(sp: Sp): BoardParams {
  const page = Number(one(sp.page));
  return {
    kind: POST_KINDS.find((k) => k === one(sp.kind)) ?? null,
    sort: SORTS.find((s) => s === one(sp.sort)) ?? BOARD_DEFAULTS.sort,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** 기본값인 키는 URL 에서 뺀다. base 에 쿼리가 이미 있으면 & 로 잇는다. */
export function boardHref(base: string, p: Partial<BoardParams>): string {
  const q = new URLSearchParams();
  if (p.kind) q.set('kind', p.kind);
  if (p.sort && p.sort !== BOARD_DEFAULTS.sort) q.set('sort', p.sort);
  if (p.page && p.page > 1) q.set('page', String(p.page));
  const s = q.toString();
  return s ? `${base}${base.includes('?') ? '&' : '?'}${s}` : base;
}

export const ANSWER_RULES = { MAX_ITEMS: 3, MAX_HELPFUL_PER_POST: 3 } as const;

/** 답변이 될 수 있는가: 추천 요청 글의 최상위 댓글만 */
export function isAnswer(post: { kind: PostKindValue }, comment: { parentId: string | null }): boolean {
  return post.kind === 'QUESTION' && comment.parentId === null;
}

/**
 * 추천 요청 한 건 안의 문서별 집계. 답변이 받은 가중 추천(UP) 합을 첨부한 문서마다 더한다. 삭제 답변 제외.
 * 이 숫자는 그 글 안에서만 보이고 문서 점수에 들어가지 않는다(GLOSSARY). 시간 감쇠 없음.
 * 정렬: weightedUp desc → answerCount desc → itemId asc
 */
export function itemTallyForPost(
  answers: { isRemoved: boolean; itemIds: string[]; votes: { type: 'UP' | 'DOWN'; weight: number }[]; helpfulAt: Date | null }[],
): { itemId: string; weightedUp: number; answerCount: number; helpful: boolean }[] {
  const by = new Map<string, { itemId: string; weightedUp: number; answerCount: number; helpful: boolean }>();
  for (const a of answers) {
    if (a.isRemoved) continue;
    const up = a.votes.reduce((s, v) => (v.type === 'UP' ? s + Math.min(v.weight, RANKING_CONSTANTS.MAX_VOTE_WEIGHT) : s), 0);
    for (const itemId of new Set(a.itemIds)) {
      const row = by.get(itemId) ?? { itemId, weightedUp: 0, answerCount: 0, helpful: false };
      row.weightedUp += up;
      row.answerCount += 1;
      row.helpful ||= a.helpfulAt !== null;
      by.set(itemId, row);
    }
  }
  return [...by.values()].sort(
    (x, y) => y.weightedUp - x.weightedUp || y.answerCount - x.answerCount || x.itemId.localeCompare(y.itemId),
  );
}

export const postBody = z.object({
  kind: z.enum(POST_KINDS),
  title: z.string().trim().min(1).max(BOARD_RULES.TITLE_MAX),
  body: z.string().trim().min(1).max(BOARD_RULES.BODY_MAX),
});
