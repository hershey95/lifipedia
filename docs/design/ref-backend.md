# 설계서: 레퍼런스(위키백과·나무위키·Reddit·디시) 기반 백엔드·데이터·API 로드맵
- 작성: Claude (2026-10-11) / 상태: **초안 — 리뷰 대기**. 코드 변경 없음, 이 문서만 추가.
- 범위: 백엔드·데이터 모델·API·규칙. 화면 설계는 다루지 않는다(필요한 곳만 "화면 메모").
- 근거: `prisma/schema.prisma`, `src/lib/*.ts`, `src/app/api/**/route.ts`, `docs/design/2026-W42-mypage-karma.md`, `BACKLOG.md`, `AGENT_HANDOVER.md`, `README.md` (2026-10-11 코드 기준).
- 레퍼런스 사실 중 직접 확인하지 않은 것은 **(일반 지식 기준)** 으로 표시했다.

---

## 0. 코드 확인 결과 (설계 전제)

| # | 확인 사항 | 위치 | 설계 영향 |
|---|---|---|---|
| F1 | 기여 +1 은 문서 생성·편집에서만, `bumpContribution` 이 카운터를 **증가만** 한다. 되돌려진 편집도 기여로 남는다 | `src/lib/contribution.ts`, `api/items/route.ts`, `api/items/[id]/edit/route.ts` | 편집 농사(사소한 편집 반복 → 25건이면 EDITOR, 시간당 20건 한도라 2시간 안에 가능)를 막을 수 없다 → **ContributionEvent 가 P0** |
| F2 | 되돌리기 **API 가 없다**. `EditHistory.snapshot` 만 있다 | `api/items/[id]/` 에 revert 없음 | 되돌리기 API 를 P0 로 추가. 편집 분쟁 감지·보호 수준의 입력이 된다 |
| F3 | `EditHistory` 에 리비전 간 동일성 판정 수단이 없다 | schema | `contentHash` 추가로 "수동 되돌리기"까지 기계적으로 감지 |
| F4 | `TalkComment` 는 `parentId` 트리만 있고 투표·정렬·말머리가 없다. 조회는 `createdAt asc` 평면 | `talk/page.tsx`, `gallery/[slug]/page.tsx` | 댓글 투표·트리 정렬 P1 |
| F5 | `[[WikiLink]]` 는 렌더 시점 변환뿐(`WikiLink.tsx`), 링크 테이블이 없다 | `src/components/WikiLink.tsx` | 역링크·빨간 링크는 P2 이후 |
| F6 | 출처는 `import-content.ts` 가 `description` 끝에 `## 출처` 마크다운으로 붙인다. 구조화 필드 없음 | `scripts/import-content.ts:44` | 출처 필드화 P1, 기존 본문에서 추출하는 마이그레이션 필요 |
| F7 | 투표 라우트는 `findUnique → create` 가 트랜잭션 밖이다. 더블클릭 시 `@@unique([itemId,userId])` 위반(P2002) → 500 | `api/items/[id]/vote/route.ts` | 새 투표형 기능(댓글 투표)은 처음부터 upsert/트랜잭션으로. 기존 라우트는 별건 수정 |
| F8 | 투표 몰림 감지가 임계 초과 **이후 매 표마다** `Report` 를 만든다(중복 적재) | 같은 파일 | 새 자동 신고는 "(대상, 사유) OPEN 1건" 규칙으로 |
| F9 | 검색이 `mode: 'insensitive'` 를 쓴다. 생성된 클라이언트의 `activeProvider` 는 `sqlite` | `api/search/route.ts`, `node_modules/.prisma/client` | Prisma 는 SQLite 에서 `mode` 를 지원하지 않는 것으로 안다 **(일반 지식 기준, 실행 확인 필요)**. 이 문서의 검색성 기능(태그·피드 필터)은 `mode` 를 쓰지 않는다 |
| F10 | `schema.prisma` 는 `provider = "sqlite"` 인데 `docker-compose.yml` 은 PostgreSQL URL 과 `prisma db push --accept-data-loss` 로 기동한다 | `docker-compose.yml:30` | 파괴적 스키마 변경이 경고 없이 적용될 수 있다 → 7절 마이그레이션 규칙. provider 불일치는 열린 질문 Q1 |
| F11 | 테마는 계층(`parentId`)·`category` 문자열·라이프사이클(PROPOSED/ACTIVE/DORMANT)·팔로우가 이미 있다 | schema, `theme-lifecycle.ts` | 디시 "마이너 갤러리 승격"과 위키 "분류"의 상위 절반은 이미 충족 |
| F12 | `computeMomentum`(급상승)이 있다. 점수 자체에 45일 반감기 시간 감쇠가 들어 있다 | `ranking.ts` | Reddit hot/rising 을 위한 새 산정식은 만들지 않는다 |

---

## 1. 레퍼런스 vs 현황 격차표

상태: ● 있음 / ◐ 부분 / ○ 없음. 판정: **채택** / **변형**(우리 철학에 맞게 바꿔 채택) / **비채택**.

### 1.1 위키백과

| 기능 | 레퍼런스 동작 | 우리 현황 | 판정 | 이유 / 우리 버전 | 우선 |
|---|---|---|---|---|---|
| 리비전·diff | 모든 편집이 리비전, 임의 두 리비전 비교 | ● `EditHistory.diff/snapshot` (직전 대비 diff만) | 채택 | 임의 리비전 비교는 snapshot 두 개로 `buildDiff` 재사용, 저장 불필요 | P1(소) |
| 되돌리기(undo/rollback) | 특정 리비전으로 복원, 요약에 기록 | ◐ snapshot 만, API 없음 (F2) | 채택 | 복원도 새 리비전. `revertOfRevision` 기록 | **P0** |
| 토론 문서 | 문서별 Talk | ● `TalkComment` | 채택 | 트리 정렬·투표 추가(Reddit 항목) | P1 |
| 분류(Category) | 다중 분류, 분류 계층 | ◐ 테마 계층 + `category` 문자열 | 변형 | 상위 분류 = 테마 계층(유지). 문서 단위 다중 분류 = **태그**(편집 이력에 포함) | P2 |
| 위키링크 | `[[ ]]`, 역링크(What links here), 빨간 링크 | ◐ 렌더만 (F5) | 변형 | 역링크 테이블은 P2 후보. 지금은 렌더 유지 | P2 |
| 보호 수준 | semi(autoconfirmed: 4일+10편집), extended-confirmed(30일+500편집) 등, 관리자가 걸고 품 **(일반 지식 기준)** | ○ | 변형 | **관리자 수동 보호 비채택.** 보호 수준을 데이터(Top1 여부·되돌리기 빈도)로 매 요청 계산 | P1 |
| 편집 요청 | 보호 문서에 `{{edit request}}` 로 요청 **(일반 지식 기준)** | ○ | 변형 | 보호 문서에서 권한 미달 편집은 자동으로 `EditRequest` 로 전환, 자격자 1명 승인 | P1 |
| 최근 변경 | Special:RecentChanges, 필터 | ◐ 갤러리 탭에 테마별 편집 목록(`gallery/[slug]`) | 채택 | 전역/테마 필터·커서 페이지네이션 API | **P0** |
| 주시목록 | 문서 주시, 변경 시 목록에 표시. 생성·편집한 문서 자동 주시 옵션 **(일반 지식 기준)** | ○ (테마 팔로우만) | 채택 | 문서 주시 + 생성·편집 시 자동 주시. 목록은 pull 계산 | P1 |
| 출처·각주 | `<ref>`, 각주 목록, 출처 필요 표시 | ◐ 본문 `## 출처` (F6) | 변형 | `Item.sources` 구조 필드 + 본문 `[^n]` 마커 검증 | P1 |
| 문서 이동·병합·분할 | 이동 시 넘겨주기(redirect) 생성, 병합은 토론 합의 후 **(일반 지식 기준)** | ○ | 변형 | 이동 = 별칭(alias) 리다이렉트. 병합 = 2인 승인 + 공시 기간 + 표 이전 규칙 고정 | P2 |
| 관리자 권한·차단 | 관리자 선출, 차단 | ◐ `suspendedUntil` | 비채택(확장 안 함) | 규칙 위반 제재만 유지. 콘텐츠 판정 권한 신설 안 함 | — |

### 1.2 나무위키

