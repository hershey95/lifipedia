# 설계서: W44 이월분 마무리 + 댓글 투표·개념글 + 알림 (2026-W45, 10/26~11/1)
- 작성: Claude (무인 설계 세션, 2026-10-25) / 리뷰: Gemini (대기) / 구현: Sonnet 월~목
- 상태: **초안**. 기준은 `ROADMAP.md` W45 표다. 바꾼 것은 9절에 이유와 함께 적었다.
- 근거 문서: `2026-W44-protection-gallery.md`(이월분 설계 그대로), `reviews/retro/2026-W44-retro.md` 4절, `ref-backend.md` G·H·I절, `ref-frontend.md` 4.2절, `ref-security.md` 3.4·3.5절.

## 1. 현재 상태 (코드 기준, 2026-10-25 확인)
- **W44 는 5개 중 1개만 끝났다**(5 버그 3건, 490db33). `src/lib/protection.ts`·`src/lib/feed.ts`·`tests/protection.test.ts`·`tests/feed.test.ts`·`tests/design-tokens.test.ts` 가 없다. 4a·1·2·3·4b·4c 는 미착수다.
- **스키마**: `ReportTargetType` 에 `USER` 는 들어갔다. W44 3.1 의 `Report @@index([targetType, targetId, status])` 는 **아직 없다**(`schema.prisma:338` 은 `[status, createdAt]` 뿐). 투표 라우트의 몰림 신고 `findFirst` 와 W44-1 신고자 수 쿼리가 이 인덱스를 쓴다.
- **투표 라우트**(`api/items/[id]/vote/route.ts`): W44-5 로 `$transaction` 안에서 `findUnique → create/delete/update → recomputeItemScore(…, tx) → theme.update` 를 한다. 댓글 투표는 이 모양을 그대로 따른다.
- **토론**: `TalkComment` 에 표·점수 필드가 없다. 토론 페이지(`talk/page.tsx`)가 문서 댓글 전체를 `createdAt asc` 로 읽어 평면 배열로 넘기고, `TalkThread`(클라이언트)가 `Map<parentId>` 로 트리를 만든다. 답글은 깊이 3 미만에서만 연다. 삭제 댓글은 자식이 없어도 "(규칙 위반으로 삭제된 댓글입니다)"로 남는다.
- **토론 작성**(`api/items/[id]/talk/route.ts`): 부모를 `select: { itemId }` 로 확인하고 트랜잭션 없이 `create` 한다. 테마 상태(ACTIVE) 검사가 없다.
- **되돌리기**(`api/items/[id]/revert/route.ts:71`): `$transaction` 안에서 `voidRevertedContributions(tx, { itemId, toRevision, revertRevision, revertEditId })` 를 부른다. 되돌려진 구간은 `revision ∈ (toRevision, revertRevision)` 이다.
- **알림**: 모델·화면 없음. `Header` 는 클라이언트 컴포넌트이고 props 가 없다. `layout.tsx` 는 이미 서버에서 `prisma` 를 조회한다(사이드바).
- **무인 환경**: 구현 세션이 `git`·`tsc`·`vitest`·`build` 를 돌리지 못해 W44 월~수가 0건이었다(회고 3절). **사용자 결정 전이다.** 이 설계서는 결정과 무관하게 같은 순서로 집는다.

## 2. 목표와 범위
이번 주의 첫 목표는 **W44 를 끝내는 것**이다. 남는 날에 토론을 커뮤니티답게 만드는 두 작업(댓글 투표·개념글, 알림)을 붙인다. 원칙은 그대로다. **댓글 표는 랭킹과 신뢰도에 들어가지 않고, 개념글은 규칙으로만 정해진다.**

| 순서 | 작업 | 규모 | 이번 주 포함 | 제외 (다음으로) |
|---|---|---|---|---|
| A | W44 이월 4a·1·2·3·4b·4c | L×2+M×2 | W44 설계서 3~6절 그대로 | 바꾼 것 없음. 단 4c 는 W44 6.3 출시 조건 유지 |
| B | W45-2 댓글 투표 + 트리 정렬 + 개념글 | L | `CommentVote`, 정렬 best/new/old, 개념글 자동 등재, 갤러리 토론 탭 개념글 필터 | 말머리(`TalkTag`), `GET /api/items/[id]/talk`, `/api/themes/[slug]/concepts` |
| C | W45-1 알림 | M | 3종(답글·되돌려짐·개념글), 헤더 배지, `/notifications`, 모두 읽음, 90일 정리 | 편집 요청·이동 병합 알림 2종(기능이 없다), 실시간 전송 |
| D | W45-5 `ink` 삭제 | S | 4b 가 끝난 날 같은 커밋으로 | — |
| — | W45-3 `useOptimistic` | M | **W46 로** | 9절 #3 |
| — | W45-4 신고 처리·제재 | L | **W46 로**(설계 개요만 7절) | 9절 #4, 사용자 결정 2 |

