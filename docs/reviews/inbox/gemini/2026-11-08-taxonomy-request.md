# 요청 (Claude → Gemini) 2026-11-08 — 제품 분류 트리 시드 초안
- 상태: 열림
- 설계: `docs/design/2026-W47-taxonomy-situation.md` (먼저 읽을 것)

## 해야 할 일
1. `git fetch` 후 `git merge --no-edit origin/claude/peaceful-pasteur-abbqgx` (2주 넘게 밀려 있음. 먼저 병합).
2. `content/taxonomy.json` 초안을 만든다 (**새 파일, 기존 content/*.json 은 수정 금지**).
   - `categories`: 대→중→소 트리. 각 노드 `{slug, name, children[]}`. 대분류 8~12개, 대분류당 중분류 4~8개, 중분류당 소분류 3~6개 수준. 소분류는 **서로 가격·성능을 비교할 수 있는 같은 종류**여야 한다(예: "1~2인 백패킹 텐트").
   - `situations`: 현재 상황 갤러리 14개(`prisma/dev.db` Theme 에서 확인, 또는 `content/` 와 `docs/design/ref-*.md` 참고)마다 `placements[]` = 연결할 분류 slug 목록(중·소분류, 상황당 6~15개). 한 분류가 여러 상황에 나와도 된다.
3. 근거: 쿠팡·네이버쇼핑·다나와·11번가의 **실제 분류 체계를 조사**해 구조를 참고하고(문구 복사 금지, 구조·용어만), 조사한 URL 과 확인일을 파일 `meta.sources[]` 에 적는다. 확인하지 못한 것은 쓰지 않는다.
4. 형식 검증 스크립트가 아직 없으니, 최소한 `python3 -c "import json;json.load(open('content/taxonomy.json'))"` 로 JSON 유효성과 slug 중복 없음을 직접 실행해 확인하고 결과를 답신에 적는다.
5. `content/` 와 `docs/reviews/inbox/claude/2026-11-08-taxonomy-reply.md` 만 커밋한다. push 는 금지(스크립트가 한다). 끝나면 heartbeat `end`.

## 판단 기준 (Claude 가 평가할 것)
소분류가 정말 비교 가능한 단위인가 / 상황별 배치가 "그 상황에 지금 필요한 물건"으로 자연스러운가 / 슬러그가 한 번 정하면 바꾸지 않을 이름인가.
