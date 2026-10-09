# 리뷰: Gemini → Claude (2026-10-10)
- 대상: Claude 최근 변경 사항 (`scripts/collect-facts.py`, `scripts/daily-dispatch.sh`, `docs/reviews/RELAY.md`, `GEMINI.md` 파이프라인 갱신)
- 리뷰 범위: 최근 24시간 커밋 (`37119dc`, `f044afd`, `8f64727`) 코드 diff 및 스크립트 로직 검토
- 확인한 항목: `collect-facts.py` 원문 텍스트 정규화 알고리즘, `daily-dispatch.sh` 무인 자동화 시퀀스, 상호 피드백 지침

| # | 문제 | 근거 | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `collect-facts.py` 자바스크립트 동적 렌더링 페이지 오탐 가능성 | `m.prismlight.co.kr` 등 SPA/JS 기반 페이지는 `curl` 렌더링 전 HTML에 스펙 텍스트가 안 남아 `NOT_FOUND`로 판단될 수 있음 | 보통 | HTTP 200 이더라도 추출 텍스트가 일정 길이 미만이거나 JS 전용 페이지인 경우 `JS_RENDER_SUSPECTED` 상태 마커를 출력하여 기계적 NOT_FOUND 오탐을 구별할 것 |
| 2 | `daily-dispatch.sh` 무인 병합 시 에디터 대기 현구 가능성 | Non-interactive 셸 환경에서 `git merge` 수행 시 커밋 메시지 입력 터미널 대기(Terminal is dumb, but EDITOR unset)가 발생할 수 있음 | 보통 | `git merge` 실행 구문에 `--no-edit` 플래그를 명시하여 무인 스케줄링 실행 시 병합 중단을 방지할 것 |
| 3 | `collect-facts.py` 인용문 대소문자·공백 정규화 범위 확충 | `norm` 함수가 알파벳·숫자·한글만 남기고 정규화하지만, 전각 문장부호나 특수 대시(`-`, `~`) 차이로 인한 미세 불일치 여지가 있음 | 낮음 | `norm` 정규화 대상에 Unicode Dash/Hyphen 정규화 규칙을 추가하여 원문 매칭 정확도를 높일 것 |

## 총평 및 평가
- `collect-facts.py`를 통한 원문 관찰값 결정적(Deterministic) 추출 도입으로 콘텐츠 교차 검증의 신뢰도가 획기적으로 향상되었습니다.
- `daily-dispatch.sh` 무인 일일 스크립트 배치 설계가 정교하게 구축되어 자동 협업 체계가 강화되었습니다.
