/**
 * 분류 갤러리 인기 점수 (순수 함수, prisma 를 import 하지 않는다).
 * popularity = Σ가중투표(30일) + 2×편집 수 + 댓글 수 + 0.1×조회(30일, 데이터 30일 이상일 때만)
 * 동점은 followerCount, 그래도 같으면 id. 운영자 가점 없음. 조회수는 정렬 신호일 뿐 문서 점수(ranking.ts)에는 안 들어간다(ADR 0001).
 * 설계: docs/design/2026-W47-taxonomy-situation.md 2·7.3절
 */
export const POPULARITY_RULES = {
  WINDOW_DAYS: 30,
  EDIT_WEIGHT: 2,
  COMMENT_WEIGHT: 1,
  VIEW_WEIGHT: 0.1,
  VIEW_MIN_TRACKED_DAYS: 30,
} as const;

export type PopularityInput = {
  /** 분류에 속한 문서들의 투표(시점 고정 가중치) */
  votes: { weight: number; createdAt: Date }[];
  /** 창(30일) 안의 편집·댓글 수 */
  editCount: number;
  commentCount: number;
  /** 창 안의 조회 합계와 조회 지표가 쌓인 일수. 없으면 조회 항은 0 */
  views?: number;
  viewsTrackedDays?: number;
};

export function popularity(input: PopularityInput, asOf: Date = new Date()): number {
  const R = POPULARITY_RULES;
  const since = asOf.getTime() - R.WINDOW_DAYS * 86_400_000;
  const voted = input.votes
    .filter((v) => v.createdAt.getTime() >= since && v.createdAt.getTime() <= asOf.getTime())
    .reduce((sum, v) => sum + v.weight, 0);
  const viewTerm =
    (input.viewsTrackedDays ?? 0) >= R.VIEW_MIN_TRACKED_DAYS ? (input.views ?? 0) * R.VIEW_WEIGHT : 0;
  return voted + R.EDIT_WEIGHT * input.editCount + R.COMMENT_WEIGHT * input.commentCount + viewTerm;
}

export function sortByPopularity<T extends { id: string; score: number; followerCount: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.score - a.score || b.followerCount - a.followerCount || a.id.localeCompare(b.id),
  );
}
