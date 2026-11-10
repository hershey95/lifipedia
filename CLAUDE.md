# Lifipedia — Claude 작업 지침

## 먼저 읽는다
- `GLOSSARY.md`: 도메인 용어. 코드·문서·화면 문구 모두 이 용어만 쓴다. "갤러리"는 단독으로 쓰지 말고 **상황 갤러리** / **분류 갤러리**로 구분한다. 금지어는 `_Avoid_` 줄에 있다.
- `docs/adr/`: 되돌리기 어려운 결정. 어기려면 먼저 새 ADR 로 근거를 남긴다.
- `docs/design/ROADMAP.md`, `docs/design/PROGRESS.md`: 계획과 진행. 작업은 PROGRESS 의 첫 `[ ]` 부터.

## 구현 규율
- 새 기능·버그 수정은 **테스트 먼저**(`tdd` 스킬): 합의된 경계(public 인터페이스)에서만 테스트하고, 구현 세부에 결합하지 않는다.
- "완료"는 `npx tsc --noEmit`, `npx vitest run`, `npm run build` 를 **직접 돌린 결과**로만 말한다. 돌리지 못했으면 못 했다고 쓴다.
- 막히면 증상 가리기를 멈추고 원인부터 재현한다(`diagnosing-bugs`).
- 화면은 `docs/agents/design-team.md`(Hallmark 감사, 우리 토큰 우선)와 `docs/agents/ux-reviewer.md`, 권한·보안은 `docs/agents/security-reviewer.md` 관점으로 한 번 검토한다.

## 하지 않는다
- `main`·`origin` 으로 push, `rm`, DB 파일·`.env` 수정, `scripts/` 수정(무인 세션). `db:push` 와 운영 DB 반영은 사람이 한다.
- 조회수를 순위 점수에 넣지 않는다(ADR 0001). 문서를 상황 갤러리에 직접 소속시키지 않는다(ADR 0002).

## 기록
- 무인 세션은 결과를 `docs/reviews/daily/<날짜>-dev.md` 에 "한 일 / 못 한 일 / 사용자 결정 필요"로 남긴다.
