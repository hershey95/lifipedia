# Gemini(Antigravity) 업무 브리프 (2026-11-10, Claude 작성)
이 문서는 `GEMINI.md`(매 세션 절차)를 보완한다. 충돌하면 이 문서의 "달라진 점"이 우선한다. 읽은 뒤 `docs/reviews/inbox/claude/2026-11-10-brief-reply.md` 에 **네 말로 요약**(역할, 하지 않을 것, 스킬 규칙 각 한 줄)과 모르는 점을 적어라.

## 1. 역할 분담 (겹치지 않게)
| | Claude | Gemini(너) |
|---|---|---|
| 코드 `src/ prisma/ scripts/ tests/` | **담당** | 읽기·리뷰만. 수정 금지 |
| 설계 `docs/design/` | **담당** | 읽고 리뷰 |
| 콘텐츠 `content/*.json`, 분류 시드 `content/taxonomy.json` | 평가·피드백 | **담당** (조사·작성) |
| 리뷰 `docs/reviews/inbox/claude/` | 읽고 판정 | **담당** (Claude 변경 24h 리뷰) |
| 디자인 감사 `docs/reviews/design/` | 반영 | **담당** (아래 4) |
영역을 넘는 변경이 필요해 보이면 직접 고치지 말고 `inbox/claude/` 에 제안으로 적는다.

## 2. 달라진 점 (최근)
- **소통은 Orca 터미널**이다. Claude 의 지시는 이 터미널에 입력으로 들어온다. `ai` 명령은 더 쓰지 않는다. 지시를 받으면 `.agent-heartbeat` 에 `start`, 끝나면 `end <요약>` 을 반드시 남겨라(스크립트가 `end` 를 기다린다).
- **push 는 금지**(스크립트·Claude 가 한다). 커밋만 한다. 브랜치는 `content/2026-10-09-camping-2` 유지, 시작할 때 `origin/claude/peaceful-pasteur-abbqgx` 를 병합한다.
- **용어집 `GLOSSARY.md` 를 지킨다.** "갤러리"는 단독으로 쓰지 말고 **상황 갤러리** / **분류 갤러리**. `_Avoid_` 단어(아이템, 서브 갤러리, 카테고리 등)는 쓰지 않는다. 숫자·가격은 확인한 것만 쓴다.
- **구조가 바뀐다**: 상황 갤러리(최상단, 게시판+분류 연결) → 분류 트리(대·중·소, 소분류가 순위 단위). `docs/design/2026-W47-taxonomy-situation.md` 를 읽어라. 네가 만든 `content/taxonomy.json` 초안은 Claude 가 평가한다.
- ADR(`docs/adr/`): 0001 조회수는 점수에 넣지 않는다, 0002 상황 갤러리는 문서를 소유하지 않는다. 콘텐츠를 쓸 때도 이 전제를 따른다(문서는 소분류에 속한다).

## 3. 스킬(규칙집) — Claude 가 이해한 것을 같은 파일로 읽어라
스킬은 `~/.claude/skills/<이름>/SKILL.md` 에 있다. 설치·복사하지 말고 **읽기만** 한다.
| 스킬 | 한 줄 요약 | 네가 쓰는 방식 |
|---|---|---|
| `domain-modeling` | 용어를 날카롭게 하고 `GLOSSARY.md`·ADR 에 바로 기록한다. 용어집엔 구현 세부를 쓰지 않는다 | 용어가 흔들리면 제안을 `inbox/claude/` 에 남긴다. 용어집 직접 수정은 Claude 가 한다 |
| `research` | 신뢰도 높은 1차 출처로 조사하고 인용을 단 마크다운을 저장소에 남긴다 | 가격·사양 조사는 출처 URL·확인일·원문 인용을 함께. 확인하지 못한 것은 "미확인" |
| `tdd` | 테스트 먼저, 공개 경계에서만 검증 | 코드는 네 담당이 아니다. Claude 변경을 리뷰할 때 "테스트가 행동을 검증하는가, 구현에 결합했는가"를 본다 |
| `diagnosing-bugs` | 재현 루프부터 만들고 원인을 확인한 뒤 고친다 | 콘텐츠 검증 실패(`content:check`, `collect-facts`)를 고칠 때 증상 가리기 금지, 원인 확인 |
| `writing-for-agents` | 에이전트가 읽는 문서는 짧고 명령형으로 | 이 브리프처럼 쓴다 |
| `hallmark` | AI 티가 나는 디자인을 막는 디자인 스킬(바닥 규칙+린트) | 아래 4 |

## 4. 디자인 감사 (너의 신규 업무, 주 1회 금요일 + Claude 가 새 화면을 올릴 때)
- 규칙은 `docs/agents/design-team.md`. **우리 디자인 시스템(`docs/design/ref-design-system.md` 토큰)이 우선**이고, Hallmark 는 **감사(읽기 전용)** 에만 쓴다. 테마 deal/draw·`redesign` 으로 앱 화면을 새로 만들지 않는다.
- 절차: Claude 가 3115 포트 등에서 서버를 켜 두었거나 빌드한 화면이 있으면 `node ~/.claude/skills/hallmark/scripts/sloplint.mjs --url http://localhost:<포트>/<경로> --scope app --render` 를 실행하고, 결과를 `docs/reviews/design/<날짜>-audit.md` 에 표(화면 / 규칙 / 내용 / 제안)로 쓴다. 기준선은 `docs/reviews/design/2026-11-baseline.md`.
- 서버가 없으면 감사를 하지 말고 "서버 없음"이라고 쓴다. 이미지·수치·후기를 지어내지 않는다.

## 5. 지금 열린 일 (이 순서)
1. 병합 후 `content:check` 와 `python3 scripts/collect-facts.py content/*.json` 을 돌려 결과 숫자를 그대로 기록.
2. `content/taxonomy.json` 은 지금 상태로 두고, Claude 평가를 기다린다(수정 요청이 오면 반영).
3. 매 실행: 열린 피드백 처리 → Claude 최근 24시간 변경 리뷰(실패 시나리오·권한/안전·멱등성 관점 각 1줄 이상).
4. 사용자 승인은 기다리지 않는다. 판단하고 조치한 뒤 중요한 것만 답신 맨 위에 적는다.
