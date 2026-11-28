# BACKLOG (Claude 관리, 토요일 격차 분석으로 갱신)
> 4주 통합 로드맵: `docs/design/ROADMAP.md` (W43~W46), 진행: `docs/design/PROGRESS.md`. 아래는 로드맵 밖 항목과 격차 분석 결과.
> 우선순위 P0 즉시 / P1 2주 / P2 분기. 규모 S<½일, M 1~2일, L 3일+.
> 최종 갱신: 2026-11-28 (격차 분석, 코드 미수정. 근거는 파일:줄). **11-28 절이 최신이다.** 11-21 이전 절은 이력이며, 낡은 항목은 11-28 절 "이전 항목 상태"에서 정정한다.

## 격차 분석 2026-11-28 (W49 토요일)
코드를 Read/Grep 과 `git ls-files` 로 대조했다. `tsc`·`vitest`·`build`·화면은 돌리거나 보지 않았다. `ref-*.md` 는 `ref-security.md` 6절과 목차만 보고 대조했다(backend·frontend·design-system 본문은 이번에 읽지 않음).
W50 큐에 이미 있는 것(A~E, S, K, `PROGRESS.md:81~92`)은 다시 적지 않는다. `safeDecode` 는 `src` grep 0건이라 A 는 아직 미착수다.

### 이전 항목 상태 (11-21 대비 정정)
- **닫음(오판):** `[P0] G db:push 26일째`. 세션이 빈 `/tmp` DB 로 build 한 측정 오류였다(`reviews/retro/2026-W49-retro.md` 3.1, `PROGRESS.md:64`). 컬럼 단위 비교·화면 육안 확인만 남았다.
- **해결:** `/contribute`·토막 문서(`src/app/contribute/page.tsx`), 편집 필터·변경 태그(`src/lib/edit-filter.ts:50,71`), 알림 3종(`api/talk/[commentId]/vote/route.ts:76`, `items/[id]/talk/route.ts:49`, `items/[id]/revert/route.ts:118`), 토론 탭 `best=1`(`src/lib/feed.ts:23`, `theme/[slug]/page.tsx:161`), 투표 `useOptimistic`(`VoteButtons.tsx:22`, `BoardVoteButtons.tsx:22`), `*.tsbuildinfo` 추적 해제(`git ls-files` 0건).
- **대부분 해결:** 라우트 테스트. edit·revert·items·talk·게시판은 있다(`tests/protection.test.ts:77~78`, `edit-filter-route`·`post-route`·`notifications-route`). 남은 것은 reports·themes·follow·search·cron 2종(`tests/` import grep 0건).
- **정정:** 무인 Bash 거부. 이번 세션은 `ls`·`git ls-files`·`git grep` 단순 명령이 됐다. claude-mem `work_state_read` 는 거부됐다.
- **정정:** `content/taxonomy.json` 은 이제 있다. 남은 것은 키 형식·import 래퍼(`PROGRESS.md:65` ②③).
- **그대로:** `ink` 104곳·21파일(grep, K 가 큐에 있음), 투표 한도 쿼리 3중 복사(`talk/[commentId]/vote/route.ts:24~26`, `posts/[id]/vote/route.ts:26~28`, `post-comments/[id]/vote/route.ts:23~25`), `Item.sources` 없음(`src/lib/wiki.ts:8~17`, S), CSP `'unsafe-inline'`(`next.config.mjs:19~20`), 백업 자동화 없음, `scripts/__pycache__/*.pyc` 추적 중.

### P0
- **[P0·M] 신고를 처리할 수단이 없다.** `isRemoved` 를 true 로 쓰는 코드가 `src` 에 없다(grep: 조건·select 만). `Report` 는 쌓이기만 한다(`api/reports/route.ts:34`). W50 D 는 사유 추가뿐이고 조치는 E(스키마) 뒤다. E 가 밀리면 스팸·권리침해 글은 DB 직접 수정밖에 없다.
- **[P0·S·사용자] 처리방침·약관 페이지 없음.** `src/app` 에 라우트 0. 운영자 사실 4가지(책임자 연락처·서버 위치·OAuth·백업 주기) 대기. **공개 운영 전 필수.**