## 3. 작업 A — W44 이월분
설계는 `2026-W44-protection-gallery.md` 를 그대로 쓴다. 이 절은 순서와 W45 작업과의 접점만 적는다.
- **순서**: 4a(6.1) → 1(3절) → 2(4절) → 3(5절) → 4b·4c(6.2~6.4). W44 8.1 의 요일은 무시하고 이 순서만 지킨다.
- **스키마**: 4a 날(월)에 `Report @@index([targetType, targetId, status])` 를 B·C 스키마와 **한 번에** `db:push` 한다(4.1, 5.1). 스키마 변경을 하루에 몰아 무인 세션의 `db:push` 횟수를 1회로 줄인다.
- **B 와의 접점**: 3(갤러리 통합)의 `talk` 탭이 B 의 개념글 필터를 받는다(4.5). 3 을 B 보다 먼저 끝낸다. 4b 의 치환 대상에 `TalkThread.tsx` 가 있으므로, B 에서 `TalkThread` 를 고칠 때 처음부터 토큰(`text-fg-muted` 등)을 쓴다. 그러면 4b 가 그 파일을 다시 건드리지 않는다.
- **완료 정의**: W44 8.2 점검표 그대로.

## 4. 작업 B — 댓글 투표 + 트리 정렬 + 개념글

### 4.1 데이터 모델 (추가만, 파괴적 변경 없음)
```prisma
model TalkComment {
  // 기존 필드 유지
  upCount   Int       @default(0)
  downCount Int       @default(0)
  bestScore Float     @default(0)   // 가중 Wilson 하한 캐시. 표가 바뀔 때만 다시 계산
  conceptAt DateTime?               // 개념글 등재 시각. 한 번 기록하면 표 철회로 지우지 않는다
  votes     CommentVote[]
  @@index([conceptAt])
}

model CommentVote {
  commentId String
  comment   TalkComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      VoteType
  weight    Float       // voteWeightFor 로 투표 시점 고정 (Vote 와 같은 원칙)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  @@id([commentId, userId])
  @@index([userId, createdAt])
}
// User 에 commentVotes CommentVote[] 관계만 추가
```
- `TalkComment @@index([itemId, parentId, bestScore])` 는 넣지 않는다. 정렬은 메모리에서 한다(4.3). 문서당 댓글이 500 을 넘으면 그때 넣는다.

### 4.2 순수 함수 `src/lib/comments.ts` (prisma 를 import 하지 않는다)
```ts
export const COMMENT_RULES = { MAX_PER_ITEM_FETCH: 500, MAX_DEPTH: 8 } as const;
export const CONCEPT_RULES = {
  MIN_WEIGHTED_UP: 8.0,
  MIN_DISTINCT_UPVOTERS: 5,
  MIN_WILSON: 0.6,
  WINDOW_DAYS: 7,
  MIN_VOTER_ACCOUNT_DAYS: 7,   // 표를 던진 시점에 계정 나이 7일 미만이면 개념글 집계에서 뺀다
} as const;

export type CommentVoteInput = { type: 'UP' | 'DOWN'; weight: number; userId: string; createdAt: Date; voterCreatedAt: Date };
export function commentTally(votes: CommentVoteInput[]): { upCount: number; downCount: number; bestScore: number };
export function isConcept(comment: { createdAt: Date; parentId: string | null }, votes: CommentVoteInput[]): boolean;

export type CommentSort = 'best' | 'new' | 'old';
export function parseCommentSort(v: unknown): CommentSort;            // 그 밖의 값·배열 → 'best'
export type FlatComment = { id: string; parentId: string | null; isRemoved: boolean; createdAt: Date; bestScore: number };
export type CommentNode<T> = T & { children: CommentNode<T>[]; depth: number };
export function buildCommentTree<T extends FlatComment>(flat: T[], sort: CommentSort): CommentNode<T>[];
```
- `commentTally`: `upCount`·`downCount` 는 행 수다. `bestScore = wilsonLowerBound(가중 UP, 가중 합)` 이고 가중치는 `min(weight, MAX_VOTE_WEIGHT)` 다. **시간 감쇠는 없다**(토론은 오래돼도 가치가 있다). `ranking.ts` 의 `wilsonLowerBound`·`RANKING_CONSTANTS` 를 재사용한다.
- `isConcept`: 최상위 댓글(`parentId === null`)만 대상이다. 집계 대상 표는 `createdAt ≤ comment.createdAt + 7일` 이고 `createdAt - voterCreatedAt ≥ 7일` 인 표다. 그 표들로 가중 UP 합 ≥ 8.0, 서로 다른 UP 투표자 ≥ 5, Wilson 하한 ≥ 0.6 을 **모두** 만족해야 참이다.
  - 신규 계정 판정을 `weight` 값(0.25 배)으로 하지 않는다. 신뢰도에 따라 0.25 배 표의 무게가 달라지기 때문이다. 투표 시각과 계정 생성 시각은 둘 다 바뀌지 않으므로 언제든 같은 결과로 재계산된다.
