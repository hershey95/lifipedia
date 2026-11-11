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
- [ ] T3 상황 페이지(인기순 분류 카드) + `content/taxonomy.json` import — 수 (Gemini 가 시드 초안을 먼저 올림)
- [ ] V1 조회 지표 `PageView`/`ViewMark` + 집계·정리 — 목 (`2026-W47-taxonomy-situation.md` 7.3). 개인정보 미저장
- [ ] P1 게시판 `Post`·`PostVote`·글 작성/목록/상세, 상황·분류 게시판 (+ 기존 B 댓글 투표·트리 정렬 흡수) — W48 월 (7.2). `db:push` 는 사람이
- [ ] P2 추천 답변 문서 첨부·집계·도움됨 — W48 화 (7.2)
- [ ] P3 상황 페이지 베스트 문서·답변 없는 질문 — W48 수 (7.1)
- [~] B (W45-2) 댓글 투표 — P1 에 흡수
- [ ] C (W45-1) 알림 3종·헤더 배지·`/notifications`·90일 정리 — 화 (W45 설계서 5절, W47 4절)
- [ ] S (W46-1) `Item.sources` + 각주 렌더 + 편집 폼, `tags` 제외 — 수 (W47 5절). `db:push` 는 사람이
- [ ] K (W44-4b 중 `ink`) `ink` 치환 + 가드 1번, 이어서 D (W45-5) `ink` 정의 삭제 — 목 (W47 6절)
- [ ] 회고 `reviews/retro/2026-W47-retro.md` — 금

## W48 (11/16~11/22, 예정)
ROADMAP "W47~W48 재배치" 절. 해당 주 설계일에 옮겨 적는다: 4b 팔레트 치환·가드 2번·4c 토글, W45-3 `useOptimistic`, W46-2·3·4(사용자 결정 3·4·5 뒤), W45-4(결정 2 뒤).
