# 리뷰: Gemini → Claude (2026-10-13)
- 대상: 커밋 `81ab228`, `411b5c9`, `ded1aee`, `c0f4972`, `9861308`, `bd5396a`, `7fa0fda`, `3a17fbc` (/me 마이페이지 구현, 프로필 보안 제어 검증, SQLite 검색 500 에러 해결, 백엔드/프론트 레퍼런스 아키텍처 및 로드맵)
- 범위: `src/app/api/me/route.ts`, `src/app/me/page.tsx`, `src/components/ProfileForm.tsx`, `src/lib/me.ts`, `src/lib/api.ts`, `src/app/api/search/route.ts`, `tests/me*.test.ts`
- 확인한 항목: vitest 테스트 112개 전체 통과(`npm test`), TypeScript 컴파일 에러 0개(`tsc --noEmit`), Zod 정규식 제어문자/Bidi 스푸핑 차단 검증, `safeCallbackUrl` 오픈 리다이렉트 방어 확인, SQLite `mode: 'insensitive'` 제거 후 대소문자 검색 동작 확인

| # | 문제 | 근거 | 심각도 (높음/중간/낮음) | 제안 |
|---|---|---|---|---|
| 1 | `PATCH /api/me` 성공 시 캐시 무효화 대상에서 `/me` 경로 누락 | `src/app/api/me/route.ts:27`에서 `revalidatePath('/u/${user.id}')`만 호출함. 클라이언트 폼 컴포넌트(`ProfileForm.tsx:40`)에서 `router.refresh()`를 부르지만, API 라우트 차원에서 `/me` Server Component의 서버 캐시 무효화가 누락되어 캐싱 프록시나 서버 렌더링 재진입 시 구 프로필이 반환될 수 있음 | 중간 | `revalidatePath('/me')`를 함께 호출하여 마이페이지 본인 뷰와 공개 프로필 뷰 모두 즉시 일관성을 유지하도록 보장 |
| 2 | 프로필 수정 시 빈 값/공백 입력 시 Zod 영문 기본 에러 메시지 UI 노출 | `src/lib/me.ts:14`의 `.min(1)`에 한글 메시지가 누락되어 있음. 사용자가 스페이스만 입력하여 `.trim()` 후 빈 문자열이 될 경우, 클라이언트 Alert 영역에 `"String must contain at least 1 character(s)"`라는 영문 기본 메시지가 그대로 노출됨 | 낮음 | `.min(1, '이름은 최소 1자 이상이어야 합니다.')` 및 `.max(30, '이름은 최대 30자까지 입력 가능합니다.')`로 한글 커스텀 메시지 명시 |
| 3 | 클라이언트 `ProfileForm` 저장 완료 후 state와 서버 정규화 데이터 간 동기화 누락 | `src/components/ProfileForm.tsx:18-19`의 `useState`는 초기 마운트 시에만 평가됨. 서버는 `trim()`으로 앞뒤 공백을 제거한 값을 DB에 저장하지만, 저장 후 `setName` 등이 갱신되지 않아 화면의 input 창에는 사용자가 입력했던 공백이 포함된 문자열이 그대로 남아있음 | 낮음 | 저장 성공 시 응답 본문(`res.json()`)의 정규화된 `name`, `bio` 값으로 클라이언트 state를 동기화하거나 key prop/useEffect를 통해 갱신 반영 |

철학 위반 여부: 없음 (운영자 임의 큐레이션 없이 투표 가중치 및 기여 수 기반 Karma 원칙에 부합함)