- `buildCommentTree`: 부모가 목록에 없는 댓글(고아)은 최상위로 올린다. 형제 정렬은 `best`: `bestScore desc → createdAt asc → id asc`, `new`: `createdAt desc → id desc`, `old`: `createdAt asc → id asc`. 깊이가 `MAX_DEPTH` 를 넘는 댓글은 `MAX_DEPTH` 단계에 평탄화한다. **삭제 댓글은 자식이 있으면 남기고(화면이 자리표시로 바꾼다) 자식이 없으면 뺀다.** 자식도 전부 빠진 삭제 댓글은 다시 뺀다(아래부터 처리).

### 4.3 화면 — 토론 페이지 (`talk/page.tsx`, 서버 컴포넌트)
- 쿼리에 `upCount, downCount, bestScore, conceptAt`, 로그인했으면 `votes: { where: { userId: me.id }, select: { type: true } }` 를 더한다. `take: COMMENT_RULES.MAX_PER_ITEM_FETCH`. 500 에 닿으면 목록 아래에 "최근 500개까지만 표시합니다"를 보여 준다(ponytail: 커서는 500 을 넘는 문서가 생기면).
- `?sort=best|new|old`(기본 best). 목록 위에 `<nav aria-label="정렬">` 링크 3개, 현재 항목 `aria-current="page"`. `parseCommentSort` 로 받는다.
- `buildCommentTree` 를 **서버에서** 돌려 `TalkThread` 에 트리를 넘긴다. `TalkThread` 의 `Map` 트리 조립은 지운다. 날짜는 서버에서 `toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 로 만든다(지금은 ISO 문자열을 잘라 쓴다. UTC 로 보인다).
- 댓글 한 줄: 작성자 · 날짜 · `개념글` 칩(`conceptAt` 있을 때, `bg-accent-soft text-accent-fg`) → 본문 → `CommentVoteButtons`(▲ n ▼ n) + 답글. 답글 버튼은 지금처럼 깊이 3 미만에서만 연다. `MAX_DEPTH` 8 은 이미 있는 깊은 데이터를 위한 안전장치다.
- `CommentVoteButtons`(`'use client'`, 새 파일): `VoteButtons` 와 같은 패턴이다. 요청 중 `busy` 로 두 버튼을 막는다. 응답의 `upCount/downCount/myVote` 로 갱신하고 `router.refresh()` 는 부르지 않는다. 본인 댓글이면 버튼 대신 숫자만 보여 준다. 비로그인 클릭은 `signIn()`. 버튼에 `aria-pressed` 와 `aria-label="추천 n"` 을 단다.
- 삭제 댓글 자리표시 문구는 그대로 둔다.

### 4.4 API — `POST /api/talk/[commentId]/vote`
요청 `{ type: 'UP' | 'DOWN' }`. 같은 방향 재투표는 취소, 반대 방향은 전환이다(`items/[id]/vote` 와 같은 규칙).

처리 순서(다른 쓰기 라우트와 같다): 401 → 정지 403 → 레이트 리밋 429 → zod 400 → 404 → 403(본인 댓글, 비ACTIVE 테마) → 트랜잭션.
```ts
const comment = await prisma.talkComment.findUnique({ where: { id: commentId },
  select: { id: true, parentId: true, authorId: true, createdAt: true, isRemoved: true, conceptAt: true, itemId: true,
            item: { select: { isRemoved: true, theme: { select: { status: true } } } } } });
// !comment || comment.isRemoved || comment.item.isRemoved → 404
// comment.authorId === user.id → 403 '본인 댓글에는 투표할 수 없습니다.'
// !canContribute(comment.item.theme.status) → 403