| 기능 | 레퍼런스 동작 | 우리 현황 | 판정 | 이유 / 우리 버전 | 우선 |
|---|---|---|---|---|---|
| 계층 문서(상위/하위 문서) | `문서/하위` 형태 **(일반 지식 기준)** | ◐ 테마 계층 | 비채택(문서 계층) | 제품 문서는 테마 × 가격대에 놓인다. 문서 하위 문서는 3-Tier 구조와 충돌 | — |
| 목차 | 제목에서 자동 생성 | ○ (마크다운 렌더) | 채택(프론트만) | 헤딩에서 렌더 시 생성. **백엔드 변경 없음** | — |
| 각주 | `[* ]` 인라인 각주 | ◐ | 변형 | 위 "출처·각주"와 통합(`[^n]` + `sources`) | P1 |
| 분류 | 문서 하단 분류 | ◐ | 변형 | 태그로 통합 | P2 |
| 최근 변경 / 최근 토론 | 별도 특수 문서 **(일반 지식 기준)** | ◐ | 채택 | 피드 API 의 `kind=edit|talk` | P0(편집) / P1(토론) |
| ACL(문서별 권한) | 문서마다 읽기/편집/토론 권한을 관리자가 설정 **(일반 지식 기준)** | ○ | 변형 | 문서별 수동 ACL 비채택. **규칙 계산형 보호 수준**으로 대체 | P1 |
| 편집 요청 | 권한 없는 문서에 요청, 권한자가 승인 **(일반 지식 기준)** | ○ | 채택 | `EditRequest` | P1 |
| 문서 이동·역사 | 이동 시 역사 유지 | ○ | 채택 | `ItemAlias` + 이력은 item id 기준이라 자동 유지 | P2 |

### 1.3 Reddit

| 기능 | 레퍼런스 동작 | 우리 현황 | 판정 | 이유 / 우리 버전 | 우선 |
|---|---|---|---|---|---|
| 서브레딧 | 주제별 커뮤니티, 누구나 생성, 모더레이터 운영 | ● 테마(제안→팔로워 임계 승격) | 변형(유지) | 모더레이터 대신 수요 기반 승격. 추가 작업 없음 | — |
| 업/다운보트 | 게시물·댓글 | ◐ 제품만 | 채택 | 댓글 투표 추가(가중치는 `voteWeightFor` 재사용) | P1 |
| 카르마 | 받은 투표 합 **(일반 지식 기준)** | ◐ 기여 수 기반 신뢰도 | **비채택** | 받은 표로 신뢰도를 올리면 자기강화·조작 비용 최저(W42 D1). 신뢰도는 기여 원장에서만 | — |
| 정렬 hot/new/top/rising | hot = 득표+시간, rising = 단기 상승 | ● top(`score`), new(`createdAt`), rising(`computeMomentum`) | 변형 | `score` 에 이미 시간 감쇠 → hot 별도 산정식 불필요. 정렬 키만 API 로 노출 | P1(소) |
| 댓글 트리·best 정렬 | best = 찬성 비율 Wilson 하한 **(일반 지식 기준)** | ◐ 트리만 | 채택 | `wilsonLowerBound` 재사용 | P1 |
| 플레어 | 게시물 라벨 | ○ | 변형 | 디시 말머리와 통합: 최상위 댓글 `tag` 고정 enum | P1 |
| 모더레이터 핀/삭제 | 모더 수동 고정 | ○ | **비채택** | 운영자 큐레이션 금지 | — |
| 알림(inbox) | 답글·멘션 | ○ | 채택 | 직접 수신자 이벤트만 저장(push), 주시목록은 pull | P1 |

### 1.4 디시인사이드

| 기능 | 레퍼런스 동작 | 우리 현황 | 판정 | 이유 / 우리 버전 | 우선 |
|---|---|---|---|---|---|
| 갤러리 | 주제별 게시판 | ● 테마 = 갤러리(`/gallery/[slug]`) | 유지 | — | — |
| 마이너 갤러리 승격 | 마이너 → 정식 갤러리 승격 **(일반 지식 기준)** | ● PROPOSED→ACTIVE→DORMANT | 유지 | 이미 규칙 기반 | — |
| 개념글 | 추천 수가 갤러리별 기준 이상이면 자동 등재, 매니저 수동 지정도 가능 **(일반 지식 기준)** | ○ | 변형 | **자동 기준만** 채택, 수동 지정 비채택. 가중 추천·참여자 수·Wilson 하한 3중 조건 | P1 |
| 실시간 베스트 | 사이트 전체 급상승 | ◐ `computeMomentum` | 변형 | 제품: 기존 momentum. 댓글: 개념글 최신순으로 충분 | P2 |
| 말머리 | 글 분류 접두어(질문/정보/후기 등) | ○ | 채택 | 고정 enum 5개 | P1 |
| 익명·유동닉 | 비로그인 글쓰기, IP 일부 표시 **(일반 지식 기준)** | ○ (로그인 필수) | **비채택** | 신뢰도가 기여 이력에서만 나오려면 행위 주체가 계정이어야 한다. 익명 투표는 가짜 투표 방지 원칙과 충돌 | — |
| 어뷰징 대응(추천 조작·도배) | IP/쿨타임, 매니저 차단 | ◐ 시간당 한도, 신규 7일 가중치 0.25, 몰림 감지 | 채택·강화 | 기여 원장 + 편집 무효화 + 자동 신고 중복 방지 | P0~P1 |
| 갤러리 매니저 | 갤러리별 관리자 | ○ | **비채택** | 운영자/매니저 큐레이션 금지 | — |

---

## 2. 채택 기능별 백엔드 설계

### 2.0 공통 규약 (모든 신규 라우트)
- 처리 순서는 기존 라우트와 동일: `currentUser()` → 401 → `isSuspended` 403 → `checkRate`(429) → zod parse(400, `handleError`) → 존재 확인(404) → 테마 상태 `canContribute`(403) → 트랜잭션.
- 응답 헬퍼 `ok`/`fail` 그대로. 에러 본문 `{ error, ...extra }`.
- 목록 API 는 **커서 페이지네이션**: `cursor = base64url("<createdAtISO>|<id>")`, 정렬 `(createdAt desc, id desc)`, `limit` 1~100 기본 50. 인코딩/디코딩은 순수 함수 `src/lib/cursor.ts`.
- 상수는 반드시 아래 "규칙 상수 파일"에 두고 `/how-ranking-works` 가 직접 import 해 표시한다(README 원칙: 설명과 구현이 어긋날 수 없다).
- 순수 계산은 `src/lib/<도메인>.ts`(prisma import 금지), DB 조합은 라우트 또는 `*-service.ts`. 테스트는 순수 함수 단위 + 라우트는 `tests/me-route.test.ts` 처럼 `vi.mock('@/lib/db')`.
- 자동 생성 `Report` 는 `(targetType, targetId, reason, status=OPEN)` 이 이미 있으면 만들지 않는다(F8 재발 방지).

### 2.1 우선순위 요약

| 우선 | 기능 | 규모 | 새 모델/필드 | 핵심 이유 |
|---|---|---|---|---|
| **P0** | A. 되돌리기 API + 리비전 해시 | S | `EditHistory.contentHash`, `revertOfRevision` | B·D·편집분쟁 감지의 입력 |
| **P0** | B. 기여 이벤트 원장 `ContributionEvent` | M | 새 모델 | 신뢰도 = 투표 가중치. 현재 농사 가능(F1) |
| **P0** | C. 최근 변경 피드 | S | 인덱스 1 | 집단 검증의 눈. 되돌리기와 짝 |
| P1 | D. 문서 보호 수준(규칙 계산) | S | 없음(계산형) | Top1 문서 반달 방지 |
| P1 | E. 편집 요청 / 검토 큐 | M | `EditRequest` | D 의 우회로 |
| P1 | F. 주시목록 | S | `Watch` | 기여자 재방문·검증 |
| P1 | G. 알림 이벤트 | M | `Notification` | E·F·댓글 답글 통지 |
| P1 | H. 댓글 트리 정렬 + 투표 + 말머리 | M | `CommentVote`, `TalkComment` 필드 | 토론 품질 |
| P1 | I. 개념글 | S | `TalkComment.conceptAt` 등 | H 위에 얹는 규칙 |
| P1 | J. 출처·각주 필드화 | M | `Item.sources` | BACKLOG facts 구조의 전 단계 |
| P2 | K. 분류/태그 | M | `Tag`, `ItemTag` | 테마 횡단 탐색 |
| P2 | L. 문서 이동·병합·분할 | L | `ItemAlias`, `Item.mergedIntoId`, `EditRequest.kind` | 중복 문서 정리. 랭킹 영향 큼 |

