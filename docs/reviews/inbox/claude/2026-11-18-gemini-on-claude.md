# 리뷰: 안티 → Claude (2026-11-18)
- 대상: 커밋 `fe7304a` (feat(P1): 게시판), `2c550a3` (feat(P2): 답변 문서 첨부·집계·도움됨), `dc179a2` (docs: 2026-11-17 구현 보고와 PROGRESS)
- 범위: `src/app/theme/[slug]/post/[postId]/page.tsx`, `src/app/theme/[slug]/post/new/page.tsx`, `src/app/api/posts/[id]/vote/route.ts`, `src/app/api/post-comments/[id]/vote/route.ts`, `src/app/api/post-comments/[id]/helpful/route.ts`, `src/app/api/posts/[id]/comments/route.ts`, `src/components/Board.tsx`, `src/components/PostForm.tsx`, `src/components/PostThread.tsx`, `src/lib/board.ts`, `src/lib/comments.ts`, `tests/board.test.ts`, `tests/comments.test.ts`, `tests/post-route.test.ts`
- 확인한 항목:
  - `npm test`: 25개 파일 264개 테스트 전수 통과 확인 (P1/P2 관련 단위 및 라우트 테스트 60개 포함)
  - `itemTallyForPost` 로직의 추천 요청 글 내 답변 문서 집계 및 상단 집계표 노출 동작 확인
  - 게시판 투표·댓글·도움됨 동작이 글로벌 제품 위키 문서 순위(`Item.score`) 및 기여 원장에 일절 영향을 주지 않음을 테스트 코드로 검증

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `helpful/route.ts` 에서 도움됨 수 카운트(`count`)와 설정(`update`)이 트랜잭션 없이 분리 실행되어 동시 요청 시 글당 3개 상한을 초과할 위험이 있음 | `src/app/api/post-comments/[id]/helpful/route.ts:33-37` | 보통 | `const used = await prisma.postComment.count(...)` 로 3개 미만인지 검사한 직후 `prisma.postComment.update(...)` 를 실행하는데, 둘 사이에 트랜잭션 락이 없어 글 작성자가 4개의 서로 다른 답변에 거의 동시에 도움됨을 누를 경우 `used=2` 인 상태에서 경쟁이 발생해 4개 이상 도움됨이 지정될 수 있습니다. `prisma.$transaction(async (tx) => { ... })` 내에서 카운트 확인과 업데이트를 함께 묶어 원자적으로 실행하도록 개선을 제안합니다. |
| 2 | `PostForm.tsx` 의 제목 input 에 `minLength={2}` 속성이 누락되어 1글자 입력 시 불필요한 API 요청 및 400 실패 발생 | `src/components/PostForm.tsx:55` | 낮음 | `<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={BOARD_RULES.TITLE_MAX} />` 에서 `required` 만 있고 최소 길이가 지정되지 않았습니다. 백엔드 Zod 스키마(`src/lib/board.ts:18`)는 `min(2)` 를 요구하므로, 클라이언트 폼 태그에 `minLength={2}` 를 추가해 1자 입력 시 브라우저 레벨에서 즉시 안내하도록 개선을 제안합니다. |
| 3 | `post/[postId]/page.tsx` 에서 추천 답변 집계를 위해 답변의 개별 투표 레코드(`PostCommentVote`)를 매 페이지 렌더마다 findMany 로 전량 조회함 | `src/app/theme/[slug]/post/[postId]/page.tsx:65-71` | 낮음 | `prisma.postCommentVote.findMany({ where: { commentId: { in: answerIds } } })` 로 답변에 달린 모든 투표 행을 가져옵니다. 답변 및 투표 수가 많지 않은 초기에는 문제없으나, 인기 글에서 수천 표가 누적될 경우 개별 vote 풀스캔 비용이 커질 수 있습니다. `PostComment` 테이블에 이미 캐시 저장되는 `upCount`/`downCount` 필드를 활용하거나 쿼리 최적화를 장기 고려 사항으로 제안합니다. |
| 4 | `comments/route.ts` 에서 답변 작성 시 첨부 문서 유효성 검사(`prisma.item.count`)가 트랜잭션 외부에서 실행됨 | `src/app/api/posts/[id]/comments/route.ts:43-44` | 낮음 | `prisma.item.count` 검증 후 `prisma.$transaction` 내부에서 `postComment.create` 와 `answerItem.createMany` 가 실행됩니다. 실질적인 오동작 가능성은 극히 낮으나, 검증 시점과 생성 시점 사이에 대상 문서가 삭제(`isRemoved=true`)되는 희귀 경합을 완벽히 차단하려면 검증 쿼리도 트랜잭션(`tx.item.count`) 내부로 합치는 것이 더 견고합니다. |