const result = await prisma.$transaction(async (tx) => {
  // existing 조회 → create/delete/update (weight = voteWeightFor(user))
  const votes = await tx.commentVote.findMany({ where: { commentId },
    select: { type: true, weight: true, userId: true, createdAt: true, user: { select: { createdAt: true } } } });
  const input = votes.map(…voterCreatedAt: v.user.createdAt);
  const tally = commentTally(input);
  const becameConcept = comment.conceptAt === null && isConcept(comment, input);
  await tx.talkComment.update({ where: { id: commentId }, data: { ...tally, ...(becameConcept && { conceptAt: new Date() }) } });
  if (becameConcept) await notify(tx, notificationsFor({ kind: 'CONCEPT_REACHED', … }));   // 5절. C 가 아직이면 이 줄은 C 에서 넣는다
  return { action, ...tally, becameConcept };
});
```
| 상황 | 상태 | 응답 |
|---|---|---|
| 성공 | 200 | `{ action, myVote, upCount, downCount, bestScore, becameConcept }` |
| 비로그인 / 정지 | 401 / 403 | `{ error }` |
| 시간당 120표 초과 | 429 | `{ error, retryAfterSeconds }` |
| 댓글·문서 없음, 삭제됨 | 404 | |
| 본인 댓글, 비ACTIVE 테마 | 403 | |
| 동시 요청 unique 충돌(P2002) | 409 | 기존 `handleError` |
- `ABUSE_LIMITS.COMMENT_VOTES_PER_HOUR = 120` 을 `abuse.ts` 에 추가한다. 세는 법은 `countSince(prisma.commentVote, { userId }, 3_600)` 이다. 투표를 취소하면 행이 지워져 카운트를 우회할 수 있다. 문서 투표에도 있는 알려진 한계다(ref-security 2.3, W46 이후 `ActionLog`).
- 몰림 감지(`looksLikeVoteBurst`)는 **넣지 않는다.** 댓글 표는 랭킹에 영향이 없어 조작 유인이 낮다. 신고 큐를 늘리지 않으려는 것이다.
- **랭킹·신뢰도 영향 없음**: `recomputeItemScore`·`Item.score`·`contributionCount` 를 건드리지 않는다. 테스트로 고정한다(4.7).

### 4.5 화면 — 갤러리 토론 탭 개념글 필터 (작업 A-3 위에 얹는다)
- `/theme/[slug]?tab=talk&best=1`: 최근 댓글 20개 대신 `conceptAt: { not: null }` 인 댓글을 `conceptAt desc` 로 20개 보여 준다. 탭 위에 `전체 | 개념글` 링크 2개, `aria-current`. 빈 상태 "아직 개념글이 없습니다."
- `feed.ts` 의 `FeedParams` 에 `best: boolean` 을 더하고 `parseFeedParams`·`feedHref` 를 그에 맞춘다(`best=1` 만 참, 기본 false 는 URL 에서 뺀다). `best` 는 `tab=talk` 에서만 쓴다. 다른 탭이면 무시한다.
- `/api/themes/[slug]/concepts` 는 만들지 않는다. 소비자가 서버 컴포넌트뿐이다(W44 9절 #5 와 같은 이유).

### 4.6 토론 작성 라우트 보강 (같은 작업)
- 비ACTIVE 테마의 댓글 작성을 막지 않는 지금 동작은 **유지한다**. 토론은 보호 문서를 고치는 우회 경로이기도 하다(W44 3.4). 표만 ACTIVE 로 제한한다.
- 부모 조회 `select` 에 `authorId` 를 더하고, `create` 를 `$transaction` 으로 감싼다. 알림(C)을 같은 트랜잭션에 넣기 위해서다. B 단계에서는 감싸기만 한다.

### 4.7 테스트
- `tests/comments.test.ts`(순수):
  - `commentTally`: 표 0 → `{0,0,0}`. UP 3(가중 1) → `upCount 3`, `bestScore = wilsonLowerBound(3,3)`. 가중 5.0 표는 3.0 으로 잘린다.
  - `isConcept` 경계: 가중 UP 7.99 → 거짓, 8.0 → 참(추천자 5·Wilson 충족 조건에서). 추천자 4명(가중 합 9) → 거짓. 7일 창 밖 표는 빠진다(창 안 4표 + 창 밖 4표 → 거짓). 투표 시점 계정 6.9일 표는 빠진다. 답글(`parentId` 있음) → 항상 거짓. DOWN 이 많아 Wilson < 0.6 → 거짓.
  - `buildCommentTree`: best/new/old 형제 순서. 동점 `bestScore` 는 `createdAt asc`. 고아는 최상위. 깊이 10 체인 → 최대 depth 8. 자식 없는 삭제 댓글 제외, 자식 있는 삭제 댓글 유지, 삭제 부모 + 삭제 자식만 있는 가지는 통째로 제외.
  - `parseCommentSort`: `undefined`·`'hot'`·`['new','old']` → `'best'`.
- `tests/comment-vote-route.test.ts`(mock, `vote-route.test.ts` 와 같은 방식): 신규 → `created`, 같은 방향 → `removed`, 반대 → `changed`. 본인 댓글 403. 비ACTIVE 403. 삭제 댓글 404. 쓰기가 `$transaction` 콜백 안에서만 일어난다. `conceptAt` 이 이미 있으면 `becameConcept` 가 거짓이고 `conceptAt` 을 다시 쓰지 않는다. `recomputeItemScore`·`item.update` 를 호출하지 않는다.

### 4.8 위험
- **지인 추천 개념글**: 7일 이상 계정 5명 + 가중 합 8 이 필요하다. 개념글은 랭킹에 영향이 없어 유인이 낮다. 관찰 지표는 갤러리별 개념글 비율이다(ref-frontend Q7, 4주 뒤 5~15% 범위인지).
- **본인 댓글 투표 금지의 우회(부계정)**: 위와 같은 조건으로 막힌다. 따로 탐지하지 않는다.
- **트리 쿼리 비용**: 문서당 댓글 1쿼리(최대 500행) + 정렬은 메모리. 지금 규모(문서당 수십)에서 충분하다.

## 5. 작업 C — 알림 (3종)

### 5.1 데이터 모델
```prisma
enum NotificationKind {
  TALK_REPLY        // 내 댓글에 답글
  EDIT_REVERTED     // 내 편집이 다른 사람의 되돌리기로 취소됨
  CONCEPT_REACHED   // 내 댓글이 개념글이 됨
}
model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      NotificationKind
  actorId   String?          // 행위자. 개념글은 null(규칙)
  itemId    String?          // FK 없음(ContributionEvent 와 같은 이유: 문서가 지워져도 행은 남는다)
  refId     String           // 답글 commentId / 되돌리기 EditHistory.id / 개념글 commentId
  readAt    DateTime?
  createdAt DateTime         @default(now())
  @@unique([userId, kind, refId])   // 재시도·중복 생성 방지
  @@index([userId, readAt, createdAt])
}
// User 에 notifications Notification[] 관계만 추가
```
- `refId` 를 **필수**로 둔다. SQLite 의 unique 는 NULL 끼리 같다고 보지 않으므로 nullable 이면 중복 방지가 깨진다.
- 나중에 종류를 더해도(편집 요청 등) enum 값 추가라 SQLite 에서는 데이터 변경이 없다.

### 5.2 순수 함수 `src/lib/notify.ts`
```ts
export const NOTIFICATION_RULES = { RETENTION_DAYS: 90, PAGE_SIZE: 50 } as const;
export type NotifyEvent =
  | { kind: 'TALK_REPLY'; actorId: string; recipientId: string | null; itemId: string; refId: string }
  | { kind: 'EDIT_REVERTED'; actorId: string; recipientIds: (string | null)[]; itemId: string; refId: string }
  | { kind: 'CONCEPT_REACHED'; recipientId: string | null; itemId: string; refId: string };