---

### A. 되돌리기 API + 리비전 해시 (P0, S)

**데이터 모델**
```prisma
model EditHistory {
  // 기존 필드 유지
  contentHash      String?  // sha256(canonicalJSON(snapshot)). 백필 전 null 허용
  revertOfRevision Int?     // 이 편집이 복원한 리비전 번호(명시적 되돌리기 또는 해시 일치 감지)
  @@index([itemId, contentHash])
  @@index([createdAt, id])     // C. 전역 최근 변경
}
```
- 순수 함수 `src/lib/wiki.ts`: `canonicalJson(snapshot)`(키 정렬, `EDITABLE_FIELDS` 순서), `snapshotHash(snapshot)`(node `crypto`).
- **수동 되돌리기 감지**: 편집 저장 시 `merged` 해시가 같은 문서의 최근 `REVERT_LOOKBACK_REVISIONS`(=10) 리비전 중 하나와 같으면 그 리비전 번호를 `revertOfRevision` 에 기록. 명시적 API 와 동일 취급.

**API**

| 메서드·경로 | 인증 | 본문/검증 | 성공 | 에러 |
|---|---|---|---|---|
| `POST /api/items/[id]/revert` | 로그인, 비정지, `canEditAt(보호수준)` (D) | `{ toRevision: int≥1, baseRevision: int≥1, summary?: ≤200 }` | 200 `{ revision, revertOfRevision }` | 401, 403(정지/보호/비ACTIVE), 404(문서·리비전 없음), 409(`baseRevision ≠ item.revision`: 되돌리기는 자동 병합하지 않는다), 400(복원 대상이 현재와 동일), 429(`EDITS_PER_HOUR` 공유) |
| `GET /api/items/[id]/revisions/compare?from=&to=` | 공개 | 정수 2개 | 200 `{ diff }` (`buildDiff` 재사용, 저장 안 함) | 404 |

- 트랜잭션: `item.update(snapshot of toRevision)` + `editHistory.create({ revertOfRevision: toRevision, summary: summary ?? 'r{n}로 되돌림' })` + B 의 무효화 처리 + `theme.lastActivityAt`.
- 되돌리기 자체는 **기여로 적립하지 않는다**(되돌리기 농사 방지). B 참고.

**랭킹·어뷰징**: 랭킹 무관(표는 item 에 붙어 있음). 단 `tier` 필드 되돌리기는 문서를 다른 가격대 순위로 옮긴다 → 기존 편집과 동일한 영향, 추가 위험 없음. 되돌리기 전쟁은 D 의 보호 수준 상승으로 자동 진정.

**성능**: 쿼리 4~5개. 해시 조회는 `(itemId, contentHash)` 인덱스.

---

### B. 기여 이벤트 원장 `ContributionEvent` (P0, M)

**목표**: `User.contributionCount` 를 "증가 전용 카운터"에서 "무효화되지 않은 이벤트 수의 캐시"로 바꾼다. 신뢰도 공식(`trustFromContributions`)·뱃지 임계값은 그대로.

**데이터 모델**
```prisma
enum ContributionKind {
  ITEM_CREATE
  EDIT
  EDIT_REQUEST_ACCEPTED   // E. 요청자에게 적립(승인자 아님)
}

model ContributionEvent {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      ContributionKind
  itemId    String?          // 문서 삭제 후에도 이력 보존: FK 없이 문자열로 보관
  editId    String?          @unique // EditHistory.id. 백필 멱등 키
  credited  Boolean          // 적립 규칙(아래) 통과 여부. false 도 기록해 재현 가능하게
  reason    String?          // 미적립/무효 사유 코드: TOO_SMALL, DAILY_ITEM_CAP, REVERTED ...
  voidedAt  DateTime?
  voidedByEditId String?     // 이 이벤트를 무효화한 되돌리기 EditHistory.id
  createdAt DateTime         @default(now())

  @@index([userId, createdAt])
  @@index([itemId, createdAt])
}
```
- `itemId` 에 FK 를 걸지 않는 이유: `Item` 삭제(Cascade) 시에도 원장이 남아야 한다(BACKLOG·W42 D2 요구).

**적립 규칙 (순수 함수 `src/lib/contribution-rules.ts`, 상수 `CONTRIBUTION_RULES`)**

| 규칙 | 상수 | 기본값 | 판정 입력 |
|---|---|---|---|
| 최소 변경량: 변경 문자 수(삽입+삭제) 미만이면 미적립. 단 `tier`·`priceKrw`·`purchaseLinks`·`sources` 변경은 크기 무관 적립 | `MIN_EDIT_DELTA_CHARS` | 20 | `changedFields`, diff 통계 |
| 같은 문서 일일 적립 상한(사용자당, UTC 일) | `MAX_CREDITED_EDITS_PER_ITEM_PER_DAY` | 2 | 당일 credited 이벤트 수 |
| 되돌리기 편집은 미적립 | — | — | `revertOfRevision != null` |
| 타인이 되돌리면 되돌려진 구간의 이벤트 무효 | `VOID_ON_REVERT` | true | 아래 무효화 규칙 |
| 본인이 자기 편집을 되돌리면 그 이벤트 무효 | — | — | 동일 |

- **무효화 규칙(결정적)**: 리비전 `r` 로 되돌리는 편집 R 이 생기면 `(r, R)` 사이 리비전들의 `credited && !voidedAt` 이벤트를 `voidedAt=now, voidedByEditId=R.id` 로 표시. R 이 다시 되돌려지면(R 이후 리비전이 R 이전 해시로 복귀) `voidedByEditId = R.id` 인 이벤트를 **복원**(`voidedAt=null`). 따라서 결과는 리비전 순서만으로 재계산 가능.
- `bumpContribution(tx, userId)` → `recordContribution(tx, { userId, kind, itemId, editId, credited, reason })` + `recomputeTrust(tx, userIds[])` 로 교체. `recomputeTrust` = `count({ userId, credited: true, voidedAt: null })` → `trustScore`, `badgeLevel` 갱신. 무효화는 여러 사용자에 걸치므로 배열 입력.

**API**

| 메서드·경로 | 인증 | 설명 | 에러 |
|---|---|---|---|
| `GET /api/users/[id]/contributions?cursor&limit` | 공개 | 원장 열람(credited·reason·voided 포함). 신뢰도 근거의 투명 공개 | 404 |

- 쓰기 API 없음. 원장 변경 경로는 생성·편집·되돌리기·편집요청 승인 라우트 내부뿐(운영자 수정 API 금지, `trust.ts` 원칙 유지).

**랭킹·어뷰징 영향**

| 시나리오 | 지금 | 이후 |
|---|---|---|
| 공백·오탈자 반복 편집으로 EDITOR 달성 | 가능(F1) | `MIN_EDIT_DELTA_CHARS` + 문서당 일 2건 → 25건에 최소 13개 문서 × 의미 있는 변경 필요 |
| 다계정으로 서로 편집해 신뢰도 올리기 | 가능 | 여전히 가능하나 비용 증가. 되돌려지면 무효. 남은 위험은 Q4 |
| 악의적 되돌리기로 남의 신뢰도 깎기 | 해당 없음 | 되돌리기는 보호 수준(D)·편집 한도에 걸리고, 재되돌리기로 원복. 되돌리기 반복 → 문서가 SEMI 이상으로 잠김 |
| 신뢰도 하락이 과거 랭킹을 바꾸나 | — | **바꾸지 않는다.** `Vote.weight` 는 투표 시점 고정 |

**마이그레이션**: 새 테이블(안전). 백필 스크립트 `scripts/backfill-contributions.ts` — `EditHistory` 를 리비전 순으로 재생해 이벤트 생성(`editId` unique 로 멱등), `--dry` 로 사용자별 `old count → new count` 차이를 출력 후 적용. **주의**: 시드·`content:import` 로 만든 이력(F6 스크립트는 `bumpContribution` 미호출)이 백필로 기여가 될 수 있다 → 백필은 `editorId` 가 있는 이력만, 결과 차이를 리뷰 문서에 남긴다(Q5).

