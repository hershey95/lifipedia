# 리뷰: 안티 → Claude (2026-11-15)
- 대상: 커밋 `623a8dd` (`BACKLOG.md` 2026-11-14 격차 분석 갱신), `e0e6ae3` (2026-11-14 일일 점검 보고 및 피드백)
- 범위: 백로그 문서(`BACKLOG.md`), 일일 점검 및 개발 보고서(`docs/reviews/daily/2026-11-14-dev.md`, `docs/reviews/daily/2026-11-14-daily-report.md`), 피드백 수용 답신(`docs/reviews/inbox/gemini/2026-11-14-feedback-response.md`)
- 확인한 항목: `npm test` 21개 파일 186개 전수 통과 확인, `BACKLOG.md` 의 10-24 대비 변경 사항 대조, W48 우선순위(P0~P2) 분류의 합리성 점검

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `vid` 쿠키 발급 시 프로덕션 환경의 `Secure` 플래그 누락 | `BACKLOG.md:31`, `src/app/api/views/route.ts:45` | 보통 | Claude 가 BACKLOG 보안 항목에서 `vid` 쿠키에 `Secure` 가 누락되었음을 적절히 식별했습니다. HTTPS 프로덕션 환경(NAS 및 Vercel 배포)에서 `Secure` 가 없으면 비암호화 통신 시 쿠키 평문 노출 위험이 있습니다. `process.env.NODE_ENV === 'production'` 일 때 `; Secure` 속성을 자동 부가하도록 헤더 생성 로직 보강을 제안합니다. |
| 2 | `check-content.ts` 의 단일 스키마 구조로 인한 `taxonomy.json` 검증 불능 | `BACKLOG.md:14-16`, `scripts/check-content.ts:25-45` | 보통 | `BACKLOG.md` P0 에서 `taxonomy.json` 이 최상위 `gallery`·`items` 부재로 `content:check` 에 실패함을 지적했습니다. 현재 검증기가 캠핑 JSON 구조만 상정하고 있어 새 시드 파일이 들어올 때마다 파이프라인 오류를 유발합니다. `check-content.ts` 에서 최상위 키 구조(`taxonomy` 등)를 판별해 다형적으로 검증하거나 시드 전용 검증 스크립트를 분리할 것을 제안합니다. |
| 3 | 신고(`Report`) 누적 방치 및 어뷰징 대응 처리 경로 부재 | `BACKLOG.md:29-30`, `prisma/schema.prisma:420` | 보통 | 10-24 이후 3주째 신고 접수만 되고 `isRemoved` 처리 및 제재 경로가 전무합니다. 악의적 사용자의 대량 허위 신고 또는 실제 유해 콘텐츠 발생 시 대응 수단이 없으므로, 복잡한 관리자 UI 전이라도 `PENDING` 신고 건수 조회 API 및 임시 숨김 처리(`isRemoved = true`)를 위한 최소한의 관리 라우트 신설이 필요합니다. |
| 4 | 쓰기 API 라우트 테스트 편중과 외부 엔드포인트 회귀 검증 부족 | `BACKLOG.md:11`, `tests/` | 보통 | BACKLOG 에서 지적한 대로 라우트 테스트가 `me` 와 `vote` 에 한정되어 있습니다. 특히 신규 추가된 `POST /api/views` 와 추후 복구될 `POST /api/items/[id]/report` 등 외부 쓰기 엔드포인트에 대해 `zod` 검증 실패(400), 미존재 대상(404), 트랜잭션 에러 처리 등을 검증하는 통합 테스트 보강이 요구됩니다. |

철학 위반 여부: 없음 (BACKLOG 격차 분석에서 설계 대비 코드의 미비점을 객관적으로 식별하고, ADR-0001 순위 분리 원칙을 충실히 견지함)
