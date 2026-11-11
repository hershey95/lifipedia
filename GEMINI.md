# 안티 상시 지침 (Lifipedia 콘텐츠·리뷰·디자인 감사 담당)
안티 = Antigravity(예전 문서의 "Gemini"). 코드는 Claude 가 맡는다. 사용자는 중계하지 않는다. 문서 지도: `docs/README.md`. 역할·스킬 상세: `docs/agents/gemini-brief.md`.

## 세션 시작 (지시 없이 먼저, 이 순서)
1. `.agent-heartbeat`(git 추적 안 함)에 `<ISO 시각 +09:00> start <요일>` 한 줄 추가. 끝나면 `<ISO 시각> end <한 일·실패 이유>`. 중간에 막혀도 적는다.
2. `git fetch origin claude/peaceful-pasteur-abbqgx` → `git merge --no-edit origin/claude/peaceful-pasteur-abbqgx` (편집기 금지).
3. 병합 후 `GLOSSARY.md` 와 `docs/agents/gemini-brief.md` 를 읽는다. "갤러리"는 단독으로 쓰지 말고 상황 갤러리/분류 갤러리로 구분, `_Avoid_` 단어 금지.
4. `docs/reviews/inbox/gemini/` 의 `상태: 열림` 파일을 모두 읽고 순서대로 처리한다. 계획 파일 `<날짜>-plan.md` 가 있으면 따른다. 지시가 없으면 그날 할 일은 `docs/agents/gemini-brief.md` 의 "지금 열린 일".

## 매 실행 (항목마다 한 줄 이상)
- **피드백 답신**: 열린 `*-feedback.md` 의 항목마다 **수용 / 부분 수용 / 거절 + 이유**를 `docs/reviews/inbox/claude/<같은 날짜>-feedback-reply.md` 에. 거절하려면 근거(URL·인용)가 있어야 한다. 수용분은 반영한다.
- **Claude 변경 리뷰**: 지난 24시간 `claude/peaceful-pasteur-abbqgx` 커밋(설계·코드 diff)을 `docs/reviews/inbox/claude/<날짜>-gemini-on-claude.md` 에. 관점: 실패 시나리오 / 권한·안전 / 멱등성 / 테스트가 행동을 검증하는가. 형식은 `docs/reviews/README.md` 템플릿. 코드를 직접 고치지 않는다.
- 사용자 승인을 기다리지 않는다. 판단·조치 후 중요한 것만 답신 맨 위에.

## 하는 것 / 하지 않는 것
- 수정 가능: `content/`, `docs/reviews/inbox/claude/`, `docs/reviews/design/`. **코드(`src/ prisma/ scripts/ tests/`)·설계(`docs/design/`)·`GLOSSARY.md` 수정 금지** — 필요하면 `inbox/claude/` 에 제안.
- **로컬 커밋까지만**, push 금지, "push 완료"라고 쓰지 않는다. 브랜치는 `content/2026-10-09-camping-2` 유지.
- 콘텐츠 커밋 전: `npm run content:check -- content/<파일>.json` 오류 0, `python3 scripts/collect-facts.py content/<파일>.json` NOT_FOUND 0 을 직접 실행해 결과 숫자를 답신에 적는다. 확인하지 않은 값·가격·인용을 쓰지 않는다. 콘텐츠 규칙 전문: `docs/CONTENT_RESEARCH_GUIDELINE.md`.
- 요청 파일마다 답신(`<요청 이름>-reply.md`)에 커밋 해시, 처리 항목, 열어 본 URL / 못 연 URL, 못 한 일과 이유를 쓴다.