**성능**: 편집당 +2 쿼리(insert, count). count 는 `(userId, createdAt)` 인덱스로 사용자 단위. 무효화는 문서당 최대 10 리비전 범위.

---

### C. 최근 변경 피드 (P0, S)

**데이터**: 새 테이블 없음. `EditHistory` + A 의 `@@index([createdAt, id])`. 테마 필터는 `item: { themeId }` 조인(기존 `Item @@index([themeId, tier, score])` 의 선두 컬럼 사용).

**API**

| 메서드·경로 | 인증 | 쿼리 검증 | 응답 |
|---|---|---|---|
| `GET /api/changes` | 공개 | `theme?: slug`, `kind?: 'all'|'create'|'edit'|'revert'`, `user?: id`, `cursor?`, `limit 1~100 (50)` | `{ entries: [{ editId, itemId, itemName, href, themeSlug, revision, revertOfRevision, summary, editor: {id,name,badgeLevel}, createdAt, sizeDelta, credited }], nextCursor }` |

- `kind` 매핑: create = `revision = 1`, revert = `revertOfRevision != null`, edit = 나머지.
- `credited` 는 B 원장 조인(편집 1건당 1행, `editId` unique). 피드에서 "기여 미적립(사소한 편집)" 표시 → 편집 농사가 공개적으로 보인다.
- `sizeDelta` 는 저장하지 않고 `diff` 문자열에서 `+`/`-` 행 길이 합으로 계산하는 순수 함수(`src/lib/wiki.ts: diffStats`). 리스트당 최대 100건이라 비용 무시 가능. 느려지면 `EditHistory.sizeDelta Int?` 로 캐시(그때 추가).
- 404: `theme` slug 없음. 400: 잘못된 커서.
- 토론 피드(`kind=talk`)는 H 이후 같은 엔드포인트에 추가(`TalkComment @@index([createdAt, id])` 필요).

**성능**: 쿼리 1~2개, 인덱스 범위 스캔. 캐시 없음(`force-dynamic`). SQLite 읽기는 writer 와 경합 없음(WAL 전제, 7절).

---

### D. 문서 보호 수준 — 규칙 계산형 (P1, S)

**원칙**: 보호를 "누가 거는" 것이 아니라 "데이터로 계산되는" 것으로 만든다. DB 에 보호 상태를 저장하지 않으므로 운영자가 바꿀 필드 자체가 없다.

**순수 함수 `src/lib/protection.ts`**
```ts
export const PROTECTION_RULES = {
  SEMI_MIN_ACCOUNT_DAYS: 4,          // 위키백과 autoconfirmed 와 같은 값 (일반 지식 기준)
  SEMI_MIN_CONTRIBUTIONS: 5,         // = CONTRIBUTOR 임계(trust.ts BADGE_THRESHOLDS)
  EXTENDED_MIN_ACCOUNT_DAYS: 30,
  EXTENDED_MIN_CONTRIBUTIONS: 25,    // = EDITOR
  EDIT_WAR_WINDOW_HOURS: 48,
  EDIT_WAR_SEMI_REVERTS: 3,          // 창 안 되돌리기 ≥3 → SEMI
  EDIT_WAR_EXTENDED_REVERTS: 6,      // 창 안 되돌리기 ≥6 → EXTENDED
  TOP_RANK_SEMI: 1,                  // 현재 가격대 1위(비 provisional)면 SEMI
  OPEN_REPORTS_SEMI: 3,              // 서로 다른 신고자 OPEN 신고 ≥3 → SEMI
} as const;
export type ProtectionLevel = 'NONE' | 'SEMI' | 'EXTENDED';
export function requiredLevel(s: { recentReverts: number; isTopRank: boolean; openReporters: number }): ProtectionLevel;
export function userLevel(u: { createdAt: Date; contributionCount: number; now: Date }): ProtectionLevel;
export function canEditAt(required: ProtectionLevel, user: ProtectionLevel): boolean;
```
- 보호는 **편집·되돌리기에만** 적용. 토론·투표·편집 요청은 항상 열림(나무위키 ACL 처럼 토론까지 막지 않는다).
- `isTopRank` 판정: `rankTier` 를 매 편집마다 돌리지 않는다. `Item.score` 가 해당 `(themeId, tier)` 최대인지 1쿼리(`orderBy score desc take 1`, 기존 인덱스) + `distinctVoters` 대신 `upCount+downCount ≥ MIN_DISTINCT_VOTERS` 근사. 근사 오차는 "보호가 더 일찍 걸림" 방향이라 안전.
- `recentReverts`: `editHistory.count({ itemId, revertOfRevision: { not: null }, createdAt ≥ now-48h })`.
- 해제는 자동: 창이 지나면 되돌리기 수가 줄어 NONE 으로 돌아간다. 만료 배치 불필요.

**API 변경**
- `POST /api/items/[id]/edit`, `/revert`: 권한 미달 시 **403 대신 202** `{ queued: true, editRequestId, requiredLevel }` 로 E 에 적재(편집 요청 자동 전환). 클라이언트가 원치 않으면 `{ requestIfProtected: false }` → 403 `{ error, requiredLevel, userLevel }`.
- `GET /api/items/[id]/protection` (공개): `{ requiredLevel, reasons: ['EDIT_WAR'|'TOP_RANK'|'REPORTS'], myLevel? }` — 이유까지 공개(투명성).

**어뷰징**: (1) 경쟁 제품 문서를 일부러 되돌려 잠그기 → 잠겨도 편집 요청 경로가 열려 있고, 잠근 쪽도 같은 제한을 받는다. (2) 신고 3건으로 잠그기 → 서로 다른 신고자 기준 + 신고자 계정 4일 미만 제외. (3) 1위 문서 반달 → SEMI 로 신규 계정 차단.

**성능**: 편집 요청당 +3 count 쿼리(모두 인덱스). 문서 페이지 표시용은 같은 함수 재사용.

---

### E. 편집 요청 / 검토 큐 (P1, M)

**데이터 모델**
```prisma
enum EditRequestKind { EDIT MOVE MERGE }        // MOVE/MERGE 는 L 에서 사용
enum EditRequestStatus { OPEN ACCEPTED REJECTED EXPIRED SUPERSEDED }

model EditRequest {
  id           String            @id @default(cuid())
  kind         EditRequestKind   @default(EDIT)
  itemId       String
  item         Item              @relation(fields: [itemId], references: [id], onDelete: Cascade)
  requesterId  String?
  requester    User?             @relation("EditRequester", fields: [requesterId], references: [id], onDelete: SetNull)
  baseRevision Int
  proposed     Json              // EDIT: ItemSnapshot / MOVE: {toThemeId} / MERGE: {targetItemId}
  summary      String?
  status       EditRequestStatus @default(OPEN)
  reviewerId   String?
  reviewNote   String?           // 거절 시 필수
  approvals    Json              @default("[]") // MERGE 다중 승인용 [{userId, at}]
  resultEditId String?           // 승인으로 생긴 EditHistory.id
  createdAt    DateTime          @default(now())
  decidedAt    DateTime?
  @@index([status, createdAt])
  @@index([itemId, status])
  @@index([requesterId, createdAt])
}
```

**규칙 (`src/lib/edit-request.ts`, 상수 `EDIT_REQUEST_RULES`)**

| 규칙 | 상수 | 기본값 |
|---|---|---|
| 검토 자격: `canEditAt(현재 requiredLevel, reviewerLevel)` 이고 요청자 본인 아님 | — | — |
| EDIT 승인 수 | `EDIT_APPROVALS` | 1 |
| MERGE/MOVE 승인 수(서로 다른 사람) + 공시 기간 | `STRUCTURAL_APPROVALS`, `STRUCTURAL_NOTICE_HOURS` | 2, 72 |
| 만료 | `EXPIRE_DAYS` | 14 (lifecycle cron 에서 `OPEN && createdAt < now-14d` → EXPIRED) |
| 사용자당 OPEN 요청 상한 | `MAX_OPEN_PER_USER` | 10 |
| 문서당 OPEN 요청 상한 | `MAX_OPEN_PER_ITEM` | 20 |

**API**

