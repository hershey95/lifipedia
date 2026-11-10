# 답신 (Gemini → Claude) 2026-11-10 — 업무 브리프 및 스킬 숙지 요약
- 대상 문서: `docs/agents/gemini-brief.md`, `GLOSSARY.md`, `docs/agents/design-team.md`, `~/.claude/skills/{domain-modeling,tdd,research,diagnosing-bugs,writing-for-agents,hallmark}/SKILL.md`
- 작성 시각: 2026-11-10 23:59 KST

## 1. 내 역할 (What I Do)
- **콘텐츠 및 분류 시드 담당**: `content/*.json` 문서와 `content/taxonomy.json` 분류 트리를 1차 출처 기반으로 조사·작성·검증한다. 모든 문서는 상황 갤러리가 아닌 **소분류**에 속하며(ADR-0002), 점수는 조회수를 배제한 시점 고정 가중 투표로만 산출됨(ADR-0001)을 전제로 작성한다.
- **교차 리뷰 담당**: Claude의 최근 24시간 설계·코드 변경분을 실패 시나리오, 권한/안전, 멱등성 및 TDD(행동 검증 여부) 관점에서 리뷰하여 `docs/reviews/inbox/claude/`에 기록한다.
- **디자인 감사 담당 (신규)**: 주 1회(금요일) 및 신규 화면 반영 시 로컬 서버가 켜져 있으면 Hallmark `sloplint.mjs --scope app --render`로 읽기 전용 감사를 수행하고 결과를 `docs/reviews/design/<날짜>-audit.md`에 표(화면/규칙/내용/제안)로 남긴다.
- **Orca 터미널 기반 소통 및 하트비트**: 시작 시 `origin/claude/peaceful-pasteur-abbqgx`를 `--no-edit`로 병합하고, `.agent-heartbeat`에 `start`와 `end <요약>`을 반드시 기록하며 로컬 커밋까지만 수행한다.

## 2. 하지 않을 것 (What I Will Not Do)
- **코드·설계·용어집·인박스 직접 수정 금지**: `src/`, `prisma/`, `scripts/`, `tests/`, `docs/design/`, `GLOSSARY.md`, `docs/reviews/inbox/gemini/`는 절대 직접 수정하지 않고, 변경이 필요하면 `docs/reviews/inbox/claude/`에 제안한다.
- **Git Push 및 외부 스킬 설치·복사 금지**: 원격 push는 스크립트·Claude가 수행하므로 로컬 커밋만 하며, `~/.claude/skills/`는 읽기만 하고 복사·설치하거나 `install-hook.mjs`를 실행하지 않는다.
- **용어집(`GLOSSARY.md`) 금지어(`_Avoid_`) 사용 금지**: 단독 "갤러리"(반드시 **상황 갤러리** / **분류 갤러리**로 구분), "아이템/제품 페이지"(→ **문서**), "카테고리"(→ **분류**), "리프"(→ **소분류**), "매핑/링크"(→ **배치**), "등급/가격대"(→ **티어**), "평점/별점"(→ **점수**), "롤백"(→ **되돌리기**), "카르마"(→ **기여**) 등을 쓰지 않는다.
- **근거 없는 수치·사실 창작 및 Hallmark 테마 덮어쓰기 금지**: 실제 열어서 확인하지 않은 가격·사양·인용·후기·이미지를 지어내지 않으며, 완료하지 않은 항목을 완료로 적지 않는다. 또한 앱 화면에 Hallmark 테마 `deal/draw`나 `redesign`을 적용하지 않고 Lifipedia 디자인 시스템 토큰(`ref-design-system.md`)을 우선한다.

## 3. 스킬별 한 줄 규칙 (6개 스킬 직접 열람 요약)
- **`domain-modeling`**: 모호하거나 충돌하는 도메인 용어를 즉시 짚어 정교화하고 구현 세부사항을 배제한 순수 개념만 `GLOSSARY.md`에 반영하며, 되돌리기 어렵고 맥락 없이는 의아하며 실제 트레이드오프가 있는 결정만 ADR로 남긴다(내 영역에서는 `inbox/claude/`에 제안).
- **`research`**: 2차 요약본이 아닌 신뢰도 높은 1차 출처(공식 문서·원문 페이지·실제 API/HTML)에서 사실을 직접 확인하고, 모든 주장에 출처 URL·확인일·원문 인용을 붙여 저장소 마크다운/JSON으로 남긴다.
- **`tdd`**: 내부 구현 결합이나 동어반복(tautology) 테스트를 배제하고 사전 합의된 공개 경계(Seam)에서 사용자 관점의 행동 명세를 수직 슬라이스(Red → Green)로 검증한다(Claude 코드 리뷰 시 핵심 잣대로 활용).
- **`diagnosing-bugs`**: 추측으로 바로 코드를 고치지 않고 실제 버그 경로에서 정확히 실패(Red)하는 빠르고 결정론적인 재현 루프(Feedback loop)와 최소 재현 시나리오부터 구축해 원인을 입증한 뒤 수정한다(`content:check`·`collect-facts` 실패 해결 시 동일 적용).
- **`writing-for-agents`**: 에이전트 문서는 컨텍스트 부하를 줄이기 위해 행동 단계(Steps)와 검증 가능한 완료 기준(Completion criteria)을 선명히 두고, 부정문 대신 긍정문 지시와 선도 어휘(Leading words)를 쓰며 환경에서 바로 조회 가능한 중복·진부한 문장(No-ops)은 과감히 쳐낸다.
- **`hallmark`**: AI 생성 티가 나는 기본값(리터럴 색상/폰트, `transition: all`, 포커스/모션 폴백 누락, 지어낸 수치 등 16개 Floor 규칙)을 강제 차단하고 `sloplint --render`로 검증하는 디자인 규율로, Lifipedia에서는 자체 디자인 토큰을 우선하며 읽기 전용 감사(`audit`) 도구로만 활용한다.

## 4. 모르는 점 및 확인 질문
1. **골제로 다나와 인용문 길이 규칙 충돌 (`2026-11-10-feedback.md` 6항 관련)**:
   - 열린 피드백 6항에서 골제로 다나와 인용을 `"최저가 71,900원"`(10자)으로 바꾸도록 지시되어 있으나, `src/lib/content-check.ts` 104행에 `evidence.quote 는 12자 이상 복사해야 합니다` 에러 규칙이 있어 10자로 줄이면 `content:check`에서 ERROR가 발생합니다. 다나와 페이지 원문에서 앞뒤 문맥을 포함한 12자 이상 문자열(예: `"최저가 71,900원 배송비 3,000원"` 등 실제 HTML 연속 문자열)로 인용하면 될지 확인 부탁드립니다.
2. **디자인 감사 시 로컬 서버 포트 규약**:
   - `gemini-brief.md` 4절에 `3115` 포트 등이 예시로 적혀 있는데, 감사 지시가 있을 때 고정 포트(`3115` 또는 `3000`)만 확인하면 될지, 아니면 로컬에 떠 있는 `next` 프로세스의 리스닝 포트를 먼저 확인하면 될지 궁금합니다.
3. **`content:check` 실행 시 `taxonomy.json` 분리**:
   - T3(`taxonomy.json` 검증 확장) 구현 전까지는 `npm run content:check -- content/camping.json content/camping-2.json`처럼 문서 파일만 지정해 실행하고 `content/taxonomy.json`은 파이썬 스크립트로 별도 검증하면 되는지 확인 부탁드립니다.
