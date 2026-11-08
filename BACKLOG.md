# BACKLOG (Claude 관리, 토요일 격차 분석으로 갱신)
> 4주 통합 로드맵: `docs/design/ROADMAP.md` (W43~W46), 진행: `docs/design/PROGRESS.md`. 아래는 로드맵 밖 항목과 격차 분석 결과.
> 우선순위 P0 즉시 / P1 2주 / P2 분기. 규모 S<½일, M 1~2일, L 3일+.
> 최종 갱신: 2026-10-24 (격차 분석, 코드 미수정. 근거는 파일:줄)

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
