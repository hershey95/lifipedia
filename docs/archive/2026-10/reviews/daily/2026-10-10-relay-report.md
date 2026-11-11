# 중계 보고 2026-10-10
- Gemini 상태: 완료 | 클론 HEAD: a7f8119 (기준 BASE bd8a043, 브랜치 content/2026-10-09-camping-2, 미push)
- content:check: camping-2.json 오류 0, 경고 0 / camping.json 오류 0, 경고 0 (통과는 사실 확인이 아님)
- 수정 범위 이탈: 없음 (Gemini 커밋 a7f8119 는 content/camping-2.json, content/camping.json, 답신 md 만 변경)
  - 참고: BASE..HEAD 에는 origin 병합분(2877f38, f044afd)이 포함됨: docs/reviews/RELAY.md, inbox/gemini 지시문, src/lib/content-check.ts, tests/content-check.test.ts

| # | 항목 | URL | 파일의 주장(상품명/가격) | 페이지에 보인 것(인용) | 판정 | 비고 |
|---|---|---|---|---|---|---|
| 1 | 골제로 라이트하우스 | goalzero.com/...micro-flash | 스펙 68g, 자체 가격 없음 | "Regular price $39.95" | 판단 필요 | KRW 가격 아님, 스펙 원문 불일치(아래) |
| 2 | 골제로 (다나와) | prod.danawa.com pcode=31394717 | 최저가 71,900원 | "71,900원" (최저가 라벨과 분리) | MATCH | 값 일치, 문자열 연속 아님 |
| 3 | 써머레스트 지라이트 솔 | thermarest.com/...z-lite-sol | R-value 2.0, 410g | 301 리다이렉트(cascadedesigns.com), 미추적 | UNREADABLE | 12개 상한 준수 위해 미추적, 판단 필요 |
| 4 | 써머레스트 (다나와) | pcode=3101004 | 최저가 59,000원 | "최저가 0원", "판매점 : 0개", "가격비교 중지 상품입니다" | PRICE MISMATCH | 가격 표시 없음 |
| 5 | 크레모아 3페이스 미니 | m.prismlight.co.kr product_no=600 | 판매가 62,000원 | "판매가" + "62,000원" (분리) | MATCH | 가격 일치, 스펙 인용은 별도 행 |
| 6 | 크레모아 (다나와) | pcode=11800708 | 공식몰 62,000원(참고) | "최저가 60,630원"(G마켓, 배송비 포함), 카드가 58,900원 | 판단 필요 | 판매처 차이, 변형 의심 |
| 7 | 네이처하이크 몽가 2 | naturehike.com/...mongar-2 | 20D 실리콘, 2.2kg | HTTP 404 | UNREADABLE | 1회 실패 |
| 8 | 몽가 2 (다나와) | pcode=13306949 | priceKrw 없음, 가격비교 중지 | "가격비교 중지 상품입니다" | MATCH | 해외구매 변형 의심 |
| 9 | 씨투써밋 스파크 -2 | seatosummit.com/...spark-down | 가격 근거 없음 | "$349.00" (USD) | 판단 필요 | KRW 아님 |
| 10 | 스파크 (다나와) | pcode=73889813 | 판매가 711,900원 | "최저가 0원", "판매점 : 0개", "일시 품절" | PRICE MISMATCH | recommendReason "실판매 가격 확인" 과 충돌 |
| 11 | 힐레베르그 알락 2 | hilleberg.com/...allak-2 | 스펙 (Kerlon 1200, 2.8kg) | 가격 없음, 헤딩 "Allak" | UNREADABLE | 가격 부재, 판단 필요 |
| 12 | 알락 2 (다나와) | pcode=7362232 | 최저가 2,034,050원 | "2,034,050원" (분리, 공백 차이) | MATCH | 값 일치 |

- 인용문 대조: 총 6건 중 일치 1, 불일치 3, 확인 불가 2
  - 일치: hilleberg "Kerlon 1200"
  - 불일치: goalzero "Weight: 2.4 oz (68g)" (페이지는 "Weight: 2.4 oz" 만), prismlight "밝기 40 ~ 800 Lm" (없음), seatosummit "850+ FILL POWER" (페이지는 "850+ Fill Power", 대소문자 차이)
  - 확인 불가: thermarest "R-Value: 2.0" (리다이렉트 미추적), naturehike "20D Silicone Nylon Fabric" (404)
- 판단 필요(Claude 에게 넘김):
  - recommendReason 의 "다나와 실판매/최저가 확인" 서술: 써머레스트(3101004)와 스파크(73889813)는 가격 0원, 판매점 0개로 근거가 없음
  - 크레모아: 공식몰 62,000원 vs 다나와 최저가 60,630원
  - 힐레베르그: 페이지 헤딩 "Allak"(4계절 표기) 과 알락 2 주장의 대응, "Minimum Weight 2.8 kg" 문자열은 표에 분리 표기
  - 골제로/씨투써밋: 공식 페이지 가격이 USD 라 KRW 주장과 직접 비교 불가
- 한계: WebFetch 는 요약 모델을 거치므로 "없음" 판정은 원문 대조보다 신뢰도가 낮다. 불일치 건은 Claude 가 원문으로 재확인 권장.
- 미검증: Gemini 답신의 "npm test 77 통과", "URL 14건" 주장은 중계가 확인하지 않음.
- 사용: 호출 1회 (ai), WebFetch 12회