### P1 — 새로 찾았거나 큐에 없는 것
- **[P1·S] `//host` 링크가 내부 링크로 렌더된다(보안).** `href.startsWith('/')` 만 본다(`src/components/WikiMarkdown.tsx:33~39`). 외부 사이트가 `rel="nofollow ugc"`·새 창 표시 없이 열린다. 코드 읽기, 재현 안 함. 같은 분기에서 `#` 앵커·각주는 외부 링크 취급(새 창)된다(`:41`). **S(출처·각주) 착수 전에 필요.** 근거 `docs/research/2026-11-25-wiki.md:28~36`.
- **[P1·S] 단축 URL 차단이 본문 링크를 안 본다.** `checkEdit` 의 block 은 `purchaseLinks` 만(`src/lib/edit-filter.ts:51~54`). 게시판 글·댓글에는 필터 호출이 없다(`checkEdit` 사용처는 items 라우트 둘뿐). 근거 같은 리서치 2).
- **[P1·M] `[[위키링크]]` 렌더러가 둘이고 서로 다르게 간다.** `WikiTextRenderer` 는 제목을 slug 로 바꿔 `/theme/<slug>`(분류·상황 갤러리 경로)로 보낸다(`src/components/WikiLink.tsx:27~46`). 문서 화면의 `wikiLinksToMarkdown`(`src/lib/markdown.ts:58`)과 결과가 다르다. 홈(`src/app/page.tsx:207`)과 **편집 미리보기**(`MarkdownEditor.tsx:202`)가 옛 렌더러를 써서, 미리보기에서 맞아 보인 링크가 저장 뒤 달라지고 마크다운 서식도 안 보인다.
- **[P1·M] 화면 문구가 GLOSSARY 금지어 "테마"를 널리 쓴다.** W50 A 는 `search/page.tsx` 만 다룬다. 예: `themes/page.tsx:7,42,45`, `themes/new/page.tsx:10`, `not-found.tsx:11~12`, `me/page.tsx:188`, `signin/page.tsx:22`, `how-ranking-works/page.tsx:110~113`, `FollowButton.tsx:49`, API 오류 문구(`api/items/route.ts:51~53`). A 의 범위를 넓히는 편이 낫다.
- **[P1·S] 편집 필터 규칙 공개 화면 없음**(W49 설계 3.6). `how-ranking-works/page.tsx` 에 편집 필터·단축 URL 설명 0건. "공개된 규칙" 원칙과 어긋난다.
- **[P1·S~M] 기여할 거리 목록 3종 미구현**: 90일 미편집, 답변 없는 추천 요청, 나가는 링크 없음(설계서 W3 `:182~185`, `PROGRESS.md:70`). 화면에는 아직 "다음 주에 추가합니다"라고 적혀 있다(`src/app/contribute/page.tsx:76`). 6종은 사용자 지시라 버리지 않는다.
- **[P1·S] 쓰기 라우트 Origin 검사 없음**(`ref-security.md:358` P1-5). `src` grep `origin` 헤더 검사 0건. 세션 쿠키의 SameSite 기본값에만 기댄다(실제 설정은 확인 안 함).
- **[P1·S·사용자] OAuth 토큰이 DB 에 남는다**(`ref-security.md:360`). `PrismaAdapter` 기본 동작(`src/lib/auth.ts:25`) + `Account.access_token`·`refresh_token`·`id_token`(`prisma/schema.prisma:68~73`). 비우는 코드 0건. DB 값은 확인 안 함. 백업 유출 시 함께 나간다.
- **[P1·S] 남은 라우트 테스트**: reports·follow·themes·cron 2종(위). cron 은 인증 거부 케이스 우선.
- **[P1·S] 투표 한도 합산 공용 함수화**(위, 모델이 늘 때 한 라우트만 빠질 위험).

