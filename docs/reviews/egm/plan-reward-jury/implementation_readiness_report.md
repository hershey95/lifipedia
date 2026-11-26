# Stage 9 · 구현 준비 검토 (DetailedRange 159-221)

검토자: egm-implementation-readiness, egm-codebase-details, egm-style(haiku). 모두 실행. 1회, 수정 반영 없음. 판정: **구현 준비 미달**. 코드 근거는 검토자 보고이며, 표 아래 "직접 확인"만 따로 확인했다.

| ID | 등급 | 행 | 문제 | 제안 |
|---|---|---|---|---|
| CD-3 | 🔴 | 166-167,175 (53-56) | `conceptAt`·등재가 `TalkComment` 에만 있음(`schema.prisma:311`, `api/talk/[commentId]/vote/route.ts:67`). `isConcept` 는 답글 제외(`comments.ts:49`) | `Post`·`PostComment` 에 `conceptAt`, 투표 라우트, 답글·"인정 댓글" 시점 |
| IR-1 / CD-4 | 🔴 | 101,175,216 | 되돌리기 라우트는 로그인·기여 수·속도·보호 수준·`baseRevision` 검사에 묶여 "그대로" 못 쓴다(`revert/route.ts:26-58`). 중간 리비전 무효·복원이 "`ContributionEvent` 불변"(167행)과 충돌 | 공용 함수 추출, 생략 검사, 편집자 기록, `toRevision`, 최초 리비전, 판정 중 새 편집 |
| IR-2 / CD-5 | 🔴 | 162-165,213 | `Report`↔사건 연결·상태 전이 없음, 대상당 열린 사건 1개 보장 없음, `revisionId` 의미 불명. OPEN 문서 신고는 보호 수준에 계속 반영(`protection-service.ts:32-39`). `reporterId` null 자동 신고 처리 없음 | `Report.caseId`, `ACTIONED`/`DISMISSED`, 중복 생성 방지 |
| IR-3 / CD-6 | 🔴 | 163-165,211,217 | `outcome` 이 "되돌리기+페널티"·"문제 없음"을 구분 못 함, `JurySeat.vote` 값·제외 id·대기 이의 상태·운영자 사유 저장처 없음, 신고 정지 14일 저장처 없음 | 전체 모델, 유형별 판정 값, 상태 전이표 |
| IR-4 / CD-9 | 🔴 | 162,171-175 | 파일 목록·API(투표·이의·운영자·임시조치·수익 입력) 없음, 블라인드 읽기 경로 누락(`Board.tsx:28`, `theme/[slug]/page.tsx:105,155,161`), `ReportButton.tsx`, `ADMIN_USER_IDS` 배포 설정 | 단계별 파일·API 계약·가림 지점 |
| IR-5 / CD-8 | 🔴 | 168-172 | "운영 설정"의 실체 없음. 정산·지분·원장에 유일 제약 없어 크론 재실행 시 중복 적립 | 설정 위치·키·기본값, `@@unique([categoryId, period])` 등, 트랜잭션 경계 |
| CD-2 | 🔴 | 55,167 | `RewardPoint` 유일키에 `categoryId` 가 없어 첨부 여러 개의 균등 분할이 충돌 | 키에 `categoryId`, 같은 소분류는 합산 뒤 내림 |
| CD-1 / IR-6 | 🔴 | 173 | `upkeep-service.ts` 는 크론이 아니라 `/contribute` 로더 | `api/cron/*` + `authorizeCron`, 주기(`vercel.json`, `DEPLOY_NAS.md`), 재실행 안전 |
| IR-7 / CD-7 | 🟡 | 159,165,175 | `NotificationKind` enum 추가·`itemId` 필수(`notify.ts:10-19`) 변경이 8절에 없음 | enum 값, 참조 필드, "모든 분류" 상실 표현 |
| IR-8 | 🟡 | 167,214-215 | 보류 점수 이월·복원 시 같은 유일키라 새 행 불가 | 기존 행 갱신 여부, `kind`·`sourceType` 값 목록 |
| IR-9 | 🟡 | 163-169 | FK·삭제 정책 없음. `Cascade` 면 계정 삭제 때 `FORFEIT` 기록 소실 | 모델별 `onDelete`, 금액 부호, 멱등 키 |
| IR-10 | 🟡 | 177-180,197 | 1단계 중간 확인점·테스트 파일 없음. 운영자 전환·이의·허위 신고 정지·보류 점수 사례 누락 | 하위 단계, 파일 경로, 기대값 |
| ST9-2 | 🟡 | 216 | 중간 리비전의 판정별 효과가 U11·6.1 과 안 맞음 | 최신/중간 × 판정 표 |
| ST9-3 | 🟡 | 215 | 복원 점수의 "그달"이 어느 달인지 불명 | "이의 판정이 끝난 달" |
| ST9-4 | 🟡 | 185 (138) | `looksLikeVoteBurst` 표시가 6.6(공개 사실만, 자동 점수 없음)과 충돌 소지 | 한 곳에서 정의 |
| ST9-1 | 🟢 | 179 | "1명이면 20% 지급"과 "1명이면 그 1명이 받는다"가 같은 줄(등급은 🟡→🟢 로 낮춤: 뒤 문장은 대상 선정 얘기로 읽힘) | 한 문장으로 |
| ST9-5 | 🟢 | 131,217 | 이의 "새 배심원 5명" vs 3명 이상 | 6.4 에 14절 참조 |
| CD-10 | 🟢 | 162 | zod `targetType` 은 `route.ts:10`(문서는 9행). UI 변경도 필요 | 정정 |

직접 확인(Grep): `conceptAt` 은 `src`·스키마에서 `TalkComment` 계열에만 있다. `upkeep-service.ts:18` 은 `loadUpkeep` 이고 크론 라우트는 `api/cron/{snapshot,lifecycle}` 이다.
