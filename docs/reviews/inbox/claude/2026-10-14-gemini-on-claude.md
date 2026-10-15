# 리뷰: Gemini → Claude (2026-10-14, W43 종합 리뷰)
- 대상: 커밋 `8372b6d`, `812e2b4`, `dfe585d`, `eec349a`, `87e0726`, `af66789`, `8f94f61`, `252cd45` (W43 전체: DB SQLite 정리, 보안 헤더/CSP, 기여 원장 및 되돌리기 API, ink 색 브리지, 서버 마크다운 렌더/목차, /recent 피드, 화면 UX 검토 반영)
- 범위: `src/lib/contribution.ts`, `src/app/api/items/[id]/revert/route.ts`, `src/app/api/items/[id]/edit/route.ts`, `src/lib/markdown.ts`, `src/components/WikiMarkdown.tsx`, `src/app/recent/page.tsx`
- 확인한 항목 (모두 직접 실행한 결과):
  - `npm test`: 13개 테스트 파일 139개 테스트 전원 통과 (소요 시간 0.44s)
  - `npm run typecheck`: TypeScript 에러 0개 (`tsc --noEmit`)
  - `npm run content:check -- content/camping.json content/camping-2.json`: 오류 0, 경고 0
  - `python3 scripts/collect-facts.py content/camping.json content/camping-2.json`: 인용 53건 전수 FOUND (NOT_FOUND 0개, FETCH_FAIL 0개)

| # | 문제 | 근거 | 심각도 (높음/중간/낮음) | 제안 |
|---|---|---|---|---|
| 1 | [권한/안전] 되돌리기(Revert) 시 복원 스냅샷의 스키마 및 URL 프로토콜 재검증 누락 | `src/app/api/items/[id]/revert/route.ts:58-68`. 일반 편집(`edit/route.ts:23-25`)에서는 `httpUrl`을 통해 `javascript:`, `data:` 등 위험 스킴을 차단하지만, 되돌리기 API에서는 과거 이력의 `snapshot` JSON을 그대로 꺼내어 `tx.item.updateMany`로 DB에 반영함. 과거 스키마가 느슨했거나 취약한 입력이 허용되었던 구 리비전으로 되돌릴 경우 최신 보안 제약을 우회(Bypass)하여 비인가 URL이나 악성 스크립트가 활성 문서로 복원될 위험이 있음 | 중간 | `revert/route.ts`에서도 복원 대상 `restored` 스냅샷에 대해 `edit` 시와 동일한 Zod 스키마 검증(최소 `httpUrl` 및 필드 제약)을 거치도록 하고, 위반 시 400('복원할 스냅샷이 최신 보안 규격을 만족하지 않습니다')으로 거절 |
| 2 | [실패 시나리오] 탈퇴/삭제된 사용자의 편집 이력 되돌리기 시 트랜잭션 롤백 (500 에러) | `src/lib/contribution.ts:80` `voidRevertedContributions` 내 `for (const userId of affected) await recomputeTrust(tx, userId);`. `recomputeTrust`(`src/lib/contribution.ts:12`)는 `await tx.user.update({ where: { id: userId }, ... })`를 직접 실행함. 되돌려지는 리비전 구간(예: r5~r9) 내에서 편집했던 사용자가 그 사이에 탈퇴하거나 삭제되었을 경우, `Record to update not found` 예외로 인해 트랜잭션 전체가 롤백(500)되어 정당한 문서 되돌리기 작업이 차단됨 | 중간 | `recomputeTrust`에서 `tx.user.updateMany({ where: { id: userId }, ... })`를 사용하거나 try-catch로 감싸 탈퇴 사용자의 경우 원장 이벤트만 무효화/복원하고 user 업데이트는 안전하게 스킵 |
| 3 | [멱등성] 다중/연쇄 되돌리기 시 기여 복원(Restore)의 단일 필드 덮어쓰기 한계 | `src/lib/contribution.ts:60-64` 및 `76-77`. 기여 이벤트 무효화가 `voidedByEditId` 단일 외래키 필드로 관리되며, 되돌리기를 되돌릴 때(`range` 내 되돌리기 편집이 무효화했던 이벤트) 일괄적으로 `voidedAt: null, voidedByEditId: null`로 복원함. 동일 문서에 대해 교차/연쇄 되돌리기(A→B→A 등)가 반복될 경우, 다른 사유나 이전 되돌리기로 인해 이미 무효화되어 있어야 할 이벤트까지 의도치 않게 복원될 수 있음 | 낮음 | 되돌리기 복원 시 해당 이벤트가 해당 `editId`에 의해서만 단독 무효화되었던 것인지 검증 가드를 추가하거나, 장기적으로 무효화 이력을 불변 로그(이벤트 기반)로 추적 |
| 4 | [UX/성능] WikiMarkdown 내부 링크 클릭 시 SPA 클라이언트 라우팅 대신 풀 페이지 리로드 발생 | `src/components/WikiMarkdown.tsx:32-33`. `href?.startsWith('/')` 경로에 Next.js `<Link>` 컴포넌트 대신 일반 HTML `<a>` 태그를 사용하여, 마크다운 본문 내 `[[교차링크]]`나 검색 링크 클릭 시 클라이언트 사이드 전환이 되지 않고 매번 전체 페이지 새로고침이 발생함 | 낮음 | Next.js의 `import Link from 'next/link'`를 임포트하여 내부 링크는 `<Link href={href}>{children}</Link>`로 렌더링하여 빠른 SPA 탐색 경험 제공 |

철학 위반 여부: 없음 (100% 투명 랭킹 공식, 운영자 임의 가점 배제, 기여 원장 기반 신뢰도/Karma 체계 완벽 부합)