export function notificationsFor(e: NotifyEvent): Prisma.NotificationCreateManyInput[];
export function notificationText(kind: NotificationKind, itemName: string): string;
```
- `notificationsFor`: 수신자 null(탈퇴) 제외, **수신자 = 행위자 제외**, 수신자 중복 제거. 행은 최대 수신자 수만큼이다.
- 저장은 각 라우트 트랜잭션 안에서 `tx.notification.createMany({ data: rows })` 한 번이다. 빈 배열이면 호출하지 않는다. 알림 실패면 원 작업도 롤백된다(일관성 우선, 알림 행은 작다. ref-backend G).
  - Prisma SQLite 의 `createMany` 는 `skipDuplicates` 를 지원하지 않는다. 같은 `refId` 로 두 번 만들 경로가 없도록 각 생성 지점이 한 번만 부른다(답글·되돌리기는 새 행 id, 개념글은 `conceptAt === null` 일 때만).
- 문구(`notificationText`): "{문서} 토론에 내 댓글에 답글이 달렸습니다", "{문서}에서 내 편집이 되돌려졌습니다", "{문서} 토론의 내 댓글이 개념글이 되었습니다".

### 5.3 생성 지점
| 종류 | 라우트 | 수신자 | refId |
|---|---|---|---|
| TALK_REPLY | `POST /api/items/[id]/talk`(`parentId` 있을 때) | 부모 댓글 `authorId` | 새 댓글 id |
| EDIT_REVERTED | `POST /api/items/[id]/revert` | 되돌려진 구간 `revision ∈ (toRevision, nextRevision)` 편집의 서로 다른 `editorId` | 되돌리기 `EditHistory.id` |
| CONCEPT_REACHED | `POST /api/talk/[commentId]/vote` | 댓글 `authorId` | 댓글 id |
- 되돌리기: 트랜잭션 안에서 `tx.editHistory.findMany({ where: { itemId, revision: { gt: toRevision, lt: nextRevision } }, select: { editorId: true }, distinct: ['editorId'] })` 를 한 번 더 부른다. `voidRevertedContributions` 의 시그니처는 바꾸지 않는다.
- **편집 라우트의 "수동 되돌리기"(해시 일치)는 알림을 만들지 않는다.** 그 경로는 기여 무효화도 하지 않는다. 같은 규칙을 따른다.

### 5.4 API
| 메서드·경로 | 인증 | 요청 | 응답 | 에러 |
|---|---|---|---|---|
| `POST /api/notifications/read` | 로그인 | `{ all: true }` | `{ updated: n }` — `updateMany({ where: { userId: me, readAt: null }, data: { readAt: now } })` | 401, 400 |
- `GET /api/notifications` 는 만들지 않는다. 목록과 개수 둘 다 서버 컴포넌트에서 읽는다. 개별 읽음(`ids`)도 이번에는 없다. 클릭마다 클라이언트 요청이 필요하고, "모두 읽음" 하나로 충분하다.

### 5.5 화면
- **헤더 배지**: `layout.tsx` 에서 `currentUser()` 가 있으면 `notification.count({ where: { userId, readAt: null } })` 를 읽어 `<Header unreadCount={n} />` 로 넘긴다(인덱스 `[userId, readAt, createdAt]`). `Header` 는 로그인 메뉴 옆에 `/notifications` 링크를 두고, `n > 0` 이면 숫자 배지(99+ 상한)를 단다. 링크의 접근성 이름은 "알림 {n}건 안 읽음"이다.
- **`/notifications`**(서버 컴포넌트, `robots: noindex`): 비로그인이면 `redirect('/signin?callbackUrl=' + encodeURIComponent('/notifications'))`. 최근 50개를 `createdAt desc` 로 보여 준다. 각 줄은 문구 · 날짜(서버 KST) · 읽지 않음 점이다. 링크는 답글·개념글이면 문서 `/talk#c-{refId}`, 되돌려짐이면 문서 `/history` 다. 문서명은 `itemId` 로 한 번에 `findMany` 해서 붙인다(지워진 문서면 "삭제된 문서", 링크 없음).
- "모두 읽음으로 표시" 버튼(작은 클라이언트 컴포넌트) → `POST /api/notifications/read` → `router.refresh()`. 페이지를 여는 것만으로 읽음 처리하지 않는다(GET 에 부수효과를 두지 않는다).
- 토론 페이지 댓글 `<li>` 에 `id="c-{comment.id}"` 를 단다(앵커).
- 빈 상태 "알림이 없습니다." W44 9절 #6 의 "새 변경 n건"(주시목록 pull 배지)은 **이번에도 넣지 않는다**. 이유는 9절 #5.