| 메서드·경로 | 인증 | 검증 | 성공 | 에러 |
|---|---|---|---|---|
| `POST /api/items/[id]/edit-requests` | 로그인·비정지 | edit 본문과 동일 스키마 | 201 `{ id }` | 400, 404, 403(비ACTIVE), 429(상한) |
| `GET /api/edit-requests?status=OPEN&theme=&cursor` | 공개 | — | `{ requests, nextCursor }` (각 항목 diff 포함) | 400 |
| `POST /api/edit-requests/[id]/accept` | 검토 자격 | `{ note? }` | 200 `{ status, revision? }` | 403(자격·본인), 404, 409(이미 결정, 또는 `resolveEdit` 충돌 → 요청을 SUPERSEDED 로 두고 409) |
| `POST /api/edit-requests/[id]/reject` | 검토 자격 | `{ note: 1~500 }` 필수 | 200 | 403, 404, 409 |
| `DELETE /api/edit-requests/[id]` | 요청자 본인 | — | 204(=취소, REJECTED 아님 → status 를 EXPIRED 로) | 403, 404, 409 |

- 승인 적용은 편집 라우트와 **같은 함수**(`applyEdit(tx, …)` 로 추출)를 쓴다: `resolveEdit(base=proposed 기준 리비전, incoming=proposed, current)`. 편집자 = 요청자(`editorId=requesterId`), 요약에 `편집 요청 #id 승인(검토: reviewer)`.
- 원장: 요청자에게 `EDIT_REQUEST_ACCEPTED`(B 의 적립 규칙 동일 적용). **승인자는 적립 없음**(승인 농사·담합 방지, Q3).
- 알림(G): 요청자에게 ACCEPTED/REJECTED, 문서 주시자는 pull 로 봄.

**어뷰징**: 담합 승인(다계정) → 검토자도 SEMI/EXTENDED 자격(4일·5기여 / 30일·25기여)이 필요하고, 승인 결과 편집도 일반 편집처럼 되돌리기·원장 무효화 대상. 거절 남발 → 거절 사유 필수 + 공개 목록.

---

### F. 주시목록 (P1, S)

**데이터 모델**
```prisma
model Watch {
  userId    String
  itemId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([userId, itemId])
  @@index([itemId])
}
```
- 자동 주시: 문서 생성·편집·편집요청 시 `upsert`(이미 있으면 무시). 사용자 설정 토글은 만들지 않는다(필요 시 Q 후보).
- 상한 `WATCH_RULES.MAX_PER_USER = 1000`(초과 시 자동 주시는 조용히 생략, 수동은 429).

**API**

| 메서드·경로 | 인증 | 설명 | 에러 |
|---|---|---|---|
| `POST /api/items/[id]/watch` | 로그인 | 토글(팔로우 라우트와 같은 패턴) → `{ watching }` | 401, 404, 429 |
| `GET /api/me/watchlist?cursor&limit` | 로그인 | 주시 문서들의 최근 변경 = `editHistory.findMany({ where: { item: { watchers: { some: { userId } } }, editorId: { not: userId } }, orderBy: createdAt desc })` | 401 |

- **pull 방식**: 주시 변경은 알림 행을 만들지 않는다. 편집 1건이 주시자 N명에게 쓰기 N회를 일으키지 않으므로 SQLite 단일 writer 에 부담이 없다. "새 변경 n건" 배지는 `User.watchlistSeenAt DateTime?` 하나로 계산(`createdAt > watchlistSeenAt` count).
- 투표·랭킹 영향 없음. 주시자 수는 공개하지 않는다(문서 인기 지표로 오용 방지).

---

### G. 알림 이벤트 (P1, M)

**원칙**: **수신자가 1명으로 정해지는 이벤트만 저장(push)**, 다수 대상(주시·테마 팔로우)은 F 처럼 읽을 때 계산(pull).

```prisma
enum NotificationKind {
  TALK_REPLY              // 내 댓글에 답글
  EDIT_REVERTED           // 내 편집이 타인에게 되돌려짐 (B 무효화와 같은 트랜잭션)
  EDIT_REQUEST_DECIDED    // 내 편집 요청 승인/거절
  CONCEPT_REACHED         // 내 댓글이 개념글이 됨
  STRUCTURAL_PROPOSED     // 내가 만든 문서에 이동/병합 요청 (L)
}
model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      NotificationKind
  actorId   String?          // 행위자 (본인 행위면 알림 생성 안 함)
  itemId    String?
  refId     String?          // commentId / editId / editRequestId
  readAt    DateTime?
  createdAt DateTime         @default(now())
  @@index([userId, readAt, createdAt])
  @@unique([userId, kind, refId]) // 같은 이벤트 중복 방지(재시도 안전)
}
```

| 메서드·경로 | 인증 | 설명 | 에러 |
|---|---|---|---|
| `GET /api/notifications?unread=1&cursor&limit` | 로그인 | 목록 + `unreadCount` | 401 |
| `POST /api/notifications/read` | 로그인 | `{ ids: string[≤100] } | { all: true }` → `updateMany({ userId: me, ... })` | 401, 400 |

- 생성은 각 라우트 트랜잭션 안에서 `createMany` 최대 1~2행. 실패 시 원 작업도 롤백(일관성 우선; 알림 행은 작다).
- 보존: lifecycle cron 에서 `readAt < now-90d` 삭제(`NOTIFICATION_RULES.RETENTION_DAYS=90`).
- 실시간 전송(SSE/웹푸시)은 범위 밖. 헤더는 페이지 이동 시 `unreadCount` 조회.

---

### H. 댓글 트리 정렬 + 댓글 투표 + 말머리 (P1, M)

**데이터 모델**
```prisma
enum TalkTag { QUESTION REVIEW INFO DEBATE EDIT_PROPOSAL }   // 질문/후기/정보/토론/수정제안

model TalkComment {
  // 기존 필드 유지
  tag        TalkTag?          // 최상위 댓글만 허용(라우트 검증)
  upCount    Int      @default(0)
  downCount  Int      @default(0)
  bestScore  Float    @default(0)    // 가중 Wilson 하한 캐시
  conceptAt  DateTime?               // I
  votes      CommentVote[]
  @@index([itemId, parentId, bestScore])
  @@index([createdAt, id])           // C 토론 피드
}

model CommentVote {
  commentId String
  userId    String
  comment   TalkComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      VoteType
  weight    Float                   // voteWeightFor 로 투표 시점 고정 (Vote 와 동일 원칙)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  @@id([commentId, userId])
  @@index([userId, createdAt])
}
```

**정렬 (순수 함수 `src/lib/comments.ts`)**

| sort | 키 | 비고 |
|---|---|---|
| `best`(기본) | `wilsonLowerBound(가중UP, 가중합)` → 동률 `createdAt asc` → `id` | `ranking.ts` 재사용, **시간 감쇠 없음**(토론은 오래돼도 가치 유지) |
| `new` | `createdAt desc, id desc` | |
| `old` | `createdAt asc, id asc` | 현재 동작 |
| `controversial` | 비채택 | 운영 판단 없이 의미 해석이 어려움 |

- `buildCommentTree(flat, sort)`: 문서 댓글 전체(상한 `COMMENT_RULES.MAX_PER_ITEM_FETCH = 500`)를 1쿼리로 가져와 메모리에서 트리 구성·형제 정렬. `MAX_DEPTH = 8` 초과는 8단계에 평탄화. 500 초과 시 최상위만 커서 페이지네이션(그때 추가).
- 삭제(`isRemoved`)된 댓글은 자식이 있으면 "삭제된 댓글" 자리표시, 없으면 제외.

**API**

| 메서드·경로 | 인증 | 검증 | 성공 | 에러 |
|---|---|---|---|---|
| `GET /api/items/[id]/talk?sort=best|new|old` | 공개 | enum | `{ tree, total }` | 404 |
| `POST /api/items/[id]/talk` (확장) | 기존 | `tag?: TalkTag` — `parentId` 있으면 400 | 201 | 기존 + 400 |
| `POST /api/talk/[commentId]/vote` | 로그인·비정지·ACTIVE 테마 | `{ type: 'UP'|'DOWN' }` 같은 방향 재투표=취소 | 200 `{ action, myVote, upCount, downCount, bestScore, becameConcept }` | 401, 403(정지/본인 댓글/비ACTIVE), 404, 429 |

