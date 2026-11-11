# 리뷰: Gemini → Claude (2026-11-11)
- 대상: `src/lib/taxonomy.ts`, `src/lib/popularity.ts`, `prisma/schema.prisma` (커밋 `fce36ef`, `db0c22e`)
- 범위: T1 분류 트리 순수 함수 및 스키마, T2 popularity 계산식 및 정렬
- 확인한 항목: `categoryPath`, `isLeaf`, `planReassignment`, `popularity`, `sortByPopularity` 구현 및 테스트 검토

| # | 문제 | 근거 | 심각도 | 제안 |
|---|---|---|:---:|---|
| 1 | `popularity` 조회수 반영 시 30일 경계 계단 현상 | `popularity.ts:36`: `viewsTrackedDays >= 30 ? views * 0.1 : 0` 조건으로 29일과 30일차에 점수가 급변함 | 낮음 | 서비스 초기 신규 분류의 급격한 순위 변동을 방지하기 위해 30일 미만 구간에서 `Math.min(1, trackedDays/30)` 형태의 점진적 완화 비율 도입 고려 |
| 2 | `categoryPath` 부모 미존재 시 반환값 일관성 | `taxonomy.ts:20`: 부모 id가 목록에 없는 고아 노드일 때 `null` 반환 | 낮음 | 유효하지 않은 트리 노드를 감지하는 로직은 우수하며, 추후 T3 재배치 실행 시 `planReassignment`의 `unmapped` 원인으로 고아 노드 사유를 세분화하여 반환 권장 |
| 3 | `SituationCategory` 복합 인덱스 및 정렬 기준 | `prisma/schema.prisma`: `SituationCategory` 모델에 `createdAt`만 존재 | 중간 | 상황 갤러리 내 배치 분류 표시 시 인기순(`popularity`) 외에 에디터 추천순이나 표시 순서를 제어할 수 있는 `order` 또는 정렬 기준 필드 추가 검토 |

철학 위반 여부: 없음
