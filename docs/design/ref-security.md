# 설계서: 보안·어뷰징·법적 대응 (ref-security)
- 작성: Claude (코드 정적 읽기, 2026-10-11). 서버 실행·네트워크 요청 없이 판단했다. 실행으로 확인하지 않은 동작은 **"추정"** 또는 **"미확인"** 으로 적는다.
- 기준 커밋: `c0f4972` (브랜치 `claude/peaceful-pasteur-abbqgx`).
- 레퍼런스(Wikipedia·나무위키·Reddit·디시인사이드) 운영 사례와 한국 법령 내용은 웹으로 확인하지 않았다. 모두 **"일반 지식 기준"** 이다. 법률 문구는 시행 전에 원문 확인이 필요하다.
- 확인한 것 중 개발 실행으로 검증한 것은 하나뿐이다. `node` 에서 설치된 zod 4.6.5 의 `z.string().url()` 에 넣어 봤더니 `javascript:alert(1)`, `data:text/html,…`, `file:///etc/passwd`, `http://169.254.169.254/` 를 **모두 통과시켰다**.

---

## 0. 요약: 지금 바로 위험한 것 5개
| # | 심각도 | 요지 | 근거 |
|---|---|---|---|
| 1 | **높음** | 신뢰도 파밍. 문서 생성에는 레이트 리밋이 없고 기여 1건마다 신뢰도가 오른다. 기여 약 100건이면 가중치 상한 3.0에 닿는다. 계정 하나가 몇 분 만에 최대 가중치를 얻고, 7일 감쇠가 끝나면 표 1개가 신규 계정 12개 몫이 된다 | `api/items/route.ts:29-35`, `contribution.ts:8-25`, `trust.ts:52-55` |
| 2 | **높음** | NAS 배포 설정이 서로 맞지 않고 위험하다. 스키마는 `sqlite` 인데 compose 는 Postgres URL을 넣는다(migrate 실패 추정). Postgres 5432 포트가 기본 비밀번호 `lifipedia` 로 바깥에 열려 있다. `CRON_SECRET` 기본값은 `change-me` 다. 기동할 때마다 `db push --accept-data-loss` 가 돈다 | `schema.prisma:9`, `docker-compose.yml:9,19-20,30,45` |
| 3 | **높음** | 로컬 `prisma/dev.db` 가 Docker 이미지에 들어간다. `.dockerignore` 에 `*.db` 가 없어서 `COPY . .` 와 `COPY prisma` 를 거쳐 실려 나간다. 로컬 로그인 계정의 이메일과 OAuth 토큰이 포함될 수 있다 | `.dockerignore:1-12`, `Dockerfile:18,43` |
| 4 | 중간 | 구매 링크와 이미지 URL의 스킴을 검증하지 않는다. `javascript:` 링크는 React 19 가 막지만 `data:`·`http:` 링크와 임의 호스트 추적 픽셀은 통과한다. 아무 계정이나 남의 문서 구매 링크를 자기 제휴 링크로 바꿀 수 있다(편집 권한 제한 없음) | `api/items/route.ts:13,23`, `edit/route.ts:22-23`, `item/[itemSlug]/page.tsx:105,131` |
| 5 | 중간 | 신고를 받기만 하고 처리하는 경로가 코드에 없다. `suspendedUntil`·`isRemoved`·`Report.status` 를 바꾸는 코드가 하나도 없다. 그래서 제재는 DB 를 손으로 고치는 수밖에 없고, 감사 로그와 이의 제기도 없다. 운영자 재량 개입을 막는다는 철학과 정면으로 충돌한다 | `grep` 결과: `api/reports/route.ts` 는 생성만 한다. 스키마에 AuditLog 가 없다 |

---

## 1. 위협 모델

### 1.1 자산
| 자산 | 무엇이 깨지면 안 되나 | 저장 위치 |
|---|---|---|
| 랭킹 무결성 | 점수, Top1, 월간·연간 스냅샷("영구 보존") | `Vote.weight`, `Item.score`, `RankingSnapshot` |
| 계정 | 세션 탈취, 다른 사람으로 행동하기, 신뢰도 부풀리기 | `Session`, `Account`(OAuth 토큰), `User.trustScore` |
| 콘텐츠 신뢰 | 문서 본문, 가격대(tier), 구매 링크, 이미지 | `Item`, `EditHistory` |
| 개인정보 | 이메일, OAuth 실명과 아바타, 활동 이력 | `User`, `Account` |
| 가용성 | NAS 1대, SQLite 파일 1개 | 컨테이너, `dev.db` |