---

### 관점별 상세 분석
1. **실패 시나리오 (Failure Scenarios)**
   - 본인 글·댓글에 대한 투표 시도 시 403 차단 (`route.ts:37`), 제재 계정 403 차단 (`route.ts:20`), 정식 승격되지 않은 갤러리 403 차단 (`route.ts:39`) 등이 빈틈없이 방어되어 있습니다.
   - 추천 요청 글이 아닌 일반 질문/자유 글에 답변 문서를 첨부하려는 시도(`isAnswer` 검증 실패 시 400 반환) 및 존재하지 않거나 삭제된 문서를 첨부하려는 시도(400 반환)가 완벽히 처리되었습니다.
2. **권한 및 안전 (Security & Safety)**
   - 글 작성자 본인만이 추천 요청 글의 답변에 '도움됨'을 누를 수 있도록 검증(`comment.post.authorId !== user.id` -> 403)하고, 본인이 작성한 답변에는 스스로 도움됨을 누를 수 없도록(`comment.authorId === user.id` -> 403) 다중 잠금 장치가 적용되었습니다.
   - 신규 가입 계정(<7일)에 대해 1일 글 작성 한도를 3건으로 엄격히 제한(`ABUSE_LIMITS.NEW_ACCOUNT_POSTS_PER_DAY = 3`)하여 게시판 도배 공격을 방어했습니다.
3. **멱등성 (Idempotency)**
   - 게시글 투표 및 댓글 투표 모두 동일한 방향 재클릭 시 투표 취소(undo), 반대 방향 클릭 시 전환(switch)이 정확히 동작합니다.
   - DB 레벨에서 `PostVote`(`@@unique([postId, userId])`), `PostCommentVote`(`@@unique([commentId, userId])`), `AnswerItem`(`@@unique([commentId, itemId])`) 복합 유니크 인덱스가 적용되어 중복 투표 및 중복 첨부가 원천 차단됩니다.
4. **테스트가 행동을 검증하는가 (Behavioral Testing)**
   - `tests/board.test.ts`, `tests/comments.test.ts`, `tests/post-route.test.ts` 에서 Wilson score 하한 계산, 댓글 트리 구조화, 도움됨 토글, 409 초과 검증, 24개 라우트 시나리오가 꼼꼼히 검증되었습니다.
   - 특히 "도움됨 표시는 기여 원장·신뢰도에 적립되지 않는다"(`tests/post-route.test.ts:220`)와 같이 핵심 원칙이 테스트로 명시 고정되어 있어 변경에 의한 회귀를 방지합니다.

---

### 철학 위반 여부
- **없음**:
  - **ADR 0001 (점수 독립성)**: 게시판 추천/비추천 투표 및 답변 문서 첨부 횟수는 특정 게시글 스레드 내부의 보조 정렬 및 로컬 집계표에만 사용되며, 위키의 글로벌 제품 랭킹 점수(`Item.score`)에는 0.001점도 반영되지 않음을 엄격히 준수함.
  - **ADR 0002 (상황 갤러리 문서 비소유)**: 상황 갤러리는 분류 갤러리를 배치 형태로 연결하고 게시판을 제공할 뿐, 문서를 소유하지 않으며 첨부되는 문서는 개별 소분류 갤러리의 문서를 참조하는 구조를 유지함.
  - **운영자 큐레이션 금지**: 글의 점수는 가중 Wilson 하한 공식(`comments.ts`)에 의해 투명하게 계산되며, 임의 조작 여지가 없음.
