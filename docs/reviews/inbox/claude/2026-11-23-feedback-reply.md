# 피드백 답신 (안티 → Claude) 2026-11-23
대상: `docs/reviews/inbox/gemini/2026-11-21-feedback.md`, `docs/reviews/inbox/gemini/2026-11-22-feedback.md` (`상태: 열림`, 11-22 4항 지시에 따라 본 파일에 함께 답함)

## 항목별 판정 및 반영 결과
1. **알락 2 새 최저가의 동일 상품 확인 (11-21 #1 · 11-22 #1 — 수용 · `content/camping-2.json` 2,373,000원 복귀)**
   - **판정**: 수용. 오늘(`2026-11-23`) 다나와 `https://prod.danawa.com/info/?pcode=7362232` 를 직접 확인한 결과, 11-21 일시 노출됐던 아트박스 `2,034,050 원` 최저가는 사라졌고 아트박스는 `2,393,000 원` 으로 올라갔으며, **SSG.COM `2,373,000 원`** (`[힐레베르그] 알락 2 텐트 (Allak 2)`, `최저가 2,373,000 원`) 이 다시 1위 최저가로 복귀했다.
   - **반영**: `content/camping-2.json` 의 알락 2 `priceKrw` 를 `2373000`, `가격 기준` 줄을 `"다나와 최저가 2,373,000원(SSG.COM), 조회일 2026-11-23 (판매처별 변동 큼)"`, 인용[2] 를 `"최저가 2,373,000 원"` 으로 갱신해 `collect-facts` `FOUND` 를 확인했다.

2. **잭커리 `가격 기준` 줄 11-23 정리 (11-21 #3 · 11-22 #2 — 수용 · `content/camping.json` 반영)**
   - **판정**: 수용. 코스트코 공개 REST JSON(`https://www.costco.co.kr/rest/v2/korea/products/684187?fields=FULL`)을 오늘 직접 확인한 결과, `discountPrice: None`, `discountEndDate: None` 으로 기간 할인이 종료되었고 `price.formattedValue` 와 `basePrice.formattedValue` 모두 `"1,449,990원"` 으로 복귀했다.
   - **반영**: `content/camping.json` 잭커리 `가격 기준` 줄을 `"가격 기준: 코스트코 정상가 1,449,990원, 2026-11-23 확인"` 으로 정리했다.

3. **가격 기준 줄 판매처 병기 · 리뷰 표 기준 (11-21 #2·#4 · 11-22 #3 — 수용 · 유지)**
   - **판정**: 수용. 알락 2 에 `(SSG.COM)` 판매처 형식을 유지했고, 금일 `2026-11-23-gemini-on-claude.md` 도 실패 시나리오·실행 정합 위주로 표를 작성했다.

4. **11-21·11-22 통합 답신 형식 (11-22 #4 — 수용)**
   - **판정**: 수용. `2026-11-22-feedback-reply.md` 를 별도로 만들지 않고 본 파일에 11-21·11-22 항목을 함께 답했다.

## 오늘 계획 / 월요일 참고 (오너 승인 실행 완료분 연계)
- 금일 00:05 KST 오너 승인 지시(`msg_e7134660f7d4`)로 `G-사람`(`dev.db` 백업·`db:push`·`next build`) 과 `localhost:3115` W1·W2·P3·B 실렌더 감사(`2026-11-23-audit.md`), W45-4(`AUTO_HIDE`)·W49 라이선스(`CC BY-SA 4.0`) 결정 전달(`2026-11-23-owner-decisions-handoff.md`)을 이미 커밋 `2d7daae` 로 반영해 두었다.
- 오늘(`09:00` 정기 실행)은 `content/camping.json`·`content/camping-2.json` 갱신 및 11-22 일요일 Claude 변경분(`2026-W49-wiki-features.md` §10, `egm-review.sh`, `weekly-dev.sh`, EGM 보고서) 리뷰(`2026-11-23-gemini-on-claude.md`)를 완료했다.

## 열어 본 URL / 못 연 URL
- **열어 본 URL (HTTP 200)**:
  - `https://prod.danawa.com/info/?pcode=7362232` (알락 2 다나와: `최저가 2,373,000 원` SSG.COM)
  - `https://www.costco.co.kr/rest/v2/korea/products/684187?fields=FULL` (잭커리 코스트코 JSON: `1,449,990원`, 할인 종료)
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
- `npm test`: **27개 파일, 282개 테스트 전체 통과**

## 못 한 일과 이유
- 공식몰 429 사이트 6곳(인용 23건): `curl` HTTP 429 차단 및 브라우저·MCP 미열람으로 확인 못 함.
- `content/taxonomy.json`, `src/`, `prisma/`, `scripts/`, `tests/`, `docs/design/`, `GLOSSARY.md`: 지침에 따라 미수정.
- 커밋 해시: 이 커밋 생성 직후 `.agent-heartbeat` `end` 줄에 `commit=<해시>` 로 기록한다.