### P2
- **[P2·M] 안 쓰는 컴포넌트 5개, 약 2,000줄**: `FullScreenInteractiveUniverse`(652줄)·`MindMapCanvas`(499)·`MindMapDrawer`(124, 앞의 둘만 import)·`ThemeExplorer`(402)·`GalleryFeed`(344). `src` 의 다른 곳에서 import 0건. 삭제하면 "테마" 문구와 `WikiTextRenderer` 사용처가 크게 준다. **삭제는 `git rm` 이라 사용자 확인 뒤.** 위의 렌더러·문구 작업보다 먼저 하면 일이 준다.
- **[P2·S] GLOSSARY 에 "토막 문서"·"기여할 거리"가 두 번씩, 정의가 다르다**(`GLOSSARY.md:79~85` vs `107~113`: "본문이 짧거나 출처·가격·이미지가 빠진" / "300자 미만, 출처 절 없음…", 목록 구성도 다름). 코드(`src/lib/upkeep.ts:8` `STUB_MIN_BODY=300`)에 맞춰 하나로.
- **[P2·S] 스냅샷이 과거 기간도 덮어쓴다**(`src/lib/snapshot.ts:80` upsert, `ref-security.md:373` P2-7). "과거 순위 재현" 원칙에 닿는다. 라우트가 과거 `periodKey` 를 받는지는 확인 안 함.
- **[P2·S] 검색 API 에 요청 제한·상태 거름 없음**: `api/search/route.ts:13~34`(`countSince` 0, 분류·상황 갤러리 조회에는 `status` 조건 없음). 읽기 제한은 NAS 프록시 단에서 하는 안.
- **[P2·M] 계정 삭제·데이터 내보내기 없음**(`ref-security.md:371`, `src` grep 0건). 처리방침을 쓰면 삭제 요청 절차가 필요해진다(수동 절차라도 명시).
- **[P2·S] `loading.tsx` 0개**(`ref-design-system.md` 4.12 스켈레톤, Glob 0건).
- **[P2·S] `FollowButton` 은 `useOptimistic` 미적용**(W45-3 은 투표·팔로우, `src` 사용처는 투표 버튼 둘뿐).
- **[P2·M] 보호 중 문서 목록**(W5-6, 일괄 쿼리 설계 선행, `PROGRESS.md:74`).
- **[P2·S~M] 리서치 아이디어 미등록**: 필드별 단어 diff·검색 이름 일치 우선(`docs/research/2026-11-25-wiki.md:54,62`), 가격 파서·가격 변경 이력(`docs/research/2026-11-18-price.md:36,44`).
- 이월: 접근성 자동 점검·Playwright(`package.json` 에 없음), `vid` 서명, 11-23 EGM 사용자 결정 1·3·4·5·6(`reviews/egm/2026-W49-wiki-features/response.md:35`, 임시 기본값 진행 중).

### 권고 (11/29 일요일 설계 세션)
W50 순서는 유지하고 끼워 넣기만 한다.
1. A 에 "테마" 문구 범위 확대를 합친다.
2. B 뒤에 `//host`·`#` 링크 수정 + 본문 링크 차단(둘 다 S). S(출처) 앞이어야 한다.
3. E 의 `db:push` 시점을 먼저 정한다. E 가 W50 에 못 들어가면 신고 조치의 임시 수단을 따로 결정한다.
4. 안 쓰는 컴포넌트 삭제를 사용자에게 확인한 뒤 K(`ink`) 앞에 둔다.

## 격차 분석 2026-11-21 (W49 토요일)
### 이전 항목 상태 (정정, 11-14 대비)
- 해결: 조회 비콘 연결(`src/components/ViewBeacon.tsx`, 호출처 `theme/[slug]/page.tsx:215`·`item/[itemSlug]/page.tsx:109`·`post/[postId]/page.tsx:110`), 인기 점수의 조회 항(`popularity.ts:3~4`, ADR 0001 범위를 정렬 신호로 한정한다고 주석에 명시), 분류 카드 `unstable_cache`(`theme/[slug]/page.tsx:44`), `vid` 쿠키 `Secure`(https 때, `api/views/route.ts:47~49`), 댓글 투표·개념글 라우트(`api/talk/[commentId]/vote/route.ts`), 게시판 라우트·스키마(`api/themes/[slug]/posts`, `api/posts/[id]/*`, `api/post-comments/[id]/*`).
- 해결(확인됨): cron 인증은 `CRON_SECRET` 미설정이면 **거부**(`src/lib/api.ts:25~26`, fail-closed). 11-14 의 "미설정 시 동작 확인" 항목은 닫는다. 남은 건 라우트 테스트뿐.
- 라우트 테스트: `me`·`vote` 에 `comment-vote-route`·`post-route`·`views-route` 가 더해져 파일 27개. 그래도 edit·revert·items·reports·cron·follow 라우트는 무테스트(`tests/` 에 해당 파일 없음).
- 그대로: `ink` 브리지(`tailwind.config.ts:10~11`) 105곳·21파일(`theme/[slug]/page.tsx` 25, `how-ranking-works` 13, `[tier]/page.tsx` 9, `themes/page.tsx` 8, `item/[itemSlug]/page.tsx` 8). 11-14 의 97곳보다 늘었다 — 새 화면(게시판·토론)이 치환 없이 `ink` 를 계속 쓰는 신호.