### 1.2 공격자별 현재 방어와 구멍
| 공격자 | 현재 방어 (파일:줄) | 구멍 |
|---|---|---|
| **조작 투표 다계정** | 1인 1표 unique(`schema.prisma:250`). 신규 7일 ×0.25(`trust.ts:69-70`, `ranking.ts:28-30`). 가중치 상한 3.0(`ranking.ts:26`). Wilson 하한과 참여 보정(`ranking.ts:69-103`). 최소 참여 5명(`ranking.ts:24`). 시간당 40표(`abuse.ts:7`, `vote/route.ts:35-37`). 5분 10표 버스트 플래그(`vote/route.ts:66-79`) | ① 신뢰도 파밍(요약 #1). ② 소셜 로그인만 있으면 계정을 무제한 만들 수 있다. 계정 비용은 Google/GitHub 계정 1개다. ③ 버스트 플래그는 Report 를 쌓기만 하고 읽는 곳이 없다. ④ 투표 취소 후 재투표는 행이 지워져 시간당 카운트를 우회한다(2.3 참고). ⑤ 투표자 간 상관(같은 시각, 같은 항목 집합)은 탐지하지 않는다 |
| **광고·스팸 편집** | 로그인 필수. 편집 시간당 20회(`abuse.ts:9`). 링크에 `rel="nofollow sponsored"`(`page.tsx:133`) | 문서 **생성** 레이트 리밋 없음(`items/route.ts`). 토론 댓글 레이트 리밋 없음(`talk/route.ts`). 링크 도메인 제한 없음. 신규 계정도 링크와 이미지를 바로 넣을 수 있다 |
| **악의적 편집 전쟁** | 필드 단위 병합과 충돌 409(`wiki.ts:63-88`). 전체 이력과 diff 공개(`history/page.tsx:60-62`) | 되돌리기 API, 문서 보호 수준, 쿨다운, 3RR 류 규칙이 없다. `tier` 를 편집으로 바꿀 때 가격대 검증을 하지 않는다(생성 때만 `items/route.ts:52-58`). 경쟁 제품을 다른 가격대로 옮겨 순위에서 빼낼 수 있다 |
| **악성 링크·XSS 주입** | 본문은 마크다운으로 **렌더하지 않는다**. React 텍스트 노드라 자동 이스케이프된다(`page.tsx:110-121`, `WikiLink.tsx:21-50`). 위키링크는 `slugify` 를 거쳐 내부 경로로만 간다(`slug.ts:12`). React 19 는 `javascript:` href 를 차단한다(`react-dom-server…production.js` 에 차단 문자열 있음) | URL 스킴 화이트리스트가 없다(요약 #4). CSP 가 없어 나중에 마크다운 렌더러를 붙이는 순간 방어선이 0이 된다 |
| **계정 탈취** | OAuth 만 쓰고 비밀번호가 없다. DB 세션(`auth.ts:27`). 이메일 자동 연결(`allowDangerousEmailAccountLinking`)을 켜지 않았다 | LAN 배포 기본값이 `http://` 라 쿠키에 Secure 가 안 붙는다(추정, `.env.docker.example:9`). 보안 헤더 없음. 세션 목록과 강제 로그아웃 UI 없음 |
| **스크래퍼** | robots 에서 `/api/` 차단(`robots.ts:6`) | 비로그인 `/api/search` 와 `/api/themes` 에 레이트 리밋이 없다. `description` 20,000자에 대한 `contains` 풀스캔이라 DoS 증폭 지점이다. 콘텐츠 자체는 공개라 막을 이유가 약하다. 목표는 **가용성 보호**로 한정한다 |
| **괴롭힘** | 프로필 이름과 소개의 숨김·방향 제어 문자 거부(`me.ts:3-26`). 신고 버튼(`ReportButton.tsx`) | 신고 처리 경로가 없다(요약 #5). 댓글 삭제 API 가 없다(`isRemoved` 표시만 있다, `talk/page.tsx:49`). 차단(block) 기능이 없다. 문서 이름·요약·테마명에는 숨김 문자 검사가 없다 |

---

## 2. 현재 코드 감사 결과
형식: `심각도 | 파일:줄 | 문제 | 재현 | 제안`. 재현은 코드를 읽고 추론한 것이고 실행하지 않았다.

### 2.1 인증·인가
| 심각도 | 파일:줄 | 문제 | 재현 | 제안 |
|---|---|---|---|---|
| 낮음 | `api/reports/route.ts:18-19` | 정지된 사용자도 신고할 수 있다. 다른 쓰기 라우트는 모두 `isSuspended` 를 검사한다 | 정지 계정으로 `POST /api/reports` 를 보내면 201 | `isSuspended` 검사를 추가한다 |
| 낮음 | `api/reports/route.ts:10` | `targetId` 가 존재하는지 확인하지 않는다 | `{"targetType":"ITEM","targetId":"x"}` 를 보내면 201 | 대상 존재 확인, 또는 cuid 형식 검증 |
| 정보 | `api/me/route.ts:12-24` | IDOR 없음. 대상 id 를 세션에서만 얻는다. `strictObject` 로 대량 할당을 막는다(`me.ts:9-10`) | — | 유지 |
| 정보 | `edit/route.ts:79-81` | 대량 할당 없음. `toSnapshot` 이 `EDITABLE_FIELDS` 만 남긴다(`wiki.ts:7-25`) | — | 유지 |
| 중간 | 전체 | 관리자·모더레이터 역할 모델이 없다. 그래서 제재 API 도 없다(요약 #5) | — | 3.4절의 규칙 기반 자동 제재와 AuditLog |

### 2.2 입력 검증
| 심각도 | 파일:줄 | 문제 | 재현 | 제안 |
|---|---|---|---|---|
| **중간** | `items/route.ts:13,23`, `edit/route.ts:22-23` | `z.string().url()` 이 모든 스킴을 허용한다(zod 4.6.5 로 실측) | `purchaseLinks:[{"label":"a","url":"data:text/html,<script>…"}]` | `safeUrl = z.url({ protocol: /^https$/ })` 를 `src/lib/` 에 하나 두고 두 라우트가 같이 쓴다. 길이 상한 2,048 |
| 중간 | `edit/route.ts:17` | 편집에서 `tier` 를 바꿀 때 가격대 검증(`validateTierAgainstPeers`)을 하지 않는다 | `priceKrw` 500,000 인 제품을 `BUDGET` 으로 편집하면 통과 | 생성과 같은 검증과 `confirmTier` 흐름을 적용한다. tier 변경은 3.2절 보호 대상 필드로 둔다 |
| 낮음 | `items/route.ts:17`, `themes/route.ts:45`, `edit/route.ts:15` | 이름·테마명·편집 요약에 숨김·방향 제어 문자 검사가 없다(프로필에만 있다) | 이름에 `‮` 를 넣으면 표시 방향 스푸핑 | `me.ts` 의 `HIDDEN` 을 export 해서 재사용한다 |
| 낮음 | `cron/snapshot/route.ts:11` | MONTHLY 에 `periodKey=2026` 처럼 연 키를 넣으면 `monthRange` 가 NaN 날짜를 만든다(추정) | `?periodType=MONTHLY&periodKey=2026` | periodType 별로 regex 를 나눈다 |
| 낮음 | `vote/route.ts:47-48`, `items/route.ts:60-63` | 동시 요청 경합에서 unique 위반(P2002)이 나면 500 이 된다 | 같은 표를 두 번 동시에 보내기 | P2002 를 409 로 매핑한다(`api.ts:12`) |

### 2.3 레이트 리밋 커버리지
| 엔드포인트 | 리밋 | 판정 |
|---|---|---|
| `POST /api/items/[id]/vote` | 40/h (`vote/route.ts:35`) | **우회 가능**. 카운트는 `Vote.createdAt` 행 기준인데, 같은 방향을 다시 누르면 행을 삭제한다(`:52`). 생성과 삭제를 반복하면 카운트가 늘지 않는다. 요청마다 `recomputeItemScore` 가 그 항목의 표 전체를 다시 읽는다(`scoring-service.ts:6`). 재투표는 `createdAt` 도 새로 받으므로 시간 감쇠도 초기화된다 |
| `POST /api/items/[id]/edit` | 20/h | 있음. 다만 이 리밋 안에서도 기여 파밍이 가능하다(5시간이면 100건) |
| `POST /api/items` | **없음** | **높음**: 스팸과 신뢰도 파밍 |
| `POST /api/items/[id]/talk` | **없음** | 중간: 스팸 |
| `POST /api/themes/[slug]/follow` | **없음** | 중간: 토글을 반복하면 트랜잭션이 계속 쓰인다. 다계정 20개면 테마 승격(`theme-lifecycle.ts:12`) |
| `POST /api/reports` | **없음** | 중간: 신고 폭탄. 버스트 플래그도 임계 초과 후 **표마다** Report 를 1건씩 만든다(`vote/route.ts:70-78`) |
| `POST /api/themes` | 3/일 | 있음(`abuse.ts:10` 주석의 "시간당"은 오기) |
| `GET /api/search`, `/api/themes` | 없음 | 중간: 비로그인 풀스캔 |

**제안**: 쓰기 라우트 전체에 `checkRate` 를 적용한다(`abuse.ts` 를 재사용하고 새 라이브러리는 쓰지 않는다). 투표 리밋은 Vote 행이 아니라 **투표 행위 로그**(3.5절 `ActionLog`, 또는 AuditLog 의 VOTE 이벤트)로 센다. 비로그인 GET 은 리버스 프록시(시놀로지 nginx)의 `limit_req` 로 처리한다. IP 를 앱에 저장하지 않으려는 것이 목적이다.

### 2.4 XSS·SSRF·오픈 리다이렉트·CSRF
| 심각도 | 파일:줄 | 문제 | 재현 | 제안 |
|---|---|---|---|---|
| 중간 | `page.tsx:131-133` | 구매 링크 href 에 사용자 URL 이 그대로 들어간다. React 19 가 `javascript:` 는 막지만 `data:`·`http:`·피싱 도메인은 통과한다 | 2.2 의 첫 행 | https 만 허용 + 도메인 정책(3.3절) |
| 중간 | `page.tsx:105`, `:41` | 사용자 `imageUrl` 을 `unoptimized` 로 직접 로드하고 OG 이미지로도 쓴다. 이미지 호스트가 열람자의 IP·UA 를 수집할 수 있고(추적 픽셀), `http:` 이미지는 혼합 콘텐츠가 된다 | `imageUrl: "https://attacker/p.gif"` | https 만 허용. 중기적으로는 이미지 호스트 허용 목록이나 업로드 후 자체 호스팅 |
| 중간 | `next.config.mjs:11` | `remotePatterns: https '**'` 때문에 `/_next/image?url=https://아무호스트/…` 로 서버가 임의의 https 를 가져온다. 열린 이미지 프록시이고 NAS 내부망을 향한 블라인드 SSRF 가능성이 있다. 사설 IP 차단 여부는 Next 15.5 기준 **미확인** | `GET /_next/image?url=https://192.168.0.1/x.png&w=64&q=75` | 현재 `<Image>` 는 전부 `unoptimized` 라 최적화기가 필요 없다. 패턴을 **삭제**하거나 허용 호스트만 남긴다 |
| 정보 | `WikiLink.tsx:21-46`, `MarkdownEditor.tsx:200-202` | 위키링크와 "마크다운"은 텍스트 분할 + `<Link href=/gallery/${slugify}>` 뿐이고 HTML 로 렌더하지 않는다. `slugify` 가 `/` 와 `.` 를 지우므로 경로 탈출도 없다 | — | **앞으로** 마크다운 렌더러를 넣을 때: `rehype-raw` 금지, 링크와 이미지에 `urlTransform` 으로 https 화이트리스트 적용, CSP 를 먼저 배포 |
| 정보 | `me.ts:46-49`, `signin/page.tsx:12` | 오픈 리다이렉트 방어 있음. `//` 와 `\` 를 거부한다. `/%09/evil` 같은 탭 우회는 next-auth v4 기본 `redirect` 콜백이 상대경로 앞에 baseUrl 을 붙이므로 무해하다(일반 지식 기준, 라이브러리 소스 미확인) | — | 유지. 커스텀 `redirect` 콜백을 만들 일이 생기면 같은 함수를 쓴다 |
| 낮음 | 전체 POST/PATCH | CSRF: Origin 검사가 없다. next-auth 세션 쿠키 `SameSite=Lax` 에만 의존한다(일반 지식 기준). `request.json()` 이 Content-Type 을 보지 않아 `text/plain` 폼으로 JSON 본문을 만들 수 있다. 같은 사이트(형제 서브도메인, 예: NAS 리버스 프록시 아래 다른 서비스)에서는 Lax 쿠키가 전송된다 | 형제 서브도메인 페이지의 `<form enctype=text/plain method=post action=/api/items/x/vote>` | `src/lib/api.ts` 에 `sameOrigin(request)` 를 두고 `Origin` 헤더 호스트가 `NEXTAUTH_URL` 호스트와 같은지 확인한다. 쓰기 라우트 7개에서 호출하고 `application/json` 을 강제한다 |
| 정보 | `history/page.tsx:60-62` | diff 를 `<pre>{…}</pre>` 텍스트로 출력한다. 안전하다 | — | 유지 |

### 2.5 보안 헤더 (`next.config.mjs`)
`headers()` 설정도 `middleware.ts` 도 **없다**. 그래서 아래 헤더가 전부 빠져 있다.

| 헤더 | 위험 | 권장값 |
|---|---|---|
| `X-Frame-Options` / CSP `frame-ancestors` | 클릭재킹으로 투표·팔로우 버튼을 누르게 할 수 있다 | `DENY` / `frame-ancestors 'none'` |
| `Content-Security-Policy` | 나중에 생길 XSS 를 막는 2차 방어가 없다 | 1단계 `default-src 'self'; img-src 'self' https: data:; object-src 'none'; base-uri 'self'; form-action 'self'`. 스크립트 nonce 는 광고 스크립트(`AdSlot.tsx`)를 붙일 때 결정한다 |
| `Strict-Transport-Security` | HTTPS 로 옮긴 뒤 다운그레이드 | 리버스 프록시에서 HTTPS 를 쓸 때만 `max-age=31536000` |
| `Referrer-Policy` | 외부 구매 링크로 경로가 샌다(`noreferrer` 가 이미 있어 영향은 작다) | `strict-origin-when-cross-origin` |
| `X-Content-Type-Options` | MIME 스니핑 | `nosniff` |
| `Permissions-Policy` | — | `camera=(), microphone=(), geolocation=()` |
| `X-Powered-By` | 버전 노출 | `poweredByHeader: false` |

### 2.6 비밀 관리·로그
| 심각도 | 파일:줄 | 문제 | 제안 |
|---|---|---|---|
| **높음** | `docker-compose.yml:45` | `CRON_SECRET` 기본값이 `change-me` 다. 바꾸지 않으면 누구나 스냅샷과 생애주기 배치를 실행할 수 있다. 스냅샷은 `upsert` 로 **과거 기간을 덮어쓴다**(`snapshot.ts:80-104`) | `${CRON_SECRET:?…}` 로 필수화한다. 앱 기동 시 `change-me` 거나 32자 미만이면 cron 라우트를 비활성화한다 |
| 중간 | `.env.docker.example:13`, `docker-compose.yml:44` | `NEXTAUTH_SECRET` 은 `:?` 로 빈 값만 막는다. 예시값 `change-me` 는 통과한다 | 같은 길이·기본값 검사 |
| 낮음 | `api.ts:25` | 토큰을 `===` 로 비교한다(타이밍 차이) | `crypto.timingSafeEqual`. 위험은 낮지만 한 줄이다 |
| 낮음 | `api.ts:16` | `console.error(error)` 가 Prisma 에러 전체를 남긴다. 쿼리 인자가 포함될 수 있다(미확인) | 에러 코드와 메시지만 남긴다. 사용자 본문과 이메일은 로그에 쓰지 않는다 |
| 중간 | `schema.prisma:55-72` | `Account` 에 OAuth `access_token`·`refresh_token`·`id_token` 이 평문으로 저장된다. 앱은 이 토큰을 쓰지 않는다 | 로그인 후 토큰 컬럼을 null 로 지우는 `events.linkAccount`/`signIn` 훅을 두거나 어댑터를 래핑한다(3.6절) |
| 정보 | `.gitignore:5-6,11` | `.env` 와 `*.db` 는 git 에서 제외되어 있다 | 유지. `.dockerignore` 에도 같은 항목을 둔다(2.7절) |

### 2.7 Docker·배포
| 심각도 | 파일:줄 | 문제 | 제안 |
|---|---|---|---|
| **높음** | `schema.prisma:9` ↔ `docker-compose.yml:4-33`, `DEPLOY_NAS.md:4` | 커밋 `2381803` 에서 스키마가 `sqlite` 로 바뀌었다. compose·Dockerfile(`:20`)·.env 예시는 아직 Postgres 를 쓴다. Prisma 는 sqlite provider 에 `postgresql://` URL 을 거부하므로 `migrate` 가 실패하고 `app` 이 뜨지 않을 것으로 **추정**한다. `AGENT_HANDOVER.md:12` 는 "로컬은 SQLite, NAS는 Postgres" 라고 하지만 provider 는 하나뿐이다 | **결정 필요(7절 Q1)**. SQLite 로 간다면 Postgres 서비스를 지우고 `DATABASE_URL=file:/data/lifipedia.db`, `/data` 볼륨 소유자를 uid 1001 로 둔다 |
| **높음** | `docker-compose.yml:9,19-20` | Postgres 기본 비밀번호 `lifipedia` 에 `5432:5432` 가 모든 인터페이스로 열려 있다 | 포트 매핑 삭제(앱은 내부 네트워크로 붙는다). 비밀번호 `:?` 필수 |
| **높음** | `docker-compose.yml:30` | 기동할 때마다 `prisma db push --accept-data-loss` 가 돈다. 스키마에서 컬럼을 빼거나 바꾸면 운영 데이터가 **경고 없이 삭제**된다 | `prisma migrate dev` 로 `prisma/migrations/` 를 커밋하고 기동 시에는 `prisma migrate deploy` 만 실행한다. 그 전에 3.7절 백업을 자동으로 돌린다 |
| **높음** | `.dockerignore`, `Dockerfile:18,43` | `prisma/dev.db` 가 이미지에 들어간다(요약 #3) | `.dockerignore` 에 `*.db`, `*.db-journal`, `.env*`(예시 파일만 `!` 로 예외), `docs/`, `.planning/`, `scripts/__pycache__` 추가 |
| 정보 | `Dockerfile:35-36,45` | 런타임은 non-root(`nextjs:1001`)로 돈다. 좋다 | 유지. `migrate`·`seed` 서비스는 builder 스테이지를 root 로 실행하지만 일회성이라 낮음 |
| 중간 | `.env.docker.example:9`, `DEPLOY_NAS.md:36,146-150` | 기본 안내가 `http://<IP>:3000` 이다. OAuth 와 세션 쿠키가 평문 HTTP 로 오간다 | 외부 공개는 리버스 프록시 HTTPS 만 쓴다고 명시한다. LAN 테스트 외에는 `http` 를 금지한다 |
| 낮음 | `Dockerfile:4` | 베이스 이미지 태그가 고정되지 않았다(`node:22-alpine`) | 다이제스트로 고정하고 월 1회 갱신한다 |

### 2.8 기능 버그지만 가용성에 영향
| 심각도 | 파일:줄 | 문제 | 제안 |
|---|---|---|---|
| 중간 | `api/search/route.ts:16`, `api/themes/route.ts:25`, `search/page.tsx:18` | SQLite provider 는 `mode: 'insensitive'` 를 지원하지 않는다. 런타임에 Prisma 검증 오류로 500 이 날 것으로 **추정**한다(미실행) | `mode` 를 제거한다. SQLite `LIKE` 는 ASCII 만 대소문자를 무시하고 한글에는 대소문자가 없다 |

### 2.9 SQLite 백업·복구
코드와 문서에 백업 절차가 **없다**. `DEPLOY_NAS.md:100` 은 `down -v` 로 데이터가 삭제된다고만 안내한다.

| 항목 | 제안 |
|---|---|
| 방식 | 매일 `sqlite3 /data/lifipedia.db ".backup /backup/lifipedia-$(date +%F).db"`. 온라인 백업 API 라 쓰기 중에도 일관된 사본이 나온다. 파일 `cp` 는 WAL 때문에 깨질 수 있다(일반 지식 기준) |
| 보관 | 일 7개, 주 4개, 월 6개. 하이퍼 백업이나 오프사이트 1벌. **백업에는 이메일이 들어 있으므로** 접근 권한을 NAS 관리자로 제한한다 |
| 검증 | 주 1회 `PRAGMA integrity_check` 와 행 수 비교 스크립트 |
| 복구 리허설 | 분기 1회 빈 컨테이너에 복원해서 `/` 와 `/api/themes` 가 200 인지 확인 |
| 마이그레이션 전 | 3.7절대로 `migrate deploy` 앞에 백업을 강제한다 |

---

## 3. 어뷰징 방어 설계
원칙은 세 가지다. ① **IP·기기 지문을 수집하지 않는다.** ② 판단은 **공개된 규칙**만 한다. ③ 운영자는 규칙(상수)을 바꿀 수 있지만 개별 항목과 개별 사용자의 점수는 바꿀 수 없다. 규칙 상수는 `ranking.ts`·`abuse.ts` 처럼 코드에 공개하고, 바꿀 때는 커밋 이력이 곧 공지가 된다.

### 3.1 다계정 투표 조작
| 방어 | 내용 | 레퍼런스 대응 (일반 지식 기준) |
|---|---|---|
| **신뢰도를 "기여 수"에서 "살아남은 기여"로 바꾼다** | `contributionCount` 증가 조건: 편집이 **N일(예: 7일) 동안 되돌려지지 않았을 때** 확정한다. 문서 생성은 그 문서가 **서로 다른 투표자 5명 이상**(`MIN_DISTINCT_VOTERS`)에게 순찬성일 때 확정한다. 확정은 cron 이 한다. 운영자는 개입하지 않는다 | Wikipedia 의 autoconfirmed 와 extended confirmed(계정 나이 + 편집 수), Reddit 카르마 |
| 기여 1건의 크기 하한 | 변경 문자 수 20자 미만이거나, 직전 리비전으로 되돌리는 편집은 기여로 세지 않는다 | 나무위키의 기여 인정 기준(일반 지식 기준) |
| 가중치 단계화 | 계정 나이 7일 미만은 ×0.25(현행). 30일 미만 상한 1.5. 상한 3.0 은 90일 이상이면서 확정 기여 50건 이상 | Wikipedia extended confirmed(30일/500편집) |
| 투표 자격 | 계정 나이 24시간 미만이면 투표는 받되 가중치 0. 결과 화면에 "대기표"로만 표시해 참여감은 유지한다 | Reddit 신규 계정 제한 |
| 테마 승격 | 팔로워 수 대신 **나이 7일 이상 계정의 팔로워 수**로 셈한다(`theme-lifecycle.ts:24`) | — |
| 규칙 기반 이상 탐지(차단 아님, 가중치 보류) | 아래 표 | Reddit vote fuzzing(일반 지식 기준)은 투명성 원칙과 충돌해서 **채택하지 않는다** |

**규칙 기반 투표 이상 탐지**. 모두 공개하고, 결과는 "해당 표 가중치 일시 보류"에 그친다. 계정 정지는 하지 않는다.

| 규칙 | 조건 (초기값) | 효과 | 데이터 |
|---|---|---|---|
| R1 동시 유입 | 한 항목에 24시간 안에 신규(7일 미만) 계정 표가 전체 유효표의 50% 초과, 그리고 5표 이상 | 그 신규 표들을 7일 보류(weight 0). 계정 나이가 차면 자동 해제 | Vote, User.createdAt |
| R2 공동 투표 집합 | 두 계정이 최근 30일 투표 항목의 자카드 유사도 0.9 이상, 공통 항목 10개 이상, 계정 나이 차이 3일 이내 | 그 계정 쌍의 공통 항목 표를 서로 0.5배 | Vote |
| R3 단일 목적 계정 | 투표 전부가 한 테마의 한 항목 UP 이면서 같은 테마의 다른 항목에는 DOWN | 해당 DOWN 표 보류 | Vote |
| R4 버스트 | 현행 5분 10표 | 플래그를 **집계 1건**으로 바꾼다(사용자·창마다 1건, 현재는 표마다 1건) | ActionLog |
| 공개 | 문서의 점수 카드에 "보류된 표 N" 표시. `/how-ranking-works` 에 규칙 표를 그대로 게시 | — | — |

구현 위치: `src/lib/abuse.ts` 에 순수 함수를 둔다(`ranking.ts` 처럼 테스트하기 쉽게). 계산 결과는 `Vote.heldUntil DateTime?` 하나를 추가해 반영하고, `computeScore` 는 보류된 표를 0으로 센다.

### 3.2 편집 전쟁
| 장치 | 규칙 | 레퍼런스 |
|---|---|---|
| 되돌리기 API | `POST /api/items/[id]/revert { toRevision }` 은 이력 스냅샷으로 새 리비전을 만든다. 기여로 세지 않는다 | Wikipedia rollback |
| 3RR | 한 사용자가 24시간 안에 같은 문서의 같은 필드를 3번 넘게 되돌리면 그 문서 편집을 24시간 막는다(자동, 공개 규칙) | Wikipedia 3RR |
| 자동 보호 | 24시간 안에 서로 다른 계정 사이의 되돌리기가 4회 이상이면 그 문서를 "반보호"로 둔다. 반보호는 계정 나이 7일 이상, 확정 기여 10건 이상만 편집할 수 있다. 72시간 뒤 자동 해제. 사유는 문서 상단과 이력에 표시한다 | Wikipedia semi-protection, 나무위키 ACL(일반 지식 기준) |
| 민감 필드 | `tier`·`purchaseLinks`·`imageUrl` 변경은 계정 나이 7일 이상만 할 수 있다. 쿨다운: 같은 필드는 같은 사용자가 6시간에 1번 | — |
| 토론 유도 | 409 충돌이나 되돌리기를 당한 사용자에게 토론 탭 링크를 보여 준다 | Wikipedia BRD |
| 데이터 | `EditHistory` 에 `kind: EDIT|REVERT|CREATE`, `revertOf Int?` 추가. `Item.protectedUntil DateTime?` | — |

### 3.3 스팸 링크
| 규칙 | 내용 |
|---|---|
| 스킴 | `https:` 만 허용(2.2절) |
| 도메인 정책 | **허용 목록**: 주요 쇼핑몰과 제조사 도메인을 `src/lib/link-policy.ts` 에 공개 배열로 둔다. 목록에 없는 도메인은 신규(30일 미만) 계정이면 거부하고, 그 밖의 계정이면 허용하되 "검증되지 않은 도메인" 라벨을 붙인다. 목록 변경은 PR 로 공개한다 |
| 단축 URL | `bit.ly` 등 리다이렉터는 거부한다(차단 목록) |
| 제휴 파라미터 | 알려진 제휴 파라미터(쿠팡 파트너스 등, 구체 키는 **미확인**)가 붙은 링크는 저장할 때 `sponsored: true` 로 표시하고 화면에 "제휴 링크" 라벨을 강제한다(4.4절). 제휴 파라미터를 남이 바꿔 넣는 편집은 3.2절 민감 필드 규칙을 따른다 |
| rel | 현행 `noopener noreferrer nofollow sponsored` 유지(`page.tsx:133`) |
| 본문 URL | 지금은 본문이 텍스트라 링크가 되지 않는다. 마크다운 렌더를 도입하면 본문 링크에도 같은 정책을 적용한다 |
| 신규 계정 | 계정 나이 24시간 미만은 문서 생성과 링크 추가를 할 수 없다. 편집은 텍스트 필드만 가능하다 |

### 3.4 신고 → 제재 흐름 (투명성과 이의 제기)
"운영자 임의 개입 없음"을 지키면서 법적 의무(4.5절 임시조치)를 수행하려면 **사람이 하는 판단을 규칙과 기록으로 묶어야 한다.**

| 단계 | 누가 | 무엇을 | 기록 |
|---|---|---|---|
| 1. 신고 | 로그인 사용자(정지자 제외, 하루 10건) | 사유 enum + 설명 | Report |
| 2. 자동 임시 숨김 | 규칙 | 같은 대상에 **나이 7일 이상 서로 다른 계정** 신고 N건(예: 5)이 쌓이면 숨긴다. 법적 사유(명예훼손·개인정보·저작권)는 권리자 신고 1건으로 숨긴다(4.5절) | AuditLog `AUTO_HIDE` |
| 3. 검토 | 모더레이터(확정 기여 기준으로 자동 자격을 얻는 STEWARD 중 순번) 또는 운영자 | **규칙 위반 여부만** 체크리스트로 판정한다(스팸·광고·개인정보·저작권·욕설). 콘텐츠의 옳고 그름은 판정하지 않는다 | AuditLog `ACTION`/`DISMISS` + 근거 규칙 id |
| 4. 제재 | 규칙표 | 1회 경고 → 2회 24시간 → 3회 7일 → 4회 30일. 사람 재량으로 단계를 건너뛸 수 없다 | `Sanction` |
| 5. 통지 | 시스템 | `/me` 에 사유, 규칙 id, 기간, 이의 제기 버튼을 보여 준다(`me/page.tsx:76-81` 확장) | — |
| 6. 이의 제기 | 제재 당사자, 1회 | 원 처리자가 아닌 다른 모더레이터가 7일 안에 판단한다. 기한을 넘기면 제재를 자동 해제한다 | AuditLog `APPEAL_*` |
| 7. 공개 | 시스템 | `/transparency` 에 월별 신고 수, 처리 수, 규칙별 건수, 이의 인용률을 공개한다. 개인 식별 정보는 넣지 않는다 | 집계 |

### 3.5 제재 기록과 감사 로그 스키마 (초안)
```prisma
model AuditLog {            // append-only. UPDATE/DELETE API 없음
  id        String   @id @default(cuid())
  actorId   String?  // null = 시스템 규칙
  actorKind String   // SYSTEM | MODERATOR | ADMIN
  action    String   // AUTO_HIDE | HIDE | UNHIDE | SANCTION | LIFT | APPEAL_OPEN | APPEAL_UPHOLD | APPEAL_GRANT | RULE_CHANGE | DATA_EXPORT | ACCOUNT_DELETE
  targetType String  // ITEM | COMMENT | THEME | USER | VOTE
  targetId  String
  ruleId    String?  // abuse.ts / link-policy.ts 의 공개 규칙 id
  reportId  String?
  note      String?  // 공개 가능한 사유만. 개인정보 금지
  createdAt DateTime @default(now())
  @@index([targetType, targetId, createdAt])
  @@index([actorId, createdAt])
}
model Sanction {
  id String @id @default(cuid())
  userId String
  ruleId String
  level  Int       // 1~4
  startsAt DateTime @default(now())
  endsAt   DateTime?
  appealStatus String @default("NONE") // NONE | OPEN | UPHELD | GRANTED
  auditId String
  @@index([userId, startsAt])
}
```
- `User.suspendedUntil` 은 `Sanction` 에서 파생된 캐시로만 둔다. 직접 바꾸는 경로를 금지한다(`contribution.ts:4-7` 과 같은 원칙).
- 무결성: 각 행에 직전 행 해시를 넣는 체인은 **보류**한다. 운영자가 1명인 동안은 일일 백업본과의 diff 로 충분하다. 운영자가 여러 명이 되면 추가한다.
- `ActionLog`(투표·팔로우·신고 행위 카운트용, 90일 보관)는 레이트 리밋 우회(2.3절)를 막는 용도다. 별도 테이블 대신 `AuditLog` 에 `actorKind=USER` 로 넣는 것도 가능하지만 양이 많아 분리를 권장한다.

---

## 4. 개인정보·법적 항목
(법령 내용은 **일반 지식 기준**이다. 시행 전에 법령 원문을 확인하고, 가능하면 자문을 받는다.)

### 4.1 수집 항목 최소화
| 항목 | 현재 | 필요성 | 조치 |
|---|---|---|---|
| email | 저장(`schema.prisma:26`), 공개 화면에서는 select 하지 않음(`me/page.tsx:29`) | 계정 식별은 `Account.providerAccountId` 로 충분하다. 연락용은 선택 | 1안: 저장하지 않는다(어댑터 래핑). 2안: 저장하되 공개·응답에 절대 포함하지 않는 원칙을 테스트로 고정 |
| name | OAuth 실명이 **기본 공개 닉네임**으로 쓰인다(`history/page.tsx:53`, `talk/page.tsx:52`, `page.tsx:70`) | 실명 노출은 괴롭힘 위험이다 | 첫 로그인 때 닉네임 설정을 강제하고, 기본값은 `사용자-xxxx` |
| image | OAuth 아바타 URL 저장, `/u/[id]` 에서 select(`u/[id]/page.tsx:18`) | 낮음 | 기본은 표시하지 않음 |
| OAuth 토큰 | 평문 저장(2.6절) | 없음 | 삭제 |
| IP·UA | 앱은 저장하지 않음. 리버스 프록시 로그에는 남는다(미확인) | 보안 로그 | 프록시 로그 보관 30일, 처리방침에 명시 |

### 4.2 계정 삭제
현재 삭제 API 가 **없다**. 스키마의 cascade 동작은 다음과 같다. Vote 는 Cascade(`:240`)라 **사용자를 지우면 표가 사라져 점수와 재생성 스냅샷이 바뀐다.** EditHistory·Item·TalkComment 는 SetNull 이라 "탈퇴한 사용자"로 표시된다.

| 데이터 | 처리 |
|---|---|
| User 행 | 즉시 익명화: name→`탈퇴한 사용자`, email·image·bio→null, `deletedAt` 기록. 행은 남긴다(FK 보존) |
| Account·Session | 즉시 삭제 |
| 편집 이력·문서·댓글 | 남긴다(CC BY-SA 등 라이선스 저작자 표시는 "익명"으로. 4.3절). 본인이 요청하면 댓글 본문은 삭제할 수 있다 |
| Vote | 남기고 `userId` 만 무작위 tombstone id 로 바꾼다. 점수와 스냅샷 재현성을 보존한다 |
| Report(신고자) | reporterId null |
| Sanction·AuditLog | 제재 회피 재가입 방지가 목적이면 보관 기간(예: 1년)을 정해 보관하고 처리방침에 명시한다. 그 뒤 파기한다 |
| 백업 | 백업 보관 주기(최대 6개월) 안에서 자연 파기된다고 처리방침에 명시한다 |

### 4.3 한국 개인정보보호법 체크리스트 (일반 지식 기준)
| 항목 | 현황 | 할 일 |
|---|---|---|
| 개인정보 처리방침 공개 | **없음**(`layout.tsx:72-79` 푸터에 링크 없음) | `/privacy` 페이지: 항목, 목적, 보유 기간, 파기, 위탁·국외이전(Google/GitHub OAuth, 서버가 NAS 라면 국외이전은 OAuth 제공자뿐), 정보주체 권리, 책임자 연락처 |
| 수집·이용 동의 또는 근거 | 없음 | 소셜 로그인 첫 진입 시 필수 항목 고지(서비스 제공 계약 이행 근거 + 고지) |
| 만 14세 미만 | 확인 절차 없음 | 가입 시 "만 14세 이상" 확인. 미만이면 가입 불가(법정대리인 동의 절차를 만들지 않는 쪽) |
| 열람·정정·삭제·처리정지 | 정정만 가능(PATCH /api/me) | 내보내기(JSON)와 탈퇴(4.2절) |
| 안전성 확보조치 | 접근권한·백업 미정 | NAS 관리자 계정 2FA, 백업 접근 제한, 접근 기록(AuditLog `DATA_EXPORT`) |
| 유출 통지 | 절차 없음 | 5.3절 사고 대응에 72시간 이내 통지·신고 절차 포함(기한은 원문 확인 필요) |
| 파기 | 없음 | 탈퇴 즉시 익명화, 보관 기간이 지나면 cron 으로 파기 |

### 4.4 약관·저작권·광고 표시
| 항목 | 권장안 |
|---|---|
| 본문 라이선스 | **CC BY-SA 4.0**(Wikipedia·나무위키 계열, 일반 지식 기준). 편집 저장 버튼 옆에 "저장하면 CC BY-SA 4.0 으로 공개하는 데 동의합니다"를 표시한다. 랭킹 데이터(점수·스냅샷)는 별도로 CC BY 4.0 |
| 출처 인용 | 스펙과 가격은 출처 URL 필드를 둔다(`EDITABLE_FIELDS` 확장). 제조사 설명문과 리뷰 글을 통째로 복사하는 것은 금지하고 요약만 허용한다. 이미지: 제조사 이미지 핫링크는 허용 여부가 **미확인**이므로 원칙적으로 직접 촬영한 이미지나 자유 라이선스 이미지만 허용한다. 초기에는 공식 상품 페이지 이미지 URL 을 링크로만 표시하는 안을 권장한다 |
| 이용약관 | `/terms`: 금지 행위(다계정 투표, 대가성 미표시 홍보, 개인정보 게시, 명예훼손), 제재 규칙표(3.4절) 링크, 면책(구매는 외부) — 현행 `page.tsx:141-143` 문구를 약관으로 끌어온다 |
| 대가성 표시 | 공정위 "추천·보증 등에 관한 표시·광고 심사지침"(일반 지식 기준): 경제적 이해관계가 있는 작성자는 표시해야 한다. ① 문서·편집 폼에 "이 제품과 경제적 이해관계(협찬·제휴·재직)가 있습니다" 체크를 두고, 체크하면 문서와 이력에 배지를 공개한다. ② 미표시가 드러나면 3.4절 제재 사유가 된다 |
| 제휴 링크 | 운영자 수익 제휴 링크를 넣는다면 모든 구매 링크 옆에 "제휴 링크: 구매 시 Lifipedia 가 수수료를 받을 수 있습니다"를 **링크마다** 표시한다(쿠팡 파트너스 등 제휴사 자체 규정도 같은 표시를 요구한다고 알려져 있다, 일반 지식 기준). **제휴 여부는 랭킹 산정에 절대 쓰지 않는다**(`ranking.ts` 원칙과 같다) |
| 구매 링크 정책 | 사용자 제휴 ID 가 들어간 링크는 금지하거나, 허용하더라도 대가성 표시를 의무화한다. 권장: 금지하고, 발견하면 파라미터를 제거한다(3.3절) |
| 광고 슬롯 | `AdSlot.tsx` 는 "광고" 라벨(`aria-label`)이 있다. 광고 스크립트를 붙일 때 CSP 와 함께 다시 검토한다 |

### 4.5 후기·비방 문서 신고와 임시조치
정보통신망법 제44조의2 임시조치(일반 지식 기준): 권리를 침해당한 사람이 삭제를 요청하면, 판단이 어려운 경우 최대 30일 동안 접근을 차단할 수 있다.

| 단계 | 처리 |
|---|---|
| 접수 | `/report/legal` 양식(신고 사유 COPYRIGHT·DEFAMATION·PRIVACY): 권리자 신원, 침해 내용, 대상 URL, 소명 자료. 일반 신고와 분리한다 |
| 임시조치 | 접수 즉시 대상 **필드 또는 리비전**만 숨긴다(문서 전체가 아니라). 숨긴 자리에 "권리침해 신고로 임시조치 중(~YYYY-MM-DD)"을 표시한다. AuditLog `HIDE` |
| 게시자 통지 | 편집자에게 `/me` 로 알리고 재게시 요청(이의) 경로를 연다 |
| 30일 처리 | 기간 안에 이의가 없거나 판단이 끝나면 영구 숨김. 이의가 있으면 판단한다. 판단 기준은 "사실 적시인가, 출처가 있는가" 같은 **규칙 체크리스트**로 한다 |
| 제품 후기 특례 | 제조사가 부정적 후기를 "명예훼손"으로 신고하는 경우(남용 패턴). 출처 있는 사실과 의견 표현은 유지를 원칙으로 하고 처리 결과를 `/transparency` 에 공개한다(Wikipedia 의 공개 DMCA 로그와 같은 방식, 일반 지식 기준) |
| 개인정보 게시 | 실명, 연락처, 주소가 들어간 리비전은 이력 diff 에서도 숨긴다(**리비전 숨김** 기능 필요: `EditHistory.hidden`) |

---

## 5. 보안 검토 운영

### 5.1 보안 검토자 서브에이전트 (`docs/agents/security-reviewer.md`) 실행 시점
| 트리거 | 범위 | 추가 체크리스트(기존 7항목 외) |
|---|---|---|
| 쓰기 API 추가·변경 커밋 | `git diff <base>..HEAD -- src/app/api src/lib` | (8) 레이트 리밋 적용 여부(2.3절 표) (9) Origin 검사 (10) URL 필드는 공용 `safeUrl` 을 쓰는가 |
| 렌더 경로 변경(마크다운, 링크, 이미지) | `src/components src/app/**/page.tsx` | (11) `dangerouslySetInnerHTML`, 외부 URL href·src, CSP 변경 |
| `schema.prisma`, `Dockerfile`, `docker-compose.yml`, `next.config.mjs`, `.dockerignore` 변경 | 해당 파일 | (12) 데이터 손실 플래그, 노출 포트, 기본 비밀값, 헤더 |
| 의존성 추가·업데이트 | `package.json`, lock | (13) 신규 패키지 필요성(ponytail 원칙), 설치 스크립트 |
| 주 1회 일요일 통합 점검 | 지난 주 전체 diff + 이 문서의 P0/P1 표 | 로드맵 진행 상황과 새 구멍 |

보고 형식은 기존과 같다. 판정은 구현자가 한다.

### 5.2 PR 단위 자동 점검
GitHub Actions 는 아직 없다(`.github/` 없음). 비용이 가장 적은 순서로 넣는다.

| 단계 | 명령 | 실패 조건 | 넣을 곳 |
|---|---|---|---|
| 1 | `npm run typecheck && npm run lint && npm test` | 하나라도 실패 | `scripts/check.sh` 하나 → 로컬 `pre-push` 와 CI 가 같이 호출 |
| 2 | `npm audit --omit=dev --audit-level=high` | high 이상 | 같은 스크립트 |
| 3 | 시크릿 스캔: gitleaks(설치가 필요하다. 오프라인이면 `git diff --cached` 에 `grep -E '(SECRET|TOKEN|PASSWORD)=.{8,}|BEGIN (RSA|EC) PRIVATE'` 로 대체) | 검출 | 같은 스크립트 |
| 4 | 금지 패턴 grep: `--accept-data-loss`, `dangerouslySetInnerHTML`, `z.string().url()` 직접 사용, `mode: 'insensitive'` | 검출(허용 목록 주석이 없을 때) | 같은 스크립트 |
| 5 | 보안 회귀 테스트(vitest): `safeUrl` 거부 케이스(`javascript:`·`data:`·`http:`), `safeCallbackUrl`, 레이트 리밋 함수, 이상 탐지 규칙 R1~R4 | 실패 | `tests/security.test.ts` |
| 6 | (CI 도입 후) `.github/workflows/check.yml` 가 `scripts/check.sh` 1줄 실행 | — | — |

`scripts/daily-dispatch.sh` 의 일일 점검에 2번과 3번을 붙이는 것은 선택이다.

### 5.3 사고 대응 절차 (초안)
| 단계 | 시간 목표 | 할 일 |
|---|---|---|
| 감지 | — | 신고, 버스트 집계 급증, 500 급증, 백업 실패 |
| 분류 | 1시간 | S1 개인정보 유출·계정 탈취·RCE / S2 랭킹 조작 확인 / S3 스팸 폭주 |
| 봉쇄 | S1 즉시 | 컨테이너 중지 또는 쓰기 차단 플래그(`READ_ONLY=true` 환경변수 하나로 쓰기 라우트 503). 시크릿(`NEXTAUTH_SECRET`·`CRON_SECRET`·OAuth) 교체 → 모든 세션 무효화(`Session` 테이블 비우기) |
| 보존 | 봉쇄와 동시 | DB 사본과 프록시 로그 사본(쓰기 금지 위치) |
| 복구 | — | 오염 전 백업 복원 + 이후 리비전 재적용 여부 판단. 랭킹 조작이면 **규칙을 추가하고 소급 적용**한다. 개별 점수를 수동 조정하지 않는다 |
| 통지 | S1: 법정 기한(원문 확인 필요, 통상 72시간으로 알려짐) | 정보주체 통지, 개인정보위·KISA 신고(일반 지식 기준) |
| 사후 | 7일 | 공개 사후 보고(`/transparency`), 규칙 변경 커밋, 이 문서 갱신 |

---

## 6. 로드맵

### P0 (즉시, 이번 주)
| # | 작업 | 규모 | 선행 | 검증 |
|---|---|---|---|---|
| P0-1 | DB 방향 결정(Q1) 후 compose·Dockerfile·.env 예시·DEPLOY_NAS 를 일치시킨다. SQLite 라면 `/data` 볼륨(uid 1001) | M | Q1 | 빈 NAS 에서 `docker compose up` → `/` 200 |
| P0-2 | compose: 5432 포트 매핑 삭제, `POSTGRES_PASSWORD`·`CRON_SECRET`·`NEXTAUTH_SECRET` `:?` 필수화. 앱 기동 시 `change-me`·32자 미만 검사 | S | — | `.env` 없이 up 하면 실패 메시지 |
| P0-3 | `--accept-data-loss` 제거 → `prisma migrate` 도입(`migrations/` 커밋, 기동 시 `migrate deploy`) | M | P0-1 | 컬럼 삭제 마이그레이션을 dry-run 하면 경고 |
| P0-4 | `.dockerignore` 에 `*.db`, `.env*`, `docs`, `.planning` 추가 | S | — | `docker run --rm <img> ls prisma` 에 dev.db 없음 |
| P0-5 | 공용 `safeUrl`(https 만, 2,048자) → items 생성·편집 두 라우트에 적용 | S | — | `tests/security.test.ts` 거부 케이스 |
| P0-6 | 레이트 리밋: 문서 생성(시간당 5), 댓글(시간당 30), 팔로우(시간당 60), 신고(일 10). 신고에 정지 검사 추가. 버스트 Report 는 창마다 1건 | S | — | 라우트 단위 테스트(`tests/me-route.test.ts` 패턴) |
| P0-7 | `next.config.mjs`: 보안 헤더(2.5절 1단계), `poweredByHeader:false`, `remotePatterns` 삭제 | S | — | 빌드 후 응답 헤더 확인. `/_next/image?url=https://example.com/a.png` 가 400 |
| P0-8 | `mode:'insensitive'` 제거(3곳) | S | — | `/api/search?q=텐트` 200 |
| P0-9 | 일일 SQLite `.backup` + 7일 보관(시놀로지 작업 스케줄러) | S | P0-1 | 복원 리허설 1회 |

### P1 (2주)
| # | 작업 | 규모 | 선행 | 검증 |
|---|---|---|---|---|
| P1-1 | 신뢰도 "살아남은 기여" 전환(3.1절): 확정 cron, 최소 변경량, 되돌림 제외 | L | P1-3 | 파밍 시나리오 테스트: 쓰레기 문서 100개 → 신뢰도 1.0 유지 |
| P1-2 | 투표 행위 로그 기반 리밋(재투표 우회 차단) + 24시간 미만 계정 가중치 0 | M | P1-4 | 생성·삭제 반복 41회째 429 |
| P1-3 | 되돌리기 API + `EditHistory.kind` + 3RR 자동 규칙 + 민감 필드(tier·링크·이미지) 7일 계정 요건과 tier 편집 검증 | M | — | 단위 테스트 + 이력 화면 |
| P1-4 | `AuditLog`·`Sanction` 스키마와 규칙표 기반 제재 함수(사람 재량 단계 건너뛰기 불가) | M | P0-3 | 제재 단계 테스트 |
| P1-5 | 쓰기 라우트 Origin 검사 + JSON Content-Type 강제 | S | — | 다른 Origin 이면 403 테스트 |
| P1-6 | `/privacy`, `/terms`, 라이선스 고지(편집 저장 버튼), 만 14세 확인, 첫 로그인 닉네임 설정 | M | Q3·Q4 | 푸터 링크, 신규 로그인 흐름 |
| P1-7 | OAuth 토큰 컬럼 비우기, email 저장 여부 결정(Q5) | S | Q5 | DB 에 토큰 null |
| P1-8 | `scripts/check.sh`(5.2절 1~5) + pre-push | S | — | 의도적 위반 커밋이 차단됨 |
| P1-9 | 링크 정책(`link-policy.ts`: 허용 도메인, 단축 URL 차단, 제휴 라벨) | M | P0-5, Q6 | 테스트 |

### P2 (분기)
| # | 작업 | 규모 | 선행 | 검증 |
|---|---|---|---|---|
| P2-1 | 투표 이상 탐지 R1~R3 + `Vote.heldUntil` + "보류된 표" 공개 | L | P1-2 | 합성 다계정 시나리오 테스트 |
| P2-2 | 신고→임시조치→이의 제기 UI 전체, 법적 신고 양식, 리비전 숨김 | L | P1-4 | E2E 시나리오 1회 |
| P2-3 | `/transparency` 월간 공개 | M | P2-2 | 페이지 |
| P2-4 | 자동 문서 보호(반보호) | M | P1-3 | 테스트 |
| P2-5 | 계정 삭제(익명화, Vote tombstone)와 데이터 내보내기 | M | P1-4 | 삭제 후 점수 불변 테스트 |
| P2-6 | CSP 2단계(nonce, 광고 스크립트 대응), HSTS | M | 광고 결정 | 헤더 검사 |
| P2-7 | 스냅샷 확정 후 동결(과거 periodKey upsert 금지, 재생성은 새 버전 행) | S | — | 과거 키 재실행 시 409 |
| P2-8 | 사고 대응 리허설(시크릿 교체, 세션 전체 무효화, 백업 복원) | S | P0-9 | 리허설 기록 |

---

## 7. 열린 질문 (추천안 포함)
| # | 질문 | 추천 |
|---|---|---|
| Q1 | NAS 운영 DB 를 SQLite 로 갈 것인가, Postgres 로 되돌릴 것인가? 지금은 provider 가 sqlite, compose 는 Postgres 라 둘 다 동작하지 않는다(추정) | **SQLite**. 단일 NAS, 단일 인스턴스, 백업이 `.backup` 한 줄로 끝난다. compose 에서 db 서비스를 지운다. 동시 쓰기가 늘면(초당 수십 건) Postgres 로 옮긴다 |
| Q2 | 신뢰도를 "살아남은 기여"로 바꾸면 기존 사용자의 trustScore 가 내려갈 수 있다. 소급 적용할 것인가? | 소급 적용하되 **과거 Vote.weight 는 건드리지 않는다**(투표 시점 고정 원칙). 새 표부터 새 신뢰도를 쓴다. 공지는 `/how-ranking-works` 변경 이력으로 한다 |
| Q3 | 본문 라이선스는? | CC BY-SA 4.0(본문), CC BY 4.0(랭킹 데이터). 시드 콘텐츠(`content/camping.json`)의 출처 문구가 이 라이선스와 충돌하지 않는지 먼저 확인한다 |
| Q4 | 만 14세 미만을 받을 것인가? | 받지 않는다. 법정대리인 동의 절차를 만드는 비용이 서비스 단계에 비해 크다 |
| Q5 | 이메일을 저장할 것인가? | 저장하지 않는다. 운영 연락은 `/me` 알림으로 충분하다. 저장한다면 공개 응답에 절대 포함하지 않는 원칙을 테스트로 고정한다 |
| Q6 | 구매 링크를 허용 목록 도메인만 받을 것인가, 아니면 모두 받고 라벨만 붙일 것인가? | 신규(30일 미만) 계정은 허용 목록만, 그 밖의 계정은 모두 받되 "검증되지 않은 도메인" 라벨. 단축 URL 과 사용자 제휴 ID 는 금지 |
| Q7 | 모더레이터를 누가 맡는가? "운영자 임의 개입 없음"과 법적 임시조치 의무가 충돌한다 | 법적 임시조치는 운영자가 하고 **전부 AuditLog 에 공개**한다. 규칙 위반 판정은 STEWARD 등급 중 자동 순번으로 정하고, 이의는 다른 사람이 판단한다. 운영자는 점수와 순위에 접근하는 경로를 갖지 않는다 |