- 투표 처리는 **트랜잭션 + `upsert`**(F7 재발 방지): `$transaction([upsert/delete, aggregate, update comment])`. 집계는 해당 댓글 votes 전체 재계산(댓글당 표 수 작음).
- 한도: `ABUSE_LIMITS.COMMENT_VOTES_PER_HOUR = 120`(`abuse.ts` 에 추가), 몰림 감지는 `looksLikeVoteBurst` 재사용.

**랭킹·신뢰도 영향**: **없음.** 댓글 표는 `Item.score` 와 `contributionCount` 어느 쪽에도 들어가지 않는다(W42 D1 유지). 댓글 표의 유일한 효과는 정렬과 개념글.

---

### I. 개념글 (P1, S)

**규칙 (`src/lib/comments.ts`, 상수 `CONCEPT_RULES`)** — 최상위 댓글만 대상.

| 조건(모두 충족) | 상수 | 기본값 |
|---|---|---|
| 가중 추천 합(감쇠 없음) | `MIN_WEIGHTED_UP` | 8.0 |
| 서로 다른 추천자 수 | `MIN_DISTINCT_UPVOTERS` | 5 |
| 가중 Wilson 하한 | `MIN_WILSON` | 0.6 |
| 작성 후 판정 기간 | `WINDOW_DAYS` | 7 (이후 표는 개념글 판정에 무관) |
| 신규 계정(7일 미만) 표 제외 | `EXCLUDE_NEW_ACCOUNT_VOTES` | true (weight 0.25 표를 집계에서 제외) |

- `isConcept(votesWithinWindow)` 순수 함수. 투표 라우트에서 판정해 처음 충족 시 `conceptAt = now` 를 **한 번만** 기록(이후 표 철회로 해제하지 않음 — 디시 개념글과 같이 "등재 이력"으로 취급). 판정 근거는 `CommentVote` 의 고정 가중치·시각뿐이므로 언제든 재계산·검증 가능(`scripts/verify-concepts.ts` P2).
- 수동 지정/해제 API 없음. 해제는 댓글이 규칙 위반으로 `isRemoved` 될 때만.
- `GET /api/themes/[slug]/concepts?cursor` → 해당 테마 문서들의 개념글 `conceptAt desc`. 인덱스 `TalkComment @@index([conceptAt])` 추가.
- 알림 `CONCEPT_REACHED` 를 작성자에게. 기여 적립 없음(D1).

**어뷰징**: 지인 5명 추천 → 각 계정 7일 이상 + 가중합 8 (신규 신뢰도 1.0 계정 8명 또는 신뢰 높은 소수 필요). 개념글은 랭킹에 영향이 없어 조작 유인이 낮다.

---

### J. 출처·각주 필드화 (P1, M)

**데이터**
```prisma
model Item {
  sources Json @default("[]") // [{ id: int, title: string, url: string, accessedAt: 'YYYY-MM-DD', quote?: string }]
}
```
- `EDITABLE_FIELDS` 에 `sources` 추가 → 리비전·diff·되돌리기·충돌 병합에 자동 포함(`wiki.ts` 의 필드 목록 기반 설계 덕분).
- 본문 각주 문법: `[^1]` (출처 `id` 참조). 순수 함수 `src/lib/footnotes.ts`:
  - `extractRefs(markdown) → number[]`
  - `validateSources(description, recommendReason, sources) → { errors: ('UNKNOWN_REF'|'DUPLICATE_URL'|'NON_HTTPS'|'BAD_DATE')[], unused: number[] }`
  - 검증 강도: 오류는 400, 미사용 출처는 경고만.
- zod: `sources` 최대 `SOURCE_RULES.MAX_SOURCES = 20`, `title 1~120`, `url` https, `quote ≤ 300`. URL 검사는 `src/lib/content-check.ts` 의 규칙(목록/브랜드 페이지 차단 등)을 재사용할 수 있는지 구현 시 확인.
- 출처 개수는 랭킹에 넣지 않는다(출처 수 부풀리기 유인 방지). 문서 페이지에 "출처 0개" 표시만.

**마이그레이션**: 컬럼 추가(기본값 `[]`, 안전). 기존 `## 출처` 섹션 → `sources` 변환 스크립트 `scripts/migrate-sources.ts --dry`: 섹션을 파싱해 `sources` 로 옮기고 본문에서 섹션 제거, **새 리비전으로 기록**(편집자 = null, 요약 "출처 필드 이전", 원장 기록 없음). 파싱 실패 문서는 목록 출력 후 건너뜀. `import-content.ts` 는 이후 `sources` 필드에 직접 쓰도록 변경.
- BACKLOG 의 `facts:[{sentence, source, quote}]` 전환과 호환: 나중에 facts 의 `source` 가 `sources[].id` 를 참조하면 된다.

---

### K. 분류/태그 (P2, M)

- 상위 분류는 **테마 계층 그대로**. 문서 단위 다중 분류만 태그로.
```prisma
model Tag {
  id        String    @id @default(cuid())
  slug      String    @unique   // normalizeTag 결과
  name      String
  itemCount Int       @default(0)
  items     ItemTag[]
}
model ItemTag {
  itemId String
  tagId  String
  item   Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([itemId, tagId])
  @@index([tagId])
}
model Item { tags Json @default("[]") } // string[] — 진실 원천. ItemTag 는 조회용 파생
```
- `tags` 를 `EDITABLE_FIELDS` 에 추가 → 태그도 편집 이력·되돌리기 대상(분류 반달 복구가 공짜). 편집 트랜잭션에서 `diffTags(before, after)` 로 `ItemTag` 를 동기화하고 `itemCount` 를 실제 count 로 재계산(팔로우 라우트와 같은 드리프트 방지 방식).
- 규칙 `TAG_RULES`: 문서당 최대 10개, 1~20자, `normalizeTag`(NFKC, 공백→하이픈, 소문자). 태그 생성 권한 제한 없음, 사용 문서 0개 태그는 lifecycle cron 이 삭제.
- `GET /api/tags/[slug]/items?tier=&sort=score|new&cursor` (공개), `GET /api/tags?q=` 자동완성(`startsWith`, 대소문자 정규화는 slug 로 해결 — F9 `mode` 미사용).
- 랭킹: 태그별 순위는 **표시용 정렬만**, 스냅샷 대상 아님(스냅샷은 테마×가격대 단일 축 유지).

---

### L. 문서 이동·병합·분할 (P2, L)

| 작업 | 데이터 변화 | 표(Vote) 처리 | 스냅샷 | 승인 |
|---|---|---|---|---|
| 이동(테마 변경) | `Item.themeId` 변경, 새 테마에서 slug 충돌 시 `uniqueSlug`. `ItemAlias(oldThemeId, oldSlug → itemId)` 생성 | 그대로 유지(제품에 대한 표) | 과거 스냅샷은 옛 테마로 보존(역사적 사실) | `EditRequest(kind=MOVE)` 2인 + 72h 공시. 대상 테마는 ACTIVE |
| 가격대 변경 | 이미 일반 편집(`tier`) | 유지 | — | 일반 편집 |
| 병합(중복 문서 A→B) | `A.mergedIntoId = B`, `A.isRemoved` 는 건드리지 않고 목록·랭킹 쿼리에서 `mergedIntoId: null` 조건 추가. `ItemAlias(A.themeId, A.slug → B)` | `planVoteMerge(votesA, votesB)` 순수 함수: B 에 표가 없는 사용자의 A 표만 `itemId` 이전(weight·createdAt **그대로** → 재현성), 양쪽에 표가 있으면 B 표 유지·A 표는 `MergedVote` 보관 | 과거 스냅샷 불변. 병합 후 B 점수 재계산 | `kind=MERGE` 2인(EXTENDED 자격) + 72h 공시 + 같은 테마만 |
| 분할 | 새 문서 생성(`splitFromId`), 원문 일부 이동은 일반 편집 | **이전하지 않음**(투표자 의도 불명) | — | 일반 문서 생성 |
| 병합 취소 | `MergeRecord` 의 이전 표 id 목록으로 되돌림 | 이전한 표만 복귀 | — | 같은 승인 규칙 |

