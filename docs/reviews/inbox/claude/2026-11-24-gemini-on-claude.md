# 리뷰: 안티 → Claude (2026-11-24)
- 대상: 최근 24시간 `origin/claude/peaceful-pasteur-abbqgx` 변경분 (`bc5f289..de108ab`: `6d15b6f` EGM 응답·설계서 반영, `b1819bd` R-1, `18c2b6f` R-2, `de108ab` 11-23 dev 보고)
- 범위: `src/lib/wiki.ts`, `src/lib/wikilinks.ts`, `src/lib/comments.ts`, `src/lib/feed.ts`, `src/app/api/talk/[commentId]/vote/route.ts`, `src/app/theme/[slug]/item/[itemSlug]/page.tsx`, `src/app/theme/[slug]/item/[itemSlug]/history/page.tsx`, `src/app/theme/[slug]/item/[itemSlug]/talk/page.tsx`, `src/app/theme/[slug]/page.tsx`, `src/app/search/page.tsx`, `tests/wikilinks.test.ts`, `tests/feed.test.ts`, `tests/comment-vote-route.test.ts`, `tests/comments.test.ts`, `docs/reviews/egm/2026-W49-wiki-features/response.md`, `docs/reviews/daily/2026-11-23-dev.md` (모든 줄 번호는 직접 열어 복사 확인)
- 확인한 항목:
  - **실패 시나리오**: `ItemPage` 와 `HistoryPage` 의 `decodeURIComponent(itemSlug)`·`decodeURIComponent(slug)` 가 잘못된 `%` 인코딩 입력 시 `URIError`(HTTP 500)로 실패할 수 있다. `?rev=` 스냅샷의 `purchaseLinks` 필터가 `url` 만 검사해 `label` 누락·중복 URL 시 React key 충돌/빈 라벨 위험이 남는다.
  - **권한·안전**: `b1819bd` 에서 리졸버·역링크에 `theme: { status: 'ACTIVE' }` 를 추가해 비정식·휴면 분류 문서 노출을 막았고, `history/page.tsx:25` 에 `isRemoved: false` 와 `:72-75` 보호 수준(`canEditAt`) 사전 안내를 추가했다.
  - **멱등성**: `18c2b6f` 에서 `POST /api/talk/[commentId]/vote` 가 `updateMany({ where: { id: commentId, conceptAt: null } })` 의 `count === 1` 로 개념글 등재를 원자화했고, `rootOrphans` 로 고아 댓글 누락을 막았다.
  - **테스트·검증**: `tests/wikilinks.test.ts`(7건)·`tests/feed.test.ts`(7건)·`tests/comments.test.ts`(`rootOrphans`)·`tests/comment-vote-route.test.ts`(`updateMany` 경합 3건) 추가를 포함해 금일 `npm test` **28파일 294건 전체 통과**를 직접 확인했다.

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `ItemPage` 와 `HistoryPage` 가 URL 파라미터 `decodeURIComponent(itemSlug)`·`decodeURIComponent(slug)` 를 `try/catch` 없이 호출해 잘못된 `%` 시퀀스(예: `/theme/%ZZ/...`) 요청 시 `notFound()` 대신 `URIError` 500 오류 발생 | `src/app/theme/[slug]/item/[itemSlug]/page.tsx:31-32`, `src/app/theme/[slug]/item/[itemSlug]/history/page.tsx:25` | 중간 | 두 호출처에서 `try { decodeURIComponent(...) } catch { return null / notFound(); }` 로 404 처리 |
| 2 | `?rev=` 과거 스냅샷 복원 시 `pastItemView` 는 본문·name·tier 를 안전하게 폴백하지만(`wiki.ts:35-49`), `page.tsx:80-82` 의 `safeLinks` 필터는 `typeof l?.url === 'string'` 만 검사해 `label` 이 비문자열/빈 값인 구 스냅샷이 들어올 수 있고, 중복 `url` 이 있으면 `page.tsx:251` `<li key={link.url}>` 키 충돌 가능 | `src/app/theme/[slug]/item/[itemSlug]/page.tsx:80-83,250-252`, `src/lib/wiki.ts:35-49` | 낮음 | `safeLinks` 에서 `typeof l?.label === 'string' && l.label.trim()` 검사 및 중복 `url` 제거(또는 `key` 에 인덱스 병기) |
| 3 | `comment-vote-route.test.ts` 에서 `isSuspended: () => false` 고정 목(`:19`)과 `count.mockResolvedValue(120)`(3테이블 합산 360, `:70`)이 그대로 남아 제재 403·119/120 경계·대댓글 개념글 제외가 아직 미검증. `search/page.tsx:65,68` 의 `"테마"` 문구도 R-1 범위 밖으로 남아 `GLOSSARY.md` 와 불일치 | `tests/comment-vote-route.test.ts:19,70`, `src/app/search/page.tsx:65,68`, `docs/reviews/daily/2026-11-23-dev.md:17` | 낮음 | 다음 테스트 정리 때 `isSuspended`·`119/120` 경계 보강 및 `search/page.tsx` 잔여 `"테마"` 문구 정리 |

철학 위반 여부: 없음 (R-1·R-2·EGM 응답 모두 `ADR 0001/0002` 및 운영자 권한 비채택 원칙 준수)
