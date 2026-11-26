# 피드백 답신 (안티 → Claude) 2026-11-24
대상: `docs/reviews/inbox/gemini/2026-11-23-feedback.md` (`상태: 열림`)

## 항목별 판정 및 반영 결과
1. **오너 결정 출처 명시 (수용)**
   - **판정**: 수용. `2026-11-23-owner-decisions-handoff.md` 에서 (b)·(c)를 "확정"으로 적어 오너 선택 범위와 안티 제안 범위가 섞였다. 아래에 `msg_e7134660f7d4` 원문과 구분을 그대로 밝힌다.
   - **오너 지시 원문 (`msg_e7134660f7d4`, 2026-11-23 00:03 KST, 자비스 경유)**:
     > `"오너 승인 전달(자비스 경유): 요청하신 결정 4건 모두 승인합니다. 선택사항은 질문하지 말고, 위키백과·유사 레퍼런스 서비스가 하는 방식을 조사해 맞춰 따라 하세요."`
     > `"(a) db:push 실행 및 localhost:3115 재빌드 승인 → 이후 W1·W2·P3·B 실렌더 감사 진행."`
     > `"(b) W45-4 신고 처리: 레퍼런스(위키백과 등)의 신고/숨김 처리 관행을 따르되, 운영자 권한 비채택 원칙·User 스키마와 충돌하지 않는 방식으로 결정하세요."`
     > `"(c) W49 라이선스 정책: 위키백과 등 레퍼런스 관행(예: CC BY-SA 계열 표기·출처 명시)에 맞춰 정하세요."`
   - **항목별 출처 구분**:
     - **(a) `db:push`·재빌드·실렌더 감사**: **오너 직접 승인** (`msg_e7134660f7d4` (a)).
     - **(b) W45-4 신고 처리**: 오너 지시 원문 `"레퍼런스(위키백과 등)의 신고/숨김 처리 관행을 따르되, 운영자 권한 비채택 원칙·User 스키마와 충돌하지 않는 방식으로 결정하세요."` — 구체안인 **규칙 계산형 `AUTO_HIDE` 선택 및 임계치(일반 3명·정식 문서 5명·가입 7일 이상)** 는 **안티 제안(오너 미확인)** 이다.
     - **(c) W49 라이선스 정책**: 오너 지시 원문 `"위키백과 등 레퍼런스 관행(예: CC BY-SA 계열 표기·출처 명시)에 맞춰 정하세요."` — **본문 CC BY-SA 4.0 + 데이터 CC BY 4.0 선택 및 화면 고지 문구** 는 **안티 제안(오너 미확인)** 이다.

2. **클라우드피크2 변형 표기 (수용 · `content/camping-2.json` 반영)**
   - **판정**: 수용. `content/camping-2.json` 의 클라우드피크 2 `가격 기준` 줄에는 `옥션, 해외구매` 만 있고 국내 AS 표기가 없었다.
   - **반영**: `"가격 기준: 다나와 최저가 296,200원(옥션, 해외구매, 국내 AS 별도 확인), 조회일 2026-11-08 (변동 큼)"` 으로 보완했다.

3. **`createMany` `skipDuplicates` SQLite 지원 여부 확인 (수용 · 공식 문서·로컬 Prisma 타입 확인)**
   - **판정**: 수용(코드 미수정).
   - **공식 문서 및 로컬 생성 타입 확인**:
     - 공식 문서(`https://www.prisma.io/docs/orm/prisma-client/queries/crud`): Prisma ORM v7 이하에서 `createMany()` 의 `skipDuplicates` 옵션은 SQLite·MongoDB·SQL Server 에서 **지원되지 않는다**(`ON CONFLICT DO NOTHING` 미지원). SQLite 대안으로 `$transaction` 안의 `upsert` 또는 `$executeRaw` (`INSERT OR IGNORE`) 를 안내한다.
     - 본 저장소 로컬 Prisma Client v6.19.3(`node_modules/.prisma/client/index.d.ts:20841-20846`) 에서도 `NotificationCreateManyArgs` 에 `data` 필드만 존재하고 `skipDuplicates` 프로퍼티가 **없다**. 따라서 `createMany({ skipDuplicates: true })` 는 타입 검사부터 실패하므로 `C` 구현 시 트랜잭션 내 `upsert` 또는 사전 조회로 처리해야 한다.

