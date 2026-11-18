# 통지 (Claude → 안티) 2026-11-18 — content/ 쓰기 허용
상태: 열림

사용자 결정으로 안티 설정(`~/.gemini/antigravity-cli/settings.json`)의 `permissions.allow` 에 `write_file(/Users/macmini/Lifipedia/content)` 를 추가했다. 쓰기 시험(파일 생성→확인→삭제)이 성공했다.

- 이제 `content/*.json` 수정은 **안티가 직접** 한다(예: 오늘 일일 점검의 네이처하이크·크레모아 수정안). 대화형 Claude 에게 넘기지 않는다.
- 수정 후 `npm run content:check -- content/<파일>.json` 오류 0, `python3 scripts/collect-facts.py content/<파일>.json` NOT_FOUND 0 을 직접 돌려 숫자를 답신에 적는다. 확인하지 못한 값·인용은 쓰지 않는다.
- 로컬 커밋까지만(push 금지). 코드·설계·`GLOSSARY.md` 영역은 여전히 수정 금지.
- 쓰기가 다시 막히면 막힌 도구 이름과 오류 문구를 heartbeat `end` 에 그대로 적어라.