### P0
- **[P0·사용자·S] G `db:push` → `build` 26일째 미실행.** 이제 스키마가 W48 P1 의 5모델까지 쌓였다(`Notification` schema.prisma:338 외). 모든 W48·W49 `[x]` 가 "build 미확인(P2021)"이고, 런타임 검증이 한 번도 없다. 다음 코드 작업보다 먼저. 근거 PROGRESS.md:46·63.
- **[P0·M] 신고 처리·제재 경로 여전히 없음.** `Report` 는 쌓이기만 하고 `isRemoved` 를 true 로 쓰는 코드는 `src` 전체 grep 0건(읽기·select 만). 게시판·토론이 늘어 신고 대상이 넘쳤다(글·댓글·답변). 회고 #5 의 기본값("관리자 숨김 라우트 1개", S~M)을 W49 에 올릴 것. 근거 `api/reports/route.ts`, PROGRESS.md:59.
- **[P0·S] 처리방침·약관 페이지 없음.** `src/app` 에 라우트 0(OAuth 로 개인정보 수집 중, `src/lib/auth.ts`). 운영자 사실 4가지(책임자 연락처·서버 위치·OAuth·백업 주기)가 있어야 쓸 수 있다 — 사용자 입력 대기. 최소안 S.

### 기능 격차
- **[P1·M] W49 W3 `/contribute`·토막 문서, W4 편집 필터·변경 태그 미착수.** `src/app` 에 `contribute` 라우트 없음, 편집 필터 코드 없음(`items/[id]/edit/route.ts` 만 검사). 큐 순서대로 다음. 근거 PROGRESS.md:65~66.
- **[P1·L] 알림 3종 구현 0.** `Notification` 모델만 있고(schema.prisma:338) `prisma.notification` 사용처 0건(`src` grep). 개념글 알림도 여기 포함. 헤더 배지·90일 정리 포함. PROGRESS.md:67.
- **[P1·M] 갤러리 토론 탭 `best=1` 개념글 필터 없음.** `src/lib/feed.ts` 에 best/개념글 처리 0건. B 의 남은 부분(PROGRESS.md:53 "남음 4.5").
- **[P1·L] `Item.sources` 컬럼·각주 렌더 없음.** schema.prisma 에 `sources`·`tags` 컬럼 0건, `EDITABLE_FIELDS` 도 그대로. `sources` 는 콘텐츠 JSON 검증에만(`content-check.ts:90~110`). 콘텐츠 `facts` 전환의 선행(스키마라 G 후).
- **[P1·M] `useOptimistic` 0건**(`src` grep). 투표·팔로우 버튼이 서버 왕복을 기다림. 순수 함수 `applyVote` 부터(S) 하면 쪼개기 쉽다.
- **[P1·M·사용자] `taxonomy.json` 시드 import 래퍼**(`scripts/` 금지). 11-14 항목 유지. 대안: 래퍼를 `src/lib` 안 순수 함수 + 사람이 쓰는 2줄 스크립트.

