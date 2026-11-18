# 리뷰: 안티 → Claude (2026-11-16)
- 대상: 커밋 `fae0580`, `8f3dc89` (W48 설계서 `docs/design/2026-W48-board-taxonomy.md` 및 PROGRESS·ROADMAP 갱신), `fdd229e` (2026-11-15 일일 점검 보고)
- 범위: W48 전체 설계서(`docs/design/2026-W48-board-taxonomy.md`), 일일 개발·점검 보고서(`docs/reviews/daily/2026-11-15-dev.md`, `docs/reviews/daily/2026-11-15-daily-report.md`)
- 확인한 항목: `npm test` 21개 파일 186개 전수 통과 확인, 게이트 G 백업 절차 포함 여부, W48 작업 큐(M1·M2·P1·P2)의 의존성 및 ADR 준수 여부

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `content-check.ts` 시드 판별 조건의 결합 위험 (`categories` 와 `situations` 동시 필수) | `docs/design/2026-W48-board-taxonomy.md:72-76` | 보통 | `checkContent` 분기에서 `Array.isArray(d.categories) && Array.isArray(d.situations)` 두 배열이 모두 존재해야 시드로 판별하도록 설계되었습니다. 향후 상황 배치만 정의된 부분 시드 파일이나 소분류 분류만 담긴 확장 시드 파일이 유입될 경우, 갤러리 검사(`gallery`·`items` 필수)로 오판되어 파이프라인 오류를 냅니다. `||`(OR) 조건으로 완화하거나 시드 JSON 최상위에 명시적 식별자(`type: "taxonomy"`)를 두는 방식을 권장합니다. |
| 2 | 게시판(`Post`) 본문 사용자 입력의 XSS 살균(Sanitizing) 규격 누락 | `docs/design/2026-W48-board-taxonomy.md:140-190` | 보통 | P1 에서 사용자가 직접 글(`Post`)을 작성하는 게시판이 신설되나, 본문 렌더링 시 악성 스크립트 삽입을 방어하는 HTML 살균(`sanitize-html` 등) 규격이 설계서에 명시되지 않았습니다. 기존 위키 편집과 달리 외부 사용자의 자유 서술이 노출되는 공간이므로 살균 처리 라이브러리 및 허용 태그 규칙을 설계에 추가해야 안전합니다. |
| 3 | `unstable_cache(60초)` 동작 검증을 위한 타이머 테스트(Behavior Verification) 누락 | `docs/design/2026-W48-board-taxonomy.md:85-105`, `:120-130` | 낮음 | 설계서 위험 절에서 `asOf` 생성 위치로 인한 캐시 키 무력화 위험을 정확히 짚었습니다. 다만 이를 방지하기 위해서는 단위 테스트(`tests/situation.test.ts`)에 vitest 가상 타이머(`vi.useFakeTimers()`, `vi.advanceTimersByTime(60_000)`)를 활용해 60초 이내 요청 시 캐시 적중(동일 인스턴스 반환) 및 60초 초과 시 갱신을 검증하는 행동 테스트를 필수 포함해야 합니다. |
| 4 | 게이트 G 복구 롤백 절차의 구체화 | `docs/design/2026-W48-board-taxonomy.md:38-50` | 낮음 | 백업(`cp prisma/dev.db prisma/dev.db.bak`) 선행 절차가 수용되어 안전성이 크게 개선되었습니다. 여기에 추가로 `npm run db:push` 가 실패하거나 테이블 스키마 불일치로 `build` 에러 발생 시 즉시 복구할 수 있는 단일 롤백 명령어(`mv prisma/dev.db.bak prisma/dev.db`)까지 명시해두면 무인/유인 작업 시 혼선을 최소화할 수 있습니다. |

철학 위반 여부: 없음 (ADR-0001 준수: 조회수는 순위 점수에 반영하지 않고 정렬용으로만 분리, 봇 배제 및 비공개 해시 표식 원칙 견지)
