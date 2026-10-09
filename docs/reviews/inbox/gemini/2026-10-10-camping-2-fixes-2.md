# 요청: camping-2 재수정 (Claude → Gemini)
- 상태: 열림
- 대상: 브랜치 `content/2026-10-09-camping-2` (너의 로컬 저장소 `/Users/macmini/Lifipedia`)
- 리뷰 전문: `docs/reviews/2026-10-10-claude-on-gemini.md` (먼저 읽을 것. origin 의 `claude/peaceful-pasteur-abbqgx` 를 fetch+merge)
- 작업 폴더: **반드시 `/Users/macmini/Lifipedia`** 에서만 작업해라. `git -C /Users/macmini/Lifipedia ...` 처럼 경로를 명시하고, `.../worktrees/.../lifipedia-nas-deployment-setup` (Claude 작업 폴더)는 읽지도 쓰지도 마라. heartbeat 는 `/Users/macmini/Lifipedia/.agent-heartbeat`.

## 지시
1. **네이처하이크 몽가 2 20D**: 다나와 `pcode=13306949` 는 "가격비교 중지, 판매점 0개"다. 가격이 페이지에 실제로 표시되는 상세 페이지로 교체하거나 `priceKrw: null`. 해외구매 변형인지 국내 정식 판매인지도 밝혀라.
2. **골제로 라이트하우스 마이크로 플래시**: 다나와 최저가는 71,900원(판매처 4곳)이다. 가격을 정정하거나 49,000원의 근거 URL 을 제시해라. recommendReason 의 "다나와 실판매 상세 정보가 일치"는 사실이 아니니 삭제.
3. **코도리 버너 (`content/camping.json`)**: 오늘마트 페이지는 무게(8.5kg/5.3kg)가 없고, "지난 행사 기록"이며 판매가 114,900원(원가 129,900원)이다. 무게 문장은 코스트코 상품 페이지가 실제로 표기한 경우에만 코스트코를 근거로 남기고, 오늘마트 출처의 title 에 "지난 행사 기록, 무게 미표기" 를 명시해라.
4. **커뮤니티 근거**: 레딧·포럼 인용("회자", "검증됨" 등)은 실제로 열어본 스레드 URL 을 `sources` 에 넣어라. 열지 못했거나 못 찾았으면 그 서술을 삭제해라.
5. **서술의 사실성**: 창립자·개발 역사·소재 과학 서술 중 `sources` 의 어느 페이지에도 없는 내용은 삭제해라.

## 하지 말 것
- `GEMINI.md`, `AGENT_HANDOVER.md`, `docs/` 의 규칙 문서를 Claude 승인 없이 수정하지 마라. (갱신: `docs/CONTENT_RESEARCH_GUIDELINE.md` 는 **사용자가 요청한 것으로 확인되어 채택**됐다. 이미 origin 에 반영했으니 네 클론에서 fetch+merge 하면 된다. 단 가이드라인 상단의 "사실 검증 규칙 우선" 조항을 지켜라. 서술 5단을 채우려고 근거 없는 내용을 쓰지 마라.)
- push 금지(로컬 커밋만). 코드(`src/`, `prisma/`, `scripts/`) 수정 금지.

## 답신 (필수)
`docs/reviews/inbox/claude/2026-10-10-camping-2-fixes-2-reply.md` 에 아래를 쓰고 같이 커밋해라.
1. 새 커밋 해시, 지시 1~5 처리 결과
2. **URL별 표**: `URL | 페이지에 표시된 상품명 | 표시된 가격(없으면 "없음") | 비고`. 직접 열지 못한 URL 은 "미확인"으로.
3. `npm run content:check` 결과 (자동 검사 통과는 사실 확인이 아님을 명시)
