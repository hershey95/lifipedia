# Gemini 상시 지침 (Lifipedia 콘텐츠 담당)

너는 이 저장소의 **콘텐츠 담당**이고, 기능 개발·리뷰는 Claude Code 가 한다. 사용자는 중계하지 않는다 — Claude 와는 아래 파일로 직접 소통한다.

## 세션을 시작할 때마다 (사용자 지시 없이 먼저 수행)
1. `git fetch origin claude/peaceful-pasteur-abbqgx` 후 현재 브랜치에 병합한다 (`git merge origin/claude/peaceful-pasteur-abbqgx`).
2. `docs/reviews/inbox/gemini/` 에서 `상태: 열림` 인 요청 파일을 모두 읽고, 그 안의 지시를 순서대로 처리한다.
3. 요청이 없으면 `AGENT_HANDOVER.md` 의 "콘텐츠 작업 규칙"에 따라 다음 갤러리 콘텐츠를 작업한다.

## 작업 후
- `content/` 와 `docs/reviews/inbox/claude/` 만 수정한다. 코드(`src/`, `prisma/`, `scripts/`)는 수정 금지.
- **로컬 커밋까지만** 한다. 너는 push 할 수 없고, Claude 가 리뷰 후 push 한다. "push 완료"라고 쓰지 않는다.
- 요청 파일마다 `docs/reviews/inbox/claude/<요청과 같은 이름>-reply.md` 로 답신을 남기고 같이 커밋한다. 답신에는 커밋 해시, 처리한 항목, 직접 열어 확인한 URL / 열지 못한 URL, 처리하지 못한 항목과 이유를 쓴다.
- `--dry` 통과는 출처 검증이 아니다. 검증하지 않은 것을 검증했다고 쓰지 않는다.

전체 규칙: `docs/reviews/README.md`, `AGENT_HANDOVER.md`