### 보안·운영
- **[P1·M] 쓰기 라우트 테스트 공백**: edit·revert·items·reports·cron·follow·search 무테스트. 되돌리기·보호 403·409·한도가 회귀 보호 없이 변경 중(W49 W1 의 되돌리기 버튼 포함). 라우트당 1~2 케이스로 시작.
- **[P1·S] 투표 한도 쿼리 중복**: 세 투표 라우트가 서로의 모델까지 합산해 매 요청 `count` 3회(`talk/[commentId]/vote/route.ts:23~25`, `post-comments/[id]/vote/route.ts:24~25`, `posts/[id]/vote/route.ts:27~28`). 동작은 맞지만 한 곳으로 모으지 않으면 모델 추가 때 한 라우트만 빠뜨릴 위험. 공용 함수화(S).
- 이월 유지: SQLite 백업 자동화 부재(P1·M, `scripts/` 금지 → 사용자), CSP `'unsafe-inline'`(next.config.mjs, P1·낮음), `vid` 서명 없음(P1·S, 환경변수 신설은 사용자 결정), 접근성 자동 점검 없음(P1·S), Playwright 시각 회귀 없음(P2·M).

### 프론트·디자인
- **[P1·L] `ink` 치환 105곳**(위). 파일 그룹별 소규모 커밋 권장. 새 화면부터 `fg-*` 토큰만 쓰도록 `tests/design-tokens.test.ts` 가드 1번을 신규 파일에 먼저 적용하면 증가를 막는다(S).

### 프로세스
- **[P1·S] 무인 세션 Bash 거부 재발**: 이번 점검도 막혔다. CLAUDE.md 는 단순 명령을 허용한다고 하나 `ls`·`grep` 복합 한 줄이 거부됨(복합 명령 규칙). 단순 명령 한 개씩은 시도하지 않았다 — 다음 세션은 단순 명령으로 확인해 볼 것.

### 권고 큐 (다음 구현 세션)
1. G(사람) → 2. W3 → 3. W4 → 4. 신고 숨김 라우트(P0, 결정 없으면 기본값) → 5. 라우트 테스트 묶음 → 6. C 알림 → 7. `best=1` 필터.

## 격차 분석 2026-11-14 (W47 토요일)
### 10-24 항목 상태 (정정)
- 해결: 보호 수준(`src/lib/protection.ts`, `protection-service.ts`·`tests/protection.test.ts`), 갤러리 통합 탭(`/theme/[slug]`), 라이트 토큰 정의(globals.css `data-theme`), 알림·댓글 투표 **모델**(schema.prisma:311 `CommentVote`, :331 `Notification`, :304 `conceptAt`).
- 그대로: 신고→제재 경로 없음(`isRemoved = true` 를 쓰는 코드 grep 0건), 처리방침·약관 라우트 없음, `ink` 브리지 생존(tailwind.config.ts:10~11, 사용 97곳·21파일: `theme/[slug]/page.tsx` 25, `how-ranking-works` 11, `[tier]/page.tsx` 9, `themes/page.tsx` 8).
- 정정: `*.tsbuildinfo` 는 이제 `.gitignore:7` 에 있음(추적 해제 여부만 재확인). 테스트 파일 21개로 늘었으나 라우트 테스트는 여전히 `me`·`vote` 뿐.

### P0 — 막힌 것
- **[P0·사용자·S] `db:push` 미적용 19일째(11-13 회고 18일 기준).** A-4a·T1·V1 스키마(`SituationCategory`, `PageView`, `ViewMark`, `CommentVote`, `Notification`, `Theme.kind`)가 운영 DB 에 없다. `npm run build` prerender 게이트가 막혀 있고(PROGRESS.md:19, :32~35), 이후 모든 작업(P1·C·S)의 선행 조건. 근거 PROGRESS.md:35 "db:push(사람)". 월요일 첫 일.
- **[P0·사용자·S] `taxonomy.json` 시드 import 불가.** `content/taxonomy.json` 은 `content:check` 에서 오류(최상위에 gallery·items 필요, facts.txt 11-14)이고, `parseTaxonomySeed`(src/lib/taxonomy.ts)에 맞는 실행 래퍼가 `scripts/` 금지라 없다. 분류 카드(`situation.ts`)는 데이터 없이 빈 화면. 결정: `content-check` 가 taxonomy 파일을 구분하게 할지(`src/lib/content-check.ts`, 코드라 가능), 래퍼를 사람이 만들지.