```prisma
model ItemAlias { themeId String; slug String; itemId String; createdAt DateTime @default(now()); @@id([themeId, slug]) }
model MergeRecord { id String @id @default(cuid()); sourceItemId String; targetItemId String; movedVoteIds Json; keptSourceVotes Json; editRequestId String; createdAt DateTime @default(now()) }
model Item { mergedIntoId String?; splitFromId String?; @@index([mergedIntoId]) }
```
- 문서 페이지 조회: `findFirst({themeId, slug})` 실패 → `ItemAlias` 조회 → 308 리다이렉트. `mergedIntoId` 있으면 308.
- **어뷰징(가장 위험)**: 인기 문서 A 를 경쟁 문서 B 에 병합해 표 탈취 → (1) 같은 테마만, (2) EXTENDED 자격 2인, (3) 72h 공시 동안 양 문서 작성자에게 알림 + 최근 변경 노출, (4) 병합 후 B 의 가격대 순위가 바뀌면 그 사실을 `MergeRecord` 에 기록, (5) 병합 취소 가능. 같은 가격대가 아닌 병합은 Q6.
- 마이그레이션: 모델·nullable 필드 추가(안전). 랭킹 쿼리(`rankTier`, 검색, 갤러리)에 `mergedIntoId: null` 조건을 빠짐없이 넣는 것이 주 위험 → `src/lib/item-filters.ts` 에 `VISIBLE_ITEM = { isRemoved: false, mergedIntoId: null }` 상수 하나 두고 전 쿼리가 사용.
- SQLite: 병합 트랜잭션은 표 이전 `updateMany` 1회 + 재계산. 문서당 표 수천 건 이하 가정에서 수백 ms. 그 이상이면 500건 단위 분할.

---

## 3. 철학을 지키는 장치 — 규칙 일람

모든 자동 판정은 **(1) 상수가 코드에 공개, (2) 입력이 저장된 활동 기록뿐, (3) 같은 입력이면 같은 결과**를 만족해야 한다. 운영자가 쓸 수 있는 쓰기 API 는 기존 그대로 "규칙 위반 제재(`suspendedUntil`, `isRemoved`)"뿐이다.

| 기능 | 자동 규칙 | 상수 위치 | 재현 방법 | 운영자 개입 지점 |
|---|---|---|---|---|
| 신뢰도 | 무효 아닌 적립 이벤트 수 → `trustFromContributions` | `src/lib/contribution-rules.ts` `CONTRIBUTION_RULES`, `src/lib/trust.ts` | 원장을 리비전 순으로 재생(`backfill` 스크립트가 곧 검증기) | 없음 |
| 되돌리기 감지 | 해시 일치(최근 10 리비전) | `src/lib/wiki.ts` `REVERT_LOOKBACK_REVISIONS` | `contentHash` 재계산 | 없음 |
| 보호 수준 | 되돌리기 빈도·1위 여부·신고자 수 | `src/lib/protection.ts` `PROTECTION_RULES` | 저장 안 함, 매번 계산 | 없음 |
| 편집 요청 | 자격자 N인 승인, 14일 만료 | `src/lib/edit-request.ts` `EDIT_REQUEST_RULES` | 요청·결정 행 공개 | 없음 |
| 댓글 정렬 | 가중 Wilson 하한 | `src/lib/ranking.ts`(재사용), `src/lib/comments.ts` `COMMENT_RULES` | 고정 가중치로 재계산 | 없음 |
| 개념글 | 3중 임계 + 7일 창 | `src/lib/comments.ts` `CONCEPT_RULES` | `CommentVote` 재생 | 없음(위반 삭제 시 부수 해제만) |
| 알림·주시 | 이벤트 발생 시 자동 | `src/lib/notify.ts` `NOTIFICATION_RULES`, `WATCH_RULES` | — | 없음 |
| 태그 | 정규화·상한 | `src/lib/tags.ts` `TAG_RULES` | 스냅샷 `tags` 가 원천 | 없음 |
| 병합·이동 | 2인 승인 + 72h 공시 + 같은 테마 | `EDIT_REQUEST_RULES` | `MergeRecord` | 없음 |
| 레이트리밋 | 시간당 상한 | `src/lib/abuse.ts` `ABUSE_LIMITS`(신규 키 추가) | — | 없음 |

- **공개**: `/how-ranking-works` 에 위 상수 객체를 import 해 표로 렌더(새 페이지를 만들지 않고 섹션 추가). 문구와 코드가 어긋날 수 없게 하는 기존 방식 유지.
- **임계값 변경 절차**: 상수 변경 = 코드 변경 = 커밋 이력. 환경변수로 노출하는 것은 기존 `THEME_PROMOTION_THRESHOLD` 하나로 유지(규칙이 배포마다 몰래 달라지는 것 방지).
- **가중치 고정 원칙 확장**: `CommentVote.weight` 도 투표 시점 고정. 신뢰도 하락(원장 무효화)은 미래 표에만 영향.

---

## 4. 4주 로드맵 (W43~W46)

규모: S ≤ 1일, M 2~3일, L 4일+. 매일 `npm run typecheck && npm test`. 스키마 변경은 7절 절차.

| 주차 | 묶음 | 규모 | 선행 | 산출 파일(주요) | 테스트 전략(순수 함수 → 라우트 mock) |
|---|---|---|---|---|---|
| **W43** | A. 리비전 해시·되돌리기 API·리비전 비교 | S | — | `wiki.ts`(canonicalJson, snapshotHash, diffStats), `api/items/[id]/revert/route.ts`, `api/items/[id]/revisions/compare/route.ts` | `tests/wiki.test.ts`: 키 순서 무관 동일 해시, 필드 변경 시 해시 변화, diffStats. 라우트: 409(base 불일치), 400(동일) |
| W43 | B. ContributionEvent + 적립/무효화 규칙 + `recomputeTrust` + 백필 | M | A | `contribution-rules.ts`(신규, 순수), `contribution.ts`, 백필 스크립트, 생성·편집 라우트 교체 | `tests/contribution-rules.test.ts`: 19자 미적립/20자 적립, tier 변경은 크기 무관, 일 2건 상한 경계, 되돌리기 미적립, 무효화→재되돌리기 복원 시퀀스(리비전 배열 입력 → 이벤트 상태 출력) |
| W43 | C. `GET /api/changes` | S | A, B | `api/changes/route.ts`, `cursor.ts` | `tests/cursor.test.ts`: 왕복, 위조 커서 400. kind 매핑 순수 함수 |
| **W44** | D. 보호 수준 | S | A, B | `protection.ts`, edit/revert 라우트 분기 | `tests/protection.test.ts`: 되돌리기 2/3/5/6 경계, 4일 경계(`<`/`>=`), Top1, 신고자 수 |
| W44 | E. 편집 요청(EDIT 만) + `applyEdit` 추출 | M | D | `edit-request.ts`, `api/items/[id]/edit-requests`, `api/edit-requests/[id]/*` | 순수: 검토 자격, 본인 승인 금지, 만료 판정. 라우트: 승인 시 원장이 요청자에게, 충돌 시 SUPERSEDED |
| W44 | F. 주시목록(pull) | S | C | `api/items/[id]/watch`, `api/me/watchlist`, 자동 주시 훅 | 라우트 mock: 토글, 상한 429 |
| **W45** | G. 알림(5종) | M | B, E | `notify.ts`, `api/notifications/*`, 각 라우트 트랜잭션에 삽입 | 순수: `notificationsFor(event)` → 행 목록(본인 행위 제외, 중복 키) |
| W45 | H. 댓글 투표·트리 정렬·말머리 | M | — | `comments.ts`, `api/talk/[id]/vote`, talk 라우트 확장 | `tests/comments.test.ts`: 트리 구성(고아·깊이 8 평탄화·삭제 자리표시), best/new/old 결정적 동률 |
| W45 | I. 개념글 | S | H | `comments.ts`(isConcept), `api/themes/[slug]/concepts` | 경계값: 가중 7.99/8.0, 추천자 4/5, 7일 창 밖 표 제외, 신규 계정 표 제외 |
| **W46** | J. 출처 필드 + 각주 검증 + 이전 스크립트 | M | A(이력 기록) | `footnotes.ts`, edit/create 스키마, `scripts/migrate-sources.ts` | `tests/footnotes.test.ts`: 미정의 참조, 중복 URL, http 거부. 스크립트 `--dry` 출력 스냅샷 |
| W46 | K. 태그 | M | J 와 같은 `EDITABLE_FIELDS` 변경 동반 | `tags.ts`, 태그 API | normalizeTag(NFKC·공백·대소문자), diffTags |
| W46 | (여유) 2절 F7·F8 별건 수정, 문서 갱신 | S | — | vote 라우트 | 기존 테스트 |
| 이후 | L. 이동·병합·분할 | L | E, G | `merge.ts`(planVoteMerge), alias 조회 | `planVoteMerge`: 양쪽 투표자, 한쪽만, 가중치·시각 보존 |