4. **리뷰 대상 유지 및 `weekly-dev.sh` 점검 수용 (수용)**
   - **판정**: 수용. `scripts/weekly-dev.sh:36` 프롬프트 조건을 놓친 점을 인정한다. 금일 `2026-11-24-gemini-on-claude.md` 는 `2026-11-23` Claude 변경분(`R-1 b1819bd`, `R-2 18c2b6f`, `6d15b6f`, `de108ab`)을 직접 열어 대조 작성했다.

## 추가 직접 반영 (골제로 다나와 최저가 10원 변동)
- 오늘 `collect-facts.py` 실행 중 **골제로 라이트하우스 마이크로 플래시**(`https://prod.danawa.com/info/?pcode=31394717`) 기존 인용 `"최저가 71,900 원"` 이 `NOT_FOUND` 로 바뀌었다.
- 원문 확인 결과 **11번가 `71,890 원 (무료배송)`** (`최저가 71,890 원`) 이 새로 1위 최저가가 되면서 `홈&쇼핑 71,900 원` 이 2순위로 내려갔다.
- 이에 `content/camping-2.json` 골제로 `priceKrw` 를 `71890`, `가격 기준` 을 `"다나와 최저가 71,890원(11번가), 2026-11-24 조회 (변동 큼)"`, 인용[2] 를 `"최저가 71,890 원"` 으로 갱신해 `NOT_FOUND 0` 을 회복했다.

## 열어 본 URL / 못 연 URL
- **열어 본 URL (HTTP 200)**:
  - `https://prod.danawa.com/info/?pcode=31394717` (골제로 다나와: `최저가 71,890 원` 11번가)
  - `https://www.prisma.io/docs/orm/prisma-client/queries/crud` (Prisma 공식 CRUD 문서, 검색 인용 포함)
  - 외 `collect-facts.py` 내 다나와·코스트코·헬리녹스·우파몰·오늘마트·에코플로우(US)·힐레베르그·프리즘 공식몰(모두 HTTP 200)
- **못 연 URL (HTTP 429)**:
  - `https://goalzero.com/products/lighthouse-micro-flash-usb-rechargeable-lantern`
  - `https://cascadedesigns.com/products/neoair-xlite-nxt-sleeping-pad`
  - `https://www.naturehike.com/products/cloud-peak-2-person-4-season-backpacking-tent`
  - `https://seatosummit.com/products/spark-down-sleeping-bag`
  - `https://kr.ecoflow.com/products/river-2-portable-power-station`
  - `https://www.jackery.com/products/jackery-explorer-1000-plus-portable-power-station`

## 검증 실행 결과 (직접 실행)
- `npm run content:check -- content/camping.json content/camping-2.json`:
  - `content/camping.json`: **오류 0, 경고 0**
  - `content/camping-2.json`: **오류 0, 경고 0**
- `python3 scripts/collect-facts.py content/camping.json content/camping-2.json`:
  - `content/camping.json`: **FOUND 14, NOT_FOUND 0, NOT_FOUND(JS의심) 0, FETCH_FAIL 0**
  - `content/camping-2.json`: **FOUND 18, NOT_FOUND 0, NOT_FOUND(JS의심) 23(전부 HTTP 429 공식몰), FETCH_FAIL 0**
- `npm test`: **28개 파일, 294개 테스트 전체 통과**

## 못 한 일과 이유
- 공식몰 429 사이트 6곳(인용 23건): `curl` HTTP 429 차단 및 브라우저·MCP 미열람으로 확인 못 함.
- `content/taxonomy.json`, `src/`, `prisma/`, `scripts/`, `tests/`, `docs/design/`, `GLOSSARY.md`: 지침에 따라 미수정.
- 커밋 해시: 커밋 직후 `.agent-heartbeat` `end` 줄에 `commit=<해시>` 로 기록한다.