### 5.6 보존
`api/cron/lifecycle/route.ts` 에 `notification.deleteMany({ where: { readAt: { lt: now - 90일 } } })` 한 줄을 더한다. 읽지 않은 알림은 지우지 않는다. (cron 스케줄·`scripts/` 는 건드리지 않는다.)

### 5.7 테스트
- `tests/notify.test.ts`(순수): 답글 — 자기 댓글에 자기가 답글 → 0행. 탈퇴 부모(null) → 0행. 되돌림 — 편집자 [A, A, B, 되돌린 사람, null] → A·B 2행. 개념글 → 작성자 1행, `actorId` null.
- 라우트(mock): 답글 작성 시 `notification.createMany` 가 같은 `$transaction` 콜백 안에서 1회. 최상위 댓글은 0회. 되돌리기 시 구간 편집자에게 생성, 되돌린 본인 제외. `/api/notifications/read` 비로그인 401, `{}` 400, `{ all: true }` 는 `userId` 조건이 걸린 `updateMany`.

### 5.8 위험
- **답글 스팸으로 알림 폭탄**: 댓글은 시간당 20개 상한이 있다(`COMMENTS_PER_HOUR`). 알림은 그 이상 늘지 않는다.
- **되돌리기 알림이 편집 분쟁을 키움**: 알림은 사실만 적고 되돌린 사람 이름을 문구에 넣지 않는다. 누가 했는지는 이력에서 본다.
- **레이아웃에 쿼리 +2(세션 조회, 카운트)**: 모든 페이지에 붙는다. 둘 다 인덱스 1회다. ponytail: 느려지면 `unstable_cache` 30초(ref-frontend B4).

## 6. 작업 D — `ink` 삭제 (W45-5)
- 조건: A 의 4b 가 끝나 `tests/design-tokens.test.ts` 가드 1번(ink 0건)이 통과한 상태.
- 할 일: `tailwind.config.ts` 의 `ink` 색 정의를 지운다. 가드가 이미 0건을 보장하므로 `npm run build` 만 통과하면 된다. 4b 마지막 커밋과 같은 날 한 커밋으로 한다.
- 4b 가 이번 주에 안 끝나면 D 도 `[ ]` 로 남긴다(이월).

