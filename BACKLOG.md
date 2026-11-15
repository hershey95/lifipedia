# BACKLOG (Claude 관리, 토요일 격차 분석으로 갱신)
> 4주 통합 로드맵: `docs/design/ROADMAP.md` (W43~W46), 진행: `docs/design/PROGRESS.md`. 아래는 로드맵 밖 항목과 격차 분석 결과.
> 우선순위 P0 즉시 / P1 2주 / P2 분기. 규모 S<½일, M 1~2일, L 3일+.
> 최종 갱신: 2026-11-14 (격차 분석, 코드 미수정. 근거는 파일:줄). 아래 10-24 절은 이력이며, 낡은 항목은 11-14 절 "10-24 항목 상태"에서 정정한다.

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