### 기능 격차 (설계 대비 코드)
- **[P1·M] 조회 지표가 아직 끊겨 있다.** `/api/views`(src/app/api/views/route.ts:13)는 있으나 호출하는 클라이언트 컴포넌트가 없다(`src/components` 에서 `/api/views` grep 0건). 인기 점수에도 조회 항 연결 없음(`popularity.ts` 사용처는 `theme/[slug]/page.tsx:14`뿐). 주의: ADR 0001 은 조회수를 **순위 점수에 넣지 않는다** — 분류 카드의 "인기" 점수에 쓸 때 ADR 범위(문서 순위 vs 분류 정렬)를 먼저 명문화할 것. 규모 M.
- **[P1·M] T2 잔여**: 중분류 "상위 요약", 3개 미만 리프 합치기, "인기 산정 방식" 공개 페이지(`how-ranking-works/page.tsx` 에 분류 인기 설명 없음), `unstable_cache(60초)`(`src/app` 에서 `unstable_cache` grep 0건 → 분류 카드가 요청마다 집계). 근거 PROGRESS.md:33.
- **[P1·L] 알림·댓글 투표·개념글 구현 0.** 모델만 있고(schema.prisma:311·331) 라우트·UI 없음(`src` 에서 `commentVote`·`notification` grep 0건). 게시판 P1 이 흡수(PROGRESS.md:36·39·40). 알림 3종·헤더 배지·90일 정리 포함.
- **[P1·L] `Item.sources` 필드·각주 렌더 없음.** `EDITABLE_FIELDS` 에 `sources` 없음(wiki.ts:8~17), Item 컬럼 없음. 현재 `sources` 는 콘텐츠 JSON 검증에만 존재(content-check.ts:85~105). 콘텐츠 `facts` 전환의 선행.
- **[P2·M] 게시판 `Post`·`PostVote`·추천 답변(P1~P3) 스키마도 없음** — W48 월~수 (PROGRESS.md:36~38).

### 보안·운영
- **[P0·M] 신고 처리 경로 없음 (10-24 이후 변화 없음).** `Report` 는 쌓이기만(schema.prisma:420), 처리 UI·`Sanction` 없음. 결정 대기(ref-security Q7). 최소안: 목록+`isRemoved` 토글+기록.
- **[P1·S] `vid` 쿠키에 `Secure` 없음·서명 없음**(src/app/api/views/route.ts:45). HttpOnly·SameSite 는 있음. HMAC 서명은 환경변수 신설 필요(사용자 결정, 11-13 보고 4). 위조 시 한도 우회 가능하나 점수 영향은 해시 단위 중복 제거 수준.
- **[P1·S] cron 인증이 `CRON_SECRET` 단일**(src/lib/api.ts:25). 미설정 시 동작 확인 필요: ROADMAP W43-1 은 "필수화"라 했음 — 라우트 테스트 없음(`tests/` 에 cron·views 라우트 테스트 없음, `views.test.ts` 는 순수 함수 수준 추정). 확인 후 테스트 추가.
- **[P1·M] 라우트 테스트 공백 확대**: edit·revert·items·reports·views·cron 라우트(되돌리기, 보호 403, 409, 한도) 무테스트. `tests/` 에 `me-route`·`vote-route` 뿐.
- 이월 유지: 처리방침·약관 페이지 없음(P0·S 최소안), SQLite 백업 자동화 부재(P1·M, `scripts/` 금지 → 사용자), CSP `'unsafe-inline'`(P1·낮음).

### 프론트·디자인
- **[P1·L] `ink` 치환(97곳) 지연**: 브리지로 보이기는 하나 W47 K·D 0건. 라이트 토글·가드 2번·`useOptimistic`(src 에 사용 0건)은 W48. 디자인 가드 테스트(`tests/design-tokens.test.ts`)는 있음 → 치환 단위를 파일 그룹으로 쪼개 소규모 커밋 권장(예: `theme/[slug]/page.tsx` 25곳 먼저).
- **[P1·S] 접근성 자동 점검 없음**(10-24 항목 유지). 라이트 토글 도입 시 대비 가드와 함께.
- **[P2·M] Playwright 시각 회귀 없음**(W46-4 → W48, 의존성 설치 허용·시드 DB 선행).