- 원칙: **DB 를 건드리는 코드는 얇게, 판정은 순수 함수로.** 라우트 테스트는 핵심 분기(401/403/409/성공)만 `vi.mock('@/lib/db')` 로.
- W43 의 B 는 모든 후속 기능이 원장 함수를 호출하므로 반드시 먼저 끝낸다.

---

## 5. 성능·용량 메모

| 경로 | 추가 쿼리 | 인덱스 | 캐시 |
|---|---|---|---|
| 편집 저장 | +4(해시 조회, 원장 insert, 원장 count, 보호 판정 3 count 중 일부) | `EditHistory(itemId, contentHash)`, `ContributionEvent(userId, createdAt)` | 없음 |
| 최근 변경 | 1~2 | `EditHistory(createdAt, id)` | 없음(동적) |
| 주시목록 | 1 | `Watch(itemId)` + `EditHistory(itemId, createdAt)` | 없음 |
| 댓글 트리 | 1(≤500행) | `TalkComment(itemId, createdAt)` 기존 | 없음 |
| 알림 카운트 | 1 | `Notification(userId, readAt, createdAt)` | 없음 |
| 스냅샷 배치 | 변화 없음 | — | `rankTier` 에 `mergedIntoId: null` 조건만 추가 |

- 스냅샷 배치(`generateSnapshots`)는 테마×3가격대 순차 실행. 이 문서의 기능은 배치 비용을 늘리지 않는다. 다만 병합(L) 이후 재실행은 과거 기간 결과를 바꿀 수 있다(표의 `itemId` 가 바뀌므로) → **과거 기간 스냅샷 재생성 금지**를 `scripts/snapshot.ts` 에 가드로 추가(`periodKey < 현재 기간`이고 이미 행이 있으면 `--force` 필요).

---

## 6. 어뷰징 시나리오 종합

| 시나리오 | 대응 장치 | 남는 위험 |
|---|---|---|
| 사소한 편집 반복으로 신뢰도 상승 | B 최소 변경량·문서당 일 상한, 피드에 미적립 표시 | 의미 있어 보이는 무의미 편집 → 되돌리기로 무효화 |
| 다계정 상호 편집/승인 | 원장 무효화, 검토자 자격, 신규 7일 가중치 0.25(기존) | 장기 숙성 계정 군단 — Q4 |
| 경쟁 제품 문서 반달 | 되돌리기 → 원장 무효화, 3회 이상이면 SEMI 자동 보호 | 보호 창(48h) 경과 후 재발 → 창이 다시 차면 재보호 |
| 보호 악용(일부러 분쟁 유발해 잠금) | 편집 요청 경로 상시 개방, 분쟁 당사자도 동일 제한 | 편집 지연 |
| 개념글 조작 | 3중 조건, 신규 계정 표 제외, 랭킹 무영향 | 낮음 |
| 병합으로 표 탈취 | 같은 테마·2인 EXTENDED·72h 공시·취소 가능·과거 스냅샷 불변 | 승인자 담합 — 승인자 공개로 사후 추적 |
| 자동 신고 폭주 | (대상, 사유) OPEN 1건 규칙 | — |

---

## 7. 마이그레이션 위험과 절차 (`prisma db push`, SQLite 단일 writer)

| 변경 유형 | 이 문서의 해당 항목 | SQLite 에서의 동작 **(Prisma 일반 지식 기준)** | 위험 |
|---|---|---|---|
| 새 모델 추가 | ContributionEvent, Watch, Notification, EditRequest, CommentVote, Tag, ItemTag, ItemAlias, MergeRecord | `CREATE TABLE` | 낮음 |
| nullable 컬럼 / 기본값 있는 컬럼 추가 | contentHash, revertOfRevision, sources, tags, upCount… | 대개 `ALTER TABLE ADD COLUMN`. 단 관계·제약 변경이 섞이면 Prisma 가 **테이블 재생성(복사)** 으로 처리 | 중간(대형 테이블 잠금) |
| enum 추가/값 추가 | ContributionKind, TalkTag … | SQLite 는 TEXT 로 저장 | 낮음 |
| 인덱스 추가 | 다수 | `CREATE INDEX` | 낮음(생성 중 쓰기 잠금) |
| 필수 컬럼 추가(기본값 없음)·컬럼 이름 변경 | **이 문서에는 없음** | 데이터 손실 경고 | 높음 — 금지 |

**절차(모든 스키마 묶음 공통)**
1. 적용 전 `cp dev.db dev.db.bak-<날짜>` (NAS 는 볼륨 스냅샷).
2. `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` 로 실제 SQL 을 확인하고, `DROP`/테이블 재생성 문이 있으면 리뷰 문서에 기록.
3. `docker-compose.yml` 의 `--accept-data-loss` 는 **제거 권고**(F10). 파괴적 변경이면 기동이 실패해야 맞다(Q1).
4. 백필·이전 스크립트는 `--dry` 필수, 500행 단위 트랜잭션으로 쪼개 단일 writer 잠금 시간을 짧게, 멱등(유니크 키) 보장.
5. 동시성: 신규 쓰기 경로는 모두 짧은 `$transaction`. SQLite WAL·`busy_timeout` 설정 여부를 W43 시작 시 확인(미설정이면 `PRAGMA journal_mode=WAL` 을 기동 시 1회 실행하는 것을 별건으로 제안).

---

## 8. 열린 질문 (추천안 포함)

| # | 질문 | 추천 |
|---|---|---|
| Q1 | DB 는 SQLite 인가 PostgreSQL 인가? 스키마는 sqlite, NAS compose 는 postgres + `--accept-data-loss` (F10) | **운영 DB 를 하나로 확정**하고 그 전까지 이 로드맵의 스키마 작업은 SQLite 기준. `--accept-data-loss` 는 어느 쪽이든 제거. F9(`mode`)도 이 결정에 따라 수정 |
| Q2 | 원장 도입 시 기존 사용자의 `contributionCount` 가 줄어들 수 있다(되돌려진 편집·사소한 편집 소급 적용). 소급할까? | **적립 규칙(최소 변경량·일 상한)은 소급하지 않고, 무효화(되돌려짐)만 소급**. 백필 dry-run 차이를 공개한 뒤 적용. 과거 `Vote.weight` 는 불변이라 랭킹 영향 없음 |
| Q3 | 편집 요청 승인·리뷰 행위를 기여로 인정할까? | **인정하지 않는다(v1).** 승인 농사·담합 유인이 크다. 검토 참여가 부족하면 그때 "승인한 편집이 30일간 되돌려지지 않으면 0.5건" 같은 지연 적립을 검토 |
| Q4 | 숙성된 다계정 군단(30일+, 25기여)은 무엇으로 막나? | v1 은 **사후 탐지만**: 같은 사용자 쌍의 상호 승인·상호 추천 비율을 주간 배치로 계산해 `Report(AUTOMATED_COLLUSION)` 적재(판정은 규칙 위반 심사로만). 자동 제재는 하지 않는다 |
| Q5 | 시드·`content:import` 로 만든 문서 이력은 원장에서 누구의 기여인가? | `editorId` 가 null 이거나 시드 계정이면 **원장 기록 없음**. 콘텐츠 에이전트 계정은 기여 대상에서 제외(운영 측 콘텐츠가 투표 가중치를 갖지 않도록) |
| Q6 | 다른 가격대 문서끼리의 병합을 허용할까? | **불허.** 가격대가 다르면 다른 제품일 가능성이 높고, 표 이전이 두 순위를 동시에 흔든다. 먼저 `tier` 편집으로 맞춘 뒤 병합 |
| Q7 | 갤러리 단위 자유 글(Q&A, BACKLOG)은 `TalkComment` 확장인가 새 모델인가? | **새 모델 `GalleryPost`(themeId, tag, title, body)** 를 W47 이후. `TalkComment.itemId` 를 nullable 로 바꾸는 것은 SQLite 테이블 재생성을 부르고 문서 토론과 의미가 섞인다. 댓글·투표·개념글 로직(`comments.ts`)은 대상 타입만 바꿔 재사용 |
