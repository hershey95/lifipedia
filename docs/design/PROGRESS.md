# 로드맵 진행 상태 (무인 개발 세션이 갱신한다)
`docs/design/ROADMAP.md` 의 작업 번호와 1:1. 상태: `[ ]` 대기, `[x]` 완료(커밋 해시), `[~]` 보류(이유). 무인 세션은 위에서부터 첫 `[ ]` 를 집는다.

## W43 (10/12~10/18)
- [x] 1 SQLite 확정 (8372b6d)
- [x] 2 보안 헤더·레이트 리밋 (812e2b4)
- [x] 3 기여 원장·되돌리기 API (dfe585d, eec349a, 5c694d3)
- [x] 4 ink 브리지 (87e0726)
- [~] 5 마크다운 렌더·목차 완료(af66789, 252cd45), 인포박스는 W44-3 에 합친다
- [x] 6 /recent (8f94f61)

## W44 (10/19~10/25)
설계서: `docs/design/2026-W44-protection-gallery.md` (8.1 요일표 순서로 집는다. 번호는 ROADMAP 과 같다)
- [x] 5 (490db33, 게이트는 사람이 확인) 버그 3건 — 월: `/gallery` 308 리다이렉트로 FollowButton 해결, 투표 트랜잭션 + 버튼 busy, 몰림 신고 `USER` 1건 (설계 7절)
- [~] 4a·1·2·3·4b·4c — 미착수, **W45 로 이월**(무인 세션 Bash 권한 문제, `reviews/retro/2026-W44-retro.md`). 아래 W45 섹션에서 집는다

