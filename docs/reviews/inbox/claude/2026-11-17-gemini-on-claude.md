# 리뷰: 안티 → Claude (2026-11-17)
- 대상: 커밋 `ecb9a5b` (feat(M1): 분류 마감), `0711c25` (feat(M2): 조회 지표 연결), `5c8b149` (docs: 2026-11-16 구현 보고와 PROGRESS)
- 범위: `src/app/theme/[slug]/page.tsx`, `src/app/theme/[slug]/item/[itemSlug]/page.tsx`, `src/app/api/views/route.ts`, `src/components/ViewBeacon.tsx`, `src/lib/situation.ts`, `src/lib/views.ts`, `src/lib/content-check.ts`, `src/app/how-ranking-works/page.tsx`, `tests/views-route.test.ts`, `tests/views.test.ts`, `tests/situation.test.ts`, `tests/content-check.test.ts`
- 확인한 항목:
  - `npm test`: 22개 파일 204개 테스트 전수 통과 확인 (M1/M2 신규 테스트 포함)
  - `npm run content:check`: 시드 검증 분기 동작 확인 (taxonomy.json 및 갤러리 파일 정상 통과)
  - 조회수 기반 인기 가중치 30일 지연 로직(`POPULARITY_RULES.VIEW_MIN_TRACKED_DAYS = 30`, `VIEW_WEIGHT = 0.1`) 및 비콘 멱등성 검증

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `loadSituationCards` 에서 `prisma.pageView.findMany` 가 대상 ID 필터 없이 DB 내 30일치 모든 행을 조회함 | `src/app/theme/[slug]/page.tsx:69` | 보통 | `prisma.pageView.findMany({ where: { day: { gte: viewDay(since) } } })` 로 되어 있어 서비스 운영이 지속되고 아이템/테마가 늘어나면 전체 테이블의 30일치 조회 레코드를 매 60초 캐시 만료 시마다 메모리로 가져옵니다. `where` 절에 `OR: [{ targetType: 'THEME', targetId: { in: catIds } }, { targetType: 'ITEM', targetId: { in: items.map(i => i.id) } }]` 조건을 추가하여 해당 상황 갤러리에 배치된 분류 및 하위 문서의 조회수만 인덱스로 좁혀 조회하도록 개선을 제안합니다. |
| 2 | IP 한도기 `hits.size > 1000` 정리 조건이 활성 IP 홍수 공격 시 상한을 넘길 수 있음 | `src/lib/views.ts:24-28` | 보통 | 60초 창 안에서 1,000개 이상의 고유 IP 가 유입될 경우, `now - ts[ts.length - 1] > windowMs` 조건을 만족하는 만료 IP 가 없어 `hits.delete` 가 일어나지 않고 Map 크기가 계속 늘어날 수 있습니다. `hits.size > 2000` 등 2차 임계치를 두어 초과 시 가장 오래된 키(`hits.keys().next().value`)를 강제 축출(LRU 방식)하거나 상한을 두는 방어 로직을 고려할 것을 제안합니다. |
| 3 | 신규 방문자의 최초 1회 다중 탭 동시 접속 시 vid 중복 발급 가능성 | `src/app/api/views/route.ts:40-45` | 낮음 | 쿠키가 없는 첫 방문자가 여러 탭을 동시에 열거나 페이지 내에서 연속 비콘이 발송될 경우, 쿠키 응답을 받기 전에 발송된 각 요청에 대해 서로 다른 UUID vid 가 생성되어 동일 사용자임에도 당일 중복 카운트가 발생할 수 있습니다. 다만 비콘 특성상 미미한 수준이고 30일 창 지표에 미치는 영향은 0.1점에 불과하여 즉시 수정할 문제는 아니며, 추후 로컬스토리지 보조 식별이나 클라이언트 비콘 전송 시점 정렬을 고려할 수 있습니다. |
| 4 | `ViewBeacon` 컴포넌트가 `keepalive: true` 로 백그라운드 발송되나 네트워크 오프라인 시 무음 실패 | `src/components/ViewBeacon.tsx:10-12` | 낮음 | `.catch(() => {})` 로 실패를 무시하는 것은 메인 UX 에 지장을 주지 않는 훌륭한 설계입니다. 다만 네트워크 일시 단절 후 복구 시 재시도 로직은 없으므로, 조회수 누락이 중요한 지표가 될 경우 브라우저 `navigator.sendBeacon` fallback 이나 serviceWorker 백그라운드 싱크를 장기 고려 사항으로 메모해 둡니다. |

---

### 관점별 상세 분석
1. **실패 시나리오 (Failure Scenarios)**
   - `firstView` 가 DB 에 하나도 없는 초기 상태(`firstView === null`)에서 `viewsTrackedDays` 가 `0` 으로 정상 폴백됩니다 (`page.tsx:76`).
   - 비콘 요청 본문 오류(400), 봇 User-Agent(202, DB 미조작), 존재하지 않는 대상(202, DB 미조작), 당일 재방문 P2002 충돌(202, 정상 swallow) 등 실패 경로 처리가 매우 견고하게 테스트(`tests/views-route.test.ts`)로 검증되었습니다.
2. **권한 및 안전 (Security & Safety)**
   - `x-forwarded-proto` 가 `https` 일 때만 쿠키에 `Secure` 플래그를 붙이도록 처리하여 로컬 개발 환경 및 HTTP 리버스 프록시 환경에서 쿠키 탈락으로 인한 멱등성 깨짐 문제를 깔끔하게 방어했습니다 (`route.ts:46`).
3. **멱등성 (Idempotency)**
   - `prisma.viewMark` 테이블의 `@@unique([vid, targetType, targetId, day])` 제약조건과 `$transaction` 처리를 통해 동일 vid 및 동일 대상의 당일 중복 카운트를 데이터베이스 레벨에서 원천 차단하고 있습니다.
   - `loadSituationCards` 의 `unstable_cache` 에서 `asOf` 를 함수 내부에서 생성하여 캐시 키가 시각 파라미터로 인해 파편화되는 문제를 방지했습니다 (`revalidate: 60` 보장).
4. **테스트가 행동을 검증하는가 (Behavioral Testing)**
   - `summarizeChildren` 의 손자 소분류 롤업, 3개 미만 문서 `merged` 이동, 동점자 id 정렬 등 핵심 비즈니스 로직이 `tests/situation.test.ts` 에서 구체적으로 검증되었습니다.
   - 조회수 30일 미만 시 0점 반영, 30일 도달 시 1,000회 조회당 100점(`0.1` 가중치) 반영, 미배치 분류 격리 검증이 빈틈없이 작성되었습니다.

---

### 철학 위반 여부
- **없음**:
  - ADR 0001(조회수는 문서 랭킹 점수에 일절 반영하지 않고 상황 갤러리 내 분류 카드 정렬 보조 신호로만 사용)을 엄격히 준수함.
  - `/how-ranking-works#popularity` 에 산정 규칙(30일 누적 창, 가중치 0.1, 30일 이상 축적 후 반영)을 공개하여 블랙박스 조작 금지 및 투명성 원칙을 완전히 보장함.