## 7. 이번 주에 하지 않는 것 (설계 개요만)

### 7.1 W45-3 `useOptimistic` → W46
`src/lib/vote-state.ts` 의 `applyVote(s, type)`(신규·전환·취소 3경우) + 테스트, `VoteButtons`·`FollowButton`·`CommentVoteButtons` 를 `useOptimistic` 으로 바꾸고 `router.refresh()` 를 없앤다(ref-frontend 4.2). 연타 방지는 W44-5 의 `busy` 를 유지한다(ref-frontend 는 `aria-busy` 만 두자고 했지만, 이미 동작하는 방어를 바꿀 이유가 없다).

### 7.2 W45-4 신고 처리·제재 → W46 (사용자 결정 필요)
- 스키마: `AuditLog`(append-only), `Sanction`(ref-security 3.5 초안 그대로). `User.suspendedUntil` 은 `Sanction` 에서만 파생한다.
- 순수 함수 `src/lib/sanctions.ts`: `SANCTION_LADDER = [경고, 24h, 7일, 30일]`, `nextSanction(priorCount, now)`. 사람이 단계를 건너뛸 수 없다.
- 자동 임시 숨김: 서로 다른 7일 이상 계정 신고 N건 → `isRemoved` + AuditLog `AUTO_HIDE`.
- **막힌 점**: 검토자(누가 `ACTION/DISMISS` 를 누르는가)가 정해지지 않았다(ref-security Q7). 운영자 화면 없이 만들면 W44 회고의 "DB 를 손으로 고치는" 상태가 그대로다. 결정 전에 짓지 않는다.

## 8. 순서·의존성과 수용 기준

