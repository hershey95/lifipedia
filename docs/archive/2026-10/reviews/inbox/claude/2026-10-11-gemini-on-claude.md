# 리뷰: Gemini → Claude (2026-10-11)
- 대상: Claude 최근 24시간 변경분 (`scripts/danawa-price.ts`, `src/lib/trust.ts`, `tests/trust.test.ts`, `docs/design/2026-W42-mypage-karma.md`)
- 범위: 커밋 `a2b487e` ~ `7ad49e4` 코드 diff 및 설계서 보완 내용
- 확인한 항목:
  - `scripts/danawa-price.ts`의 검색 regex 파싱, HTTP 요청 예외 처리 및 `Promise.all` 구조
  - `src/lib/trust.ts`의 `badgeProgress` 구현체 및 경계값(-3, 0, 4, 5, 249, 250, 1000) 테스트 결과
  - `prisma/schema.prisma`의 `EditHistory` 인덱스 현황 및 마이그레이션 영향도

---

## 1. 지적 및 제안 사항

| # | 문제 | 근거 | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | **`danawa-price.ts`의 `Promise.all` 동시성 제어 부재 및 단일 실패 시 전체 중단 위험** | `scripts/danawa-price.ts` (L44, L12)에서 `Promise.all(args.map(priceOf))`로 복수 pcode를 동시 요청함. 10개 이상 pcode 입력 시 다나와 서버의 Rate limit/봇 차단(429/403)을 유발할 수 있으며, 1개만 실패해도 예외가 던져져 전체 pcode 결과가 유실됨. | **중간** | `Promise.allSettled`를 사용해 개별 실패 시에도 성공한 pcode 결과를 보존하고, pcode 간 순차 처리 또는 100~200ms 지연을 두어 차단 위험을 완화할 것. |
| 2 | **`danawa-price.ts`의 검색 상품명 파싱 시 HTML Entity 디코딩 누락** | `scripts/danawa-price.ts` (L52)에서 `<p class="prod_name">` 내부의 태그만 제거하고 HTML 엔티티(`&amp;`, `&quot;`, `&#39;`)를 디코딩하지 않아 특수문자가 포함된 상품명이 엔티티 문자열 그대로 출력됨. | **낮음** | 엔티티 디코더(`he.decode` 또는 `html-entities`)를 적용하거나 기본 unescape 처리를 거친 후 콘솔에 출력하도록 보완할 것. |
| 3 | **`src/lib/trust.ts` `badgeProgress`의 `NaN`/비정상 입력 시 런타임 크래시 방어** | `src/lib/trust.ts` (L31~33)에서 `contributionCount`에 `NaN`이나 `undefined`가 들어오면 `Math.max(0, NaN)`이 `NaN`이 됨. 이로 인해 `findIndex`가 `-1`을 반환하여 `BADGE_THRESHOLDS[-1]`(undefined)의 `.level` 접근 시 `TypeError`가 발생함. | **낮음** | `const count = Number.isFinite(contributionCount) ? Math.max(0, Math.floor(contributionCount)) : 0;`으로 방어하여 비정상 입력에 대해 안전하게 NEWCOMER/0%를 반환하도록 처리할 것. |
| 4 | **설계서 `EditHistory` 인덱스 추가에 따른 마이그레이션 실행 절차 명시 필요** | 설계서 4절에 `EditHistory @@index([editorId, createdAt])` 추가가 반영되었으나, D2의 취지(마이그레이션 위험 회피)와 충돌하지 않도록 실제 DB(SQLite) 반영 절차(`prisma db push` 등)와 기존 배포 환경(NAS) 적용 방안이 구현 계획(7절)에 함께 기술되어야 함. | **중간** | 월요일 구현 계획에 `schema.prisma` 인덱스 추가 및 `prisma db push` 검증 단계를 명시하고, 운영 환경 반영 방안을 문서화할 것. |

---

## 2. 철학 위반 여부

- **철학 위반 없음**:
  - `badgeProgress`는 기여 수 기반 뱃지 단계 계산을 순수 함수로 일관되게 처리함.
  - `danawa-price.ts`는 최저가 검색 및 검증용 보조 도구로, 임의 가격 조작 없이 다나와 raw 데이터를 조회하도록 구현됨.

---

## 3. 필수 관점 분석

### (a) 실패 시나리오 (Failure Scenarios)
- `danawa-price.ts` 실행 중 다나와 네트워크 지연/차단 시 graceful failure가 부족함. `priceOf` 내에서 `try/catch`로 묶어 `{ status: 'FETCH_ERROR', error: e.message }` 형태의 안전한 결과를 반환하는 구조가 안정적임.
- `badgeProgress`는 비정상 수치(NaN, 음수 부동소수점)에 대해 방어 코드를 갖추어야 컴포넌트 렌더링 중 예기치 않은 에러 바운더리 트리거를 예방할 수 있음.

### (b) 권한·안전 (Auth & Safety)
- `danawa-price.ts`는 CLI 스크립트이므로 웹 세션 권한과는 무관하나, 단일 고정 UA로 반복 스크래핑 시 개발 장비 IP가 차단될 수 있으므로 요청 간 간격 제어가 안전성에 기여함.

### (c) 멱등성 및 성능 (Idempotency & Performance)
- **성능**: `EditHistory(editorId, createdAt)` 복합 인덱스 설계는 `/me` 활동 쿼리의 O(N) 풀 스캔을 O(log N) 인덱스 스캔으로 줄여주므로 30건 조회 성능 개선에 매우 유효함.
- **접근성(a11y)**: `badgeProgress`의 `percent` 값을 화면에 렌더링할 때, `aria-valuenow={percent}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="다음 뱃지까지 진행률"` 속성을 함께 제공하도록 프론트엔드 구현 시 가이드 필요.
