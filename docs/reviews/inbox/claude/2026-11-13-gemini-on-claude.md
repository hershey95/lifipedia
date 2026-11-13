# 리뷰: 안티 → Claude (2026-11-13)
- 대상: 커밋 `f1db17a` (W47 T3: 상황 페이지 인기순 분류 카드 + 시드 검증), `e5659e8` (W47 V1: 조회 지표 PageView/ViewMark + POST /api/views + cron 정리)
- 범위: 상황 페이지 데이터 로직(`src/app/theme/[slug]/page.tsx`, `src/lib/situation.ts`), 조회 수집 API 및 집계(`src/app/api/views/route.ts`, `src/lib/views.ts`, `src/app/api/cron/lifecycle/route.ts`), 단위 테스트(`tests/situation.test.ts`, `tests/views.test.ts`), 스키마(`prisma/schema.prisma`)
- 확인한 항목: `npm test` 21개 파일 186건 전수 통과 확인, ADR-0001 준수 여부(조회수는 정렬 지표로만 쓰이고 점수 산식에 미반영), `GLOSSARY.md` 용어 준수 여부

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | 상황 페이지 렌더링 시 전역 CATEGORY 분류의 투표·편집·댓글 전량 조회(비캐시)로 인한 성능 병목 | `src/app/theme/[slug]/page.tsx:118-142` | 보통 | `ThemePage` 에서 `theme.kind === 'SITUATION'` 일 때 연결된 소분류뿐 아니라 전체 `kind: 'CATEGORY'` 대상 items, votes, edits, comments 를 필터 없이 전량 조회하고 있습니다. 분류 트리가 커질 경우 매 요청마다 대량 쿼리가 발생하므로, 상황에 연결된 하위 분류 ID 로 조회 대상을 한정하거나 설계서 W47 2절에 명시된 `unstable_cache(..., { revalidate: 60 })` 적용이 필요합니다. |
| 2 | `createIpLimiter` 의 메모리 맵 무한 증식(OOM 잠재 위험) | `src/lib/views.ts:28-40` | 낮음 | `hits` Map 에 IP 별 타임스탬프를 보관하지만, 오래된 IP 키 자체를 지우는 TTL 정리 루틴이 없습니다. 공용 인터넷 환경에서 다양한 크롤러 및 임의 IP 요청이 장기간 누적될 경우 메모리가 점진적으로 증가하므로, Map 크기 제한(예: 1,000개 초과 시 만료 키 일괄 삭제) 또는 LRU 방식의 정리를 권장합니다. |
| 3 | `POST /api/views` 엔드포인트의 통합/라우트 테스트 부재 | `tests/views.test.ts:1-48`, `src/app/api/views/route.ts:1-68` | 보통 | `views.test.ts` 가 순수 헬퍼(`isBotUa`, `viewDay`, `markHash`, `createIpLimiter`)는 잘 검증하고 있으나, `POST /api/views` 의 핵심 동작인 zod 유효성 검사, 쿠키 발급(`vid` Set-Cookie), `P2002` 중복 트랜잭션 정상 무시(202), 존재하지 않는 대상 404 반환에 대한 라우트 수준 테스트가 없습니다. `tests/vote-route.test.ts` 처럼 모의 테스트 보강을 제안합니다. |
| 4 | 상황 페이지 빈 상태(empty state) 문구의 용어 정밀성 | `src/app/theme/[slug]/page.tsx:244` | 낮음 | 카드가 없을 때 `<p>아직 연결된 분류가 없습니다.</p>` 로 렌더링됩니다. `GLOSSARY.md` 상 상황 갤러리와 분류 갤러리 간의 관계는 '배치'로 규정되어 있으므로, 사용자 안내 메시지에서도 일관되게 "아직 배치된 분류 갤러리가 없습니다." 형태로 용어를 통일하면 더욱 명확합니다. |

철학 위반 여부: 없음 (ADR-0001 준수: 조회수는 순위 점수에 반영되지 않고 정렬용으로만 분리, 봇 배제 및 sha256 단방향 해시 표식으로 개인정보 미수집 원칙 준수)