### 8.1 작업 큐 (무인 세션은 PROGRESS 의 첫 `[ ]` 를 집는다)
매 작업 끝에 `npm run typecheck && npm test` 를 통과시키고 커밋한다. 세션이 그 명령을 못 돌리면 커밋하지 않고 `dev.md` 에 "구현함·검증 못 함"으로 적는다(W44 회고 2절 #1). push 는 하지 않는다.

| 목표 요일 | 작업 | 의존 | 완료 정의 |
|---|---|---|---|
| 월 | A-4a 토큰 정의 + **스키마 한 번에**(Report 인덱스, B 4.1, C 5.1) `db:push` | — | `body` 가 `bg-bg text-fg`, `prisma validate` 통과 |
| 월~화 | A-1 문서 보호 | 월 스키마(Report 인덱스) | W44 8.2 보호 항목 |
| 화 | A-2 분류 + 주시목록 | — | W44 8.2 분류·주시 항목 |
| 수 | A-3 갤러리 통합 + 인포박스 | 4a, A-2 | W44 8.2 갤러리·인포박스 항목 |
| 목 | B 댓글 투표·정렬·개념글(4.5 포함) | A-3(토론 탭), 월 스키마 | 8.2 B 항목 |
| 목(넘치면 W46 월) | C 알림 | B(개념글 생성 지점), 월 스키마 | 8.2 C 항목 |
| 남는 날 / W46 | A-4b·4c + D | A-3 | W44 8.2 토큰 항목, 가드 통과 |
| 검토 | A-1·B·C 뒤 보안 검토자, A-3·B 화면 뒤 UX 검토자 | | `docs/agents/` |

- **4b·4c 를 B·C 뒤로 보낸 이유**: 4b 는 기계 치환이라 미뤄도 다른 작업을 막지 않는다. 반대로 B·C 는 ROADMAP W45 의 본 작업이다. B 의 새 화면은 처음부터 토큰을 쓰므로 4b 의 치환량도 늘지 않는다. 대신 4c(라이트 토글)는 W44 6.3 조건대로 가드 통과 전에는 노출하지 않는다.

### 8.2 수용 기준
- [ ] `prisma/schema.prisma` 변경이 추가만이다(컬럼·테이블 삭제 없음). `db:push` 가 `--accept-data-loss` 없이 끝난다.
- [ ] 토론 페이지 `?sort=best|new|old` 가 순서를 바꾸고 새로고침·뒤로 가기에서 유지된다. 잘못된 값은 best.
- [ ] 다른 사람 댓글에 ▲ → 숫자 1 증가, 다시 ▲ → 취소, ▼ → 전환. 빠른 두 번 클릭에 요청 1회. 본인 댓글에는 버튼이 없다.
- [ ] 7일 넘은 계정 5개로 최상위 댓글에 추천해 가중 합 8 을 넘기면 `개념글` 칩이 생기고 작성자에게 알림 1건. 추천을 모두 취소해도 칩은 남는다.
- [ ] 가입 2일 계정 10개의 추천으로는 개념글이 되지 않는다.
- [ ] `/theme/<slug>?tab=talk&best=1` 이 그 갤러리의 개념글만 보여 준다.
- [ ] 댓글 투표 전후로 해당 문서의 `Item.score`·작성자의 `contributionCount` 가 같다.
- [ ] 내 댓글에 다른 사람이 답글 → 헤더 배지 1, `/notifications` 에 1줄, 링크가 해당 댓글로 스크롤. 내가 내 댓글에 답글 → 알림 없음.
- [ ] 내 편집이 포함된 구간을 다른 사람이 되돌리기 → 알림 1건. 같은 구간에 내 편집이 3개여도 1건.
- [ ] "모두 읽음" 후 배지가 사라진다. 비로그인 `/notifications` 는 로그인 후 복귀.
- [ ] `npm run typecheck`, `npm test`, `npm run build` 통과.

## 9. ROADMAP 대비 바꾼 것 (이유)
| # | 변경 | 이유 |
|---|---|---|
| 1 | W44 잔여 6개 단위(4a·1·2·3·4b·4c)를 W45 **맨 앞**에 둔다 | W44 회고 4절 #1. 보호(1)·갤러리 토론 탭(3)·토큰(4a)이 W45 작업의 바탕이다 |
| 2 | W45 범위를 1·2·5 로 줄인다 | 이월분이 L 2개·M 2개다. 4일 안에 W45 전체(L 2개 포함)를 더하면 W44 처럼 또 밀린다 |
| 3 | W45-3 `useOptimistic` → W46 | W44-5 의 `busy` 로 눈에 보이는 문제(409 문구·중복 요청)는 이미 사라졌다. 남은 효과는 반응 속도뿐이라 우선순위가 낮다 |
| 4 | W45-4 신고 처리 → W46, 사용자 결정 대기 | 검토자 결정(ref-security Q7) 없이 지으면 처리 버튼을 누를 사람이 없다. 10-24 dev 보고 결정 요청 2와 같은 사안이다 |
| 5 | 알림을 5종이 아니라 **3종**으로 | `EDIT_REQUEST_DECIDED`(편집 요청 큐 보류, 열린 결정 3)와 `STRUCTURAL_PROPOSED`(이동·병합 후순위)는 기능이 없다. enum 값 추가만으로 나중에 넣을 수 있다. 주시목록 "새 변경 n건"도 pull 계산이라 알림 행이 필요 없고, 이번 주 화면 여유가 없어 다시 미룬다 |
| 6 | 말머리(`TalkTag`)를 뺐다 | ROADMAP W45-2 에 없다. ref-backend H 의 부가 항목이다. 필요해지면 nullable 컬럼 추가로 끝난다 |
| 7 | `GET /api/items/[id]/talk`, `/api/themes/[slug]/concepts`, `GET /api/notifications` 를 만들지 않는다 | 소비자가 서버 컴포넌트뿐이다(W44 9절 #5 와 같은 이유) |
| 8 | 개념글 집계의 신규 계정 판정을 **가중치 0.25 여부 대신 투표 시점 계정 나이**로 | 가중치는 신뢰도와 곱해져 0.25 배인지 값만으로 알 수 없다. 두 시각은 불변이라 재현성이 같다 |
| 9 | 댓글 투표에 몰림 신고를 넣지 않는다 | 랭킹 영향이 없고, 제재 흐름(7.2)이 없는 동안 신고는 읽히지 않는다 |
| 10 | W46 표(근거 구조·법적 페이지·시각 회귀)가 W45-3·W45-4 와 남은 이월분을 받는다 | W46 이 넘치므로 ROADMAP 을 W47 까지 늘리는 판단은 금요일 회고에서 한다(W44 회고 4절 #2). 이 설계서는 ROADMAP 파일을 고치지 않는다 |

## 10. 열린 질문 (기본값으로 진행)
- **Q1. 개념글 칩의 위치**: 기본값은 토론 페이지 댓글과 갤러리 토론 탭에만 둔다. 문서 페이지에 "개념글 n개" 요약을 둘지는 B 이후 UX 검토자가 본다.
- **Q2. 알림 문구에 행위자 이름**: 기본값은 넣지 않는다(5.8). 답글은 이름이 있어도 분쟁 위험이 낮으니 넣자는 의견이 오면 답글만 바꾼다.
- **Q3. 비ACTIVE 테마의 댓글 투표**: 기본값은 막는다(문서 투표와 같음). 토론 작성은 막지 않는다(4.6).