### 무인 운영·프로세스 부채
- **[P1·S] Bash 거부 재발**: 11-09·11-10 월·화 구현 0건(11-13 회고). 원인 기록 없음 → 허용 목록 변경 이력을 남길 것(사용자).
- **[P1·S] 안티의 `content/*.json` 쓰기 차단** — 대화형 Claude 가 옮기는 현 방식 유지/해제 결정 필요(11-13 보고 3).
- **[P1·S] 크레모아 인용 대조 불일치**: 11-14 facts 의 `인용[1] NOT_FOUND`(camping-2.json 크레모아 판매가·재입고 인용 2건)는 JS 렌더 의심 — 이미 안티가 재고 정정함. 다음 점검에서 실측 재확인.
- 낡은 가격(다나와 3건)·가격 재확인 주기: 이월.

## 격차 분석 2026-10-24 — 로드맵 안의 미완 (참고, 중복 등재 아님)
- W44 잔여 5개(4a·1·2·3·4b/c)가 모두 미착수 — PROGRESS.md:14~19. 코드 근거: `ink` 브리지가 아직 살아 있고(tailwind.config.ts:9) `text/bg/border-ink` 류 78곳·22개 파일이 남음(`src/app/**`, `src/components/**`). 라이트 테마 변수 없음(globals.css:8~10 다크 값만).
- 문서 보호 수준 없음: `src/lib/protection.ts` 파일 부재, edit/revert 라우트에 403 분기 없음(`src/app/api/items/[id]/edit/route.ts:44` 부근은 isRemoved 만 검사).
- 갤러리 통합은 리다이렉트만 완료(`src/app/gallery/[slug]/page.tsx:1~8`). 탭·정렬·티어 필터·인포박스 없음.

## 격차 분석 2026-10-24 — 새로 찾은 항목
### 보안·운영
- **[P0·M] 신고→제재 경로가 없다.** `Report` 는 쌓기만 하고(prisma/schema.prisma:327~339) 처리 화면·API·`Sanction`/`AuditLog` 모델이 없다. `Item.isRemoved`(schema.prisma:177)를 세팅하는 코드도 없다(grep: 읽기 전용 사용만, `scoring-service.ts:60`, `recent/page.tsx:23` 등). 스팸·권리침해 신고가 들어와도 조치 수단이 DB 직접 수정뿐. ref-security.md §3.4~3.5. 로드맵 W45-4 를 앞당길지 결정 필요(최소안: 신고 목록 + `isRemoved` 토글 + 기록 1줄, S~M).
- **[P0·S] 개인정보 처리방침·약관·저작권/임시조치 안내 페이지 없음.** `src/app` 에 해당 라우트 없음, 로그인(OAuth)으로 개인정보를 수집 중(`src/lib/auth.ts`). ref-security.md §4. 로드맵은 W46-3 이나 공개 운영 전 필요 → 정적 페이지 최소안만 앞당기기 권장(S).
- **[P1·M] SQLite 백업 자동화 부재.** 절차는 문서뿐(`DEPLOY_NAS.md:111~124`), 컨테이너/스크립트에는 없음(`docker-compose.yml:5` 는 문서 참조만). `scripts/` 수정 금지 영역이라 사용자 결정 필요. 복구 리허설 기록도 없음(ref-security.md §2.9).
- **[P1·M] CSP 에 `'unsafe-inline'`**(next.config.mjs:19~20). nonce 도입은 코드 주석에서도 후속 과제로 표시. 사용자 입력 마크다운은 raw HTML 금지라 위험은 낮음 → 낮은 우선.
- **[P1·S] 레이트 리밋이 DB 카운트 방식**(`src/lib/abuse.ts:5~21`, `countSince` api.ts:31). 쓰기 API 에만 적용. 로그인 시도·검색(`/api/search`)·GET 은 제한 없음(ref-security.md §2.3 대조). 읽기 폭주는 리버스 프록시(NAS) 단에서 제한하는 안 검토.
- **[P2·M] 다계정 투표 조작 방어는 몰림 플래그뿐**(`abuse.ts:23~25` 검토 큐 적재 목적). 계정 연령/기여 가중은 `trust.ts` 에 있으나 신규 계정 투표 가중 0 규칙의 테스트가 `tests/vote-route.test.ts` 에서 확인되지 않음 → 확인 후 테스트 보강(S).

