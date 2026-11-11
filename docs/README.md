# 문서 지도 (누가 무엇을 읽나)
Claude 와 안티가 같은 구조를 보도록 한 장으로 정리했다. 모르는 문서는 여기서 찾는다.

## 매 세션 먼저 읽는 것 (짧음)
| 문서 | 대상 | 내용 |
|---|---|---|
| `CLAUDE.md` | Claude | 작업 규율(tdd·검증), 하지 않을 것, 무인 세션 도구 규칙 |
| `GEMINI.md` | 안티 | 세션 시작 순서, 매 실행 업무, 수정 가능 영역 |
| `GLOSSARY.md` | 둘 다 | 용어(상황 갤러리·분류 갤러리·티어·점수 …). `_Avoid_` 단어 금지 |
| `docs/adr/` | 둘 다 | 되돌리기 어려운 결정(0001 조회수≠점수, 0002 상황 갤러리는 문서 비소유) |

## 계획과 진행
- `docs/design/ROADMAP.md` 로드맵 · `docs/design/PROGRESS.md` 작업 큐(첫 `[ ]` 부터) · `BACKLOG.md` 후순위·격차(토요일 갱신)
- 이번 구조 개편 설계: `docs/design/2026-W47-taxonomy-situation.md`(상황 갤러리×분류 트리×게시판)
- 주간 설계서(`docs/design/2026-W44/W45/W47-*.md`): PROGRESS 가 가리키는 항목에서만 해당 절을 읽는다. 전체를 읽지 않는다.
- `docs/design/ref-*.md`(백엔드·프론트·보안·디자인 시스템 레퍼런스, 각 40~57KB): **통째로 읽지 말고** 필요한 절만 검색해서 읽는다. 디자인 토큰은 `ref-design-system.md`.

## 협업 절차
- `docs/reviews/README.md` 채널·일정·피드백 규칙·리뷰 템플릿 / `docs/reviews/RELAY.md` 매일 09시 무인 점검 절차
- `docs/agents/`: `gemini-brief.md`(안티 역할·스킬), `design-team.md`(Hallmark 감사), `security-reviewer.md`·`ux-reviewer.md`
- `docs/CONTENT_RESEARCH_GUIDELINE.md` 콘텐츠 조사·집필 표준(안티)

## 결과물(읽기 전용 기록)
- `docs/reviews/daily/` 일일 점검·무인 개발 보고, `retro/` 주간 회고, `design/` 디자인 감사, `inbox/` 우편함(열림 파일만 남김)
- `docs/research/` 오픈소스 리서치 · `docs/archive/` 지난 기록(14일 지난 보고서·옛 인수인계·끝난 주간 설계서)

## 운영·제품 문서 (사람용)
- `README.md` 제품 소개·로컬 개발, `DEPLOY_NAS.md` NAS 배포·백업

## 규칙: 문서를 늘리지 않는다
새 지시는 위 표의 기존 문서에 한 줄로 넣는다. 같은 규칙이 두 곳에 있으면 한 곳만 남기고 가리키게 한다. 지난 주 작업의 지시·인수인계는 `docs/archive/` 로 보낸다.