## W45 (10/26~11/1)
설계서: `docs/design/2026-W45-comment-vote-notify.md` (8.1 작업 큐 순서로 집는다. A = W44 이월, 설계는 W44 설계서 절 번호)
- [x] A-4a 토큰 정의 + 스키마 한 번에 (c8c6651) — **`db:push` 는 미적용**(무인 금지 사항, 사람이 실행해야 함). 라이트는 `data-theme="light"` 로만 켬
- [x] A-1 문서 보호 수준 `protection.ts` + edit/revert 403 + 화면 (fdbe618) — 빌드 prerender 는 DB 미동기화로 실패, 컴파일·타입은 통과
- [x] A-2 분류 `/themes?category=` + 주시목록 `/recent?scope=following` (cbcfc31) — 화 (W44 4절)
- [x] A-3 갤러리 통합 `/theme/[slug]?tab=` + 문서 인포박스 (8b21b9e) — 수 (W44 5절). 최근 변경은 측면 대신 하단 섹션. `/gallery` 308·링크 교체는 이미 완료 상태였음
- [~] B·C·A-4b·4c·D — 미착수, **W47 로 이월**. 10-28 이후 구현 보고(dev.md) 없음
- [~] W45-3 `useOptimistic` — W48 로 (W47 설계서 9절 #4)
- [~] W45-4 신고 처리·제재 — 검토자 결정 대기 (W45 설계서 7.2)

## W46 (11/2~11/8)
- [~] 구현 세션 기록 없음, 설계서 미작성. W46-1 은 W47 로, W46-2·3·4 는 W48 로 (W47 설계서 2절·7절)

## W47 (11/9~11/15)
설계서: `docs/design/2026-W47-community-sources.md` (8.1 작업 큐 순서로 집는다). 실패해도 그날 `dev.md` 를 남긴다.
- [x] T1 (fce36ef) 스키마 `Theme.kind`·`SituationCategory` + `taxonomy.ts` 순수 함수(`planReassignment` 포함). **`db:push` 미적용(사람)**. 실행 래퍼 스크립트는 `scripts/` 수정 금지라 미작성 — 사람이 `planReassignment` 로 2줄 래퍼를 만들거나 `scripts/` 허용 필요
- [~] T2 (db0c22e) `popularity.ts`(+테스트)·분류 페이지 경로·하위 분류 칩 완료. **남음**: 중분류의 하위 리프 1위 모음("상위 요약"), 문서 3개 미만 리프 합치기, "인기 산정 방식" 공개 페이지, `unstable_cache(60초)` 연결 — T3 와 함께 집는다
- [x] T3 (f1db17a) 상황 페이지 인기순 분류 카드(`situation.ts` `buildSituationCards`) + 시드 검증 `parseTaxonomySeed`. **남음**: `taxonomy.json` import 실행 래퍼(`scripts/` 금지, 사람) · `content:check` 연결 · 시드 파일 자체(`content/taxonomy.json` 없음)
- [x] V1 (커밋 해시는 dev.md 참조) 조회 지표 `PageView`/`ViewMark` 스키마(추가만) + `views.ts` + `POST /api/views` + 표식 2일 정리(cron). **남음**: 페이지에서 호출하는 클라이언트 컴포넌트, 인기 점수에 조회 항 연결, `db:push`(사람)
- [~] P1·P2·P3 게시판 — **W48 로** (아래 W48 섹션)
- [~] B (W45-2) 댓글 투표 — P1 에 흡수, W48 남는 날 ②
- [~] C (W45-1) 알림 3종 — W48 남는 날 ③
- [~] S (W46-1) 출처 구조 — W48 남는 날 ⑤
- [~] K·D `ink` 치환·삭제 — W48 남는 날 ⑥
- [x] 회고 `reviews/retro/2026-W47-retro.md` (4f470ef)
- T2·T3·V1 의 "남음"은 아래 W48 의 M1·M2 로 옮겼다.

## W48 (11/16~11/22)
설계서: `docs/design/2026-W48-board-taxonomy.md` (2절 표 순서로 집는다. 절 번호는 이 설계서 기준). G 가 안 되면 W48 의 `[x]` 전부에 "build 미확인"을 적는다.
- [~] G **사람만**: `dev.db` 백업 → `npm run db:push` → `npm run build` 확인 → `scripts/` 3건(collect-facts `items` 건너뛰기, 시드 import 래퍼, 재배치 래퍼) → `content/taxonomy.json` 가져오기 → Bash 허용 상태 한 줄 기록 (3절). 무인 세션은 집지 않는다
- [x] M1 (ecb9a5b, build 미확인: db:push 전이라 prerender P2021) 분류 마감 — 월: `content:check` 시드 분기, 상황 카드 `unstable_cache(60)`, `summarizeChildren`(상위 요약·3개 미만 합치기), `how-ranking-works#popularity`, 문구 "배치"·"문서" (5절)
- [x] M2 (0711c25, build 미확인) 조회 지표 연결 — 월(넘치면 화 오전): `ViewBeacon`, 인기의 조회 항, `vid` `Secure`(https 때), IP 한도기 정리, `views-route.test.ts` (6절)
- [x] P1 (fe7304a, build 미확인: db:push 전이라 prerender P2021. **`db:push` 2차(사람) 필요**) 게시판 — 화~수: `Post`·`PostVote`·`PostComment`·`PostCommentVote`·`AnswerItem` 스키마(추가만) + `comments.ts`·`board.ts` + 라우트 4개 + 게시판·글쓰기·글 상세. 끝나면 **`db:push` 2차(사람)** (7절)
- [x] P2 (2c550a3, build 미확인, P1 과 같은 `db:push` 2차에 포함) 답변 문서 첨부·집계·도움됨(기여 적립 없음) — 목 (8절)
- [x] 회고 `reviews/retro/2026-W48-retro.md` (11-20) — 금 (금요일 회고 세션만 집는다. 구현 세션은 건너뛰고 남는 날 ①부터)
- [x] 남는 날 ① P3 베스트 문서·답변 없는 질문 (de637ab, build 미확인: db:push 전이라 prerender P2021) (9절 1)
- [x] 남는 날 ② B 토론 댓글 투표·개념글 (4acb566, build 미확인) (9절 2, W45 4.3~4.6). **남음**: 4.5 갤러리 토론 탭 `best=1` 개념글 필터(`feed.ts`), 개념글 알림(C)
- [~] 남는 날 ③~⑥ (C·`useOptimistic`·S·K) — **W49 큐로 옮김**(아래 W49 섹션, W1~W4 다음). 첫 `[ ]` 규칙은 그대로 따르므로, 11/19(목) 구현 세션은 W49 W1 부터 집는다
- [~] 4b 팔레트·가드 2번·4c 토글 — 육안 확인(사람)과 K 선행 (2절 막힌 것)
- [~] W46-2 `facts`·`content:import` — `scripts/` 허용과 S 선행
- [~] W46-3 처리방침·약관·계정 삭제 — 운영자 사실 4가지
- [~] W46-4 Playwright — 의존성 설치 허용 + 시드 DB
- [~] W45-4 신고 처리·제재 — 검토자 결정

## W49 (11/23~11/29)
설계서: `docs/design/2026-W49-wiki-features.md` (6절 순서로 집는다. 위키백과 기능 전수조사, 11/18 사용자 지시). **일요일 설계 세션: 이 섹션과 설계서는 이미 있다. 새 W49 문서를 만들지 말고 순서만 조정한다.** W1~W4 는 새 스키마를 만들지 않는다. 하지만 build 는 G(`db:push`) 전까지 기존 페이지의 `P2021` 로 실패한다. 이 실패는 "build 미확인"으로 적고, 원인을 찾느라 시간을 쓰지 않는다.
**11-22 조정**: 순서는 설계서 **10절**을 따른다(10.3 요일표). R 추가, G 분리, S·K 는 W50 으로 확정.
- [~] G-사람 **사람만**: `dev.db` 백업 → `npm run db:push`(1·2차 한 번에) → `npm run build` 확인. 되면 월요일 첫 일은 통합·육안 점검(10.3 오른쪽 열). 무인 세션은 집지 않는다
- [~] G-대화형 **대화형 Claude 만**(`scripts/` 수정): ① `collect-facts.py` `KeyError: 'items'`(`taxonomy.json` 건너뛰기) ② 시드 import·재배치 래퍼 ③ `taxonomy.json` 키 변환 ④ 무인 Bash 허용 상태 한 줄 기록. 무인 세션은 집지 않는다
- [x] W1 (65922ab, build 미확인: P2021) 리비전 비교 `history?from=&to=` · 고정 링크 `?rev=N` · 되돌리기 버튼 (6절 W1)
- [x] W2 (b82d38d, build 미확인: P2021) 위키링크 해석: 빨간 링크·동명 문서·역링크 (6절 W2)
- [ ] R-1 W1·W2 수용 수정: `?rev=` 폴백·리졸버 `ACTIVE`·`missing=1`·역링크 세 필드·삭제 문서 history 404·되돌리기 버튼 보호 수준·`min-w-0`·`테마` 문구 (10.4, 11-20 답신) — 월
- [ ] R-2 B 수용 + 분류 갤러리 토론 탭 `best=1`: 고아 `parentId`·`conceptAt` 원자화·`feed.ts` `best` (10.4, 11-19 답신, W45 4.5) — 월
- [ ] W3 기여할 거리 `/contribute` + 토막 문서 (6절 W3) — 월~화
- [ ] W4 편집 필터(가격 급변·대량 삭제·차단 도메인) + 계산형 변경 태그 + `?rev=` 다른 URL 필드 점검(회고 4절 #6) (6절 W4) — 화
- [ ] C 알림 3종 (W45 5절, 10.5) — 수~목, **W49 마감**
- [ ] `useOptimistic` 세 투표 버튼 (W48 설계서 9절 4, 10.5) — 목, **W49 마감**
- [ ] W5 작은 것 묶음: 편집 임시 저장·`/random`·문서 정보·새 문서 필터·기여 목록·보호 중 문서 (6절 W5) — 남는 칸만, 못 하면 W50
- [ ] 회고 `reviews/retro/2026-W49-retro.md` — 금
- [~] 신고 처리(W45-4) — 사용자 결정 (a) 환경변수 (b) 규칙 계산형 (c) 보류. 설계서 0절 거름망 1 과 부딪쳐 결정 전에는 착수하지 않는다(10.1 #6)

## W50 (11/30~12/6)
설계서는 11/29 일요일 설계 세션이 쓴다. 11-22 에 W49 에서 확정 이월한 것:
- [ ] S 출처 구조 (W47 5절) — 스키마 추가라 G-사람 선행
- [ ] K `ink` 치환 105곳 + 가드 1번 → D 삭제 (W47 6절) — 파일 그룹별 커밋
- [ ] W49 W5 중 못 한 것, W49 설계서 7절 표