### 백엔드·데이터
- **[P1·L] 출처/각주 필드화(W46-1 선행 조사)**: `EDITABLE_FIELDS` 에 `sources`·`tags` 없음(`src/lib/wiki.ts:8~17`), `Item` 에도 컬럼 없음(schema.prisma:150~191). 콘텐츠 `facts` 전환(아래)의 전제. 비파괴 변경(컬럼 추가)만 필요.
- **[P1·M] 알림·댓글 투표·개념글 모델 없음**(schema.prisma 모델 목록에 `Notification`·`CommentVote` 부재). W45-1·2 의존, 일정만 확인.
- **[P2·S] 테스트 공백**: 라우트 테스트가 `me`·`vote` 뿐(`tests/me-route.test.ts`, `tests/vote-route.test.ts`). edit/revert/items/reports 라우트 테스트 없음(되돌리기·충돌 409·레이트 리밋 경로). 보호 수준(W44-1) 구현 시 같이 추가.
- **[P2·S] 수동 되돌리기 해시 감지 커버리지**: `contentHash` 인덱스는 있음(schema.prisma:213). 정규화 규칙 변경 시 과거 해시 무효화 위험 → 정규화 버전 필드 또는 문서화 필요.

### 프론트·디자인
- **[P1·S] 접근성 기본 점검 미실시**: ref-frontend.md §4.3 요구(포커스 링, 대비, aria) 대비 자동 점검 없음. `ink` 치환(W44-4) 이후 대비 가드 테스트와 같이 처리.
- **[P2·M] Playwright 시각 회귀 없음**(`package.json` 의존성에 playwright 부재). W46-4.
- **[P2·S] `tsconfig.tsbuildinfo`·`scripts/__pycache__/*.pyc` 가 git 추적 중**(git ls-files 확인). `.gitignore` 에 추가하고 추적 해제 필요(rm 금지 규칙이라 `git rm --cached` 는 사용자 결정).

### 무인 운영(프로세스 부채)
- **[P0·사용자 결정] 무인 구현 세션이 Bash 거부로 막힘** — 10-23 dev 보고 "사용자 결정 필요 1". 이번 세션도 파일 읽기 이후 Bash 가 거부되어 **커밋 불가**. W44 잔여 5개가 같은 이유로 지연. 권한 범위(`git`·`tsc`·`vitest`·`build`)를 정하지 않으면 로드맵이 계속 밀림.
- **[P1·S] 낡은 가격 노출**: 다나와 가격 3건 미반영(10-23 dev 보고). 수동 반영 또는 Gemini 재개 필요.

## 기능 (기존)
- [W42 진행] 마이페이지 `/me` + Karma 진행도 — `docs/design/2026-W42-mypage-karma.md`
- ~~기여 이벤트 로그(`ContributionEvent`)~~ → W43-3 로 완료 (schema.prisma:219). 남은 것: 문서 삭제·롤백 후에도 이력이 보존되는지 `backfill-contributions.ts` 와 함께 확인(S)
- Q&A 글쓰기 폼 (AGENT_HANDOVER 제안 항목) — P2·M

## 콘텐츠·운영 (기존)
- 본문을 `facts:[{sentence, source, quote}]` 로 조립하는 구조 전환 — P1·M. 현재 자유 서술(`content/camping.json`)에서 반복된 지표 우회의 근본 대책. W46-2 와 동일, `sources` 필드화가 선행.
- `content:check` 가격 검사: 다나와 URL 이 있으면 `price:danawa` 조회값과 1% 이내·`status OK` 확인 — P1·S (`src/lib/content-check.ts`, `scripts/danawa-price.ts`)
- 가격 재확인 주기(예: 주 1회)와 다나와 약관 확인 — P1·S
- 자동 실행 전용 Antigravity 대화 분리 (사용자 채팅과 `ai` 응답 섞임 방지) — P2·S
- `tools/ai-cli` 브랜치 보존, `content:verify` 통합(선택) — P2·S
