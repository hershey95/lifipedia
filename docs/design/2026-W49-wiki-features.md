# W49 설계서: 위키백과 기능 전수조사와 적용 (2026-11-18 작성, Claude 대화 세션)
> 기간 W49 = 11/23(월)~11/29(일). 사용자 지시(11/18): "위키피디아에서 적용되는 기능들을 전수조사·분석해서 우리 컨셉에 맞게 적용하는 계획".
> **일요일(11/22) 무인 설계 세션에게**: 이 W49 설계서는 이미 있다. 새 W49 문서를 만들지 말고 W48 회고·남은 큐를 보고 6절 큐 순서만 조정한다.

## 0. 결론
- 위키백과 특수 문서 190개(15개 묶음)와 편집·읽기·정책 기능을 하나씩 판정했다. 결과는 표의 행 기준으로 **채택 7 / 변형 30 / 이미 있음 13 / 보류 3 / 비채택 22**다. 무관한 묶음 9개는 각각 한 줄로 정리했다(5절).
- 우리 철학의 거름망은 세 가지다. (1) 운영자·검토자 권한 기능은 비채택하거나, 규칙으로 계산하는 형태로 바꾼다. (2) 신뢰도는 기여 원장에서만 오른다. 감사 표시도 신뢰도에 넣지 않는다. (3) 조회수는 점수에 넣지 않는다(ADR 0001).
- W49 에는 **스키마 변경 없이** 할 수 있는 다섯 가지를 넣는다(`db:push`(G)를 기다리지 않음). 순서는 ① 리비전 비교·고정 링크·되돌리기 버튼 ② 위키링크 해석(빨간 링크·동명 문서·역링크) ③ 기여할 거리와 토막 문서 ④ 편집 필터(가격 급변·대량 삭제·차단 도메인)와 계산형 변경 태그 ⑤ 작은 것 묶음이다.
- 스키마가 필요한 기능은 W50 이후로 미룬다(G 선행): 문서 이동·넘겨주기, 문서 단위 주시, 감사 표시, 편집 요청, 출처 구조(S).

## 1. 방법과 출처
- 목록 원본: `https://en.wikipedia.org/wiki/Special:SpecialPages` (2026-11-18 조회, 15개 묶음 190개, 원문 그대로).
- 편집·읽기·정책 기능: `https://www.mediawiki.org/wiki/Help:Contents`. 이 페이지는 잘려서 요약으로만 읽었다. 그래서 여기서 온 항목과 내가 이미 알던 지식에서 온 항목은 **(일반 지식 기준)** 으로 표시한다.
- 10/12 판정표(`ref-backend.md` 1.1, `ref-frontend.md` 1.2)를 코드와 다시 대조했다(2절). 거기서 이미 판정한 기능은 다시 판정하지 않고 상태만 고친다.
- 현황 근거는 `파일:줄` 로 단다. 키워드 개수 세기는 근거로 쓰지 않는다.

## 2. 10/12 판정표 재검증 (상태만 갱신)
| 기능 | 10/12 상태 | 지금 | 근거 |
|---|---|---|---|
| 되돌리기 | ◐ API 없음 | ◐ **API 는 있고 화면 버튼이 없음** | `api/items/[id]/revert/route.ts:94`, history 페이지에 버튼 없음 |
| 임의 두 리비전 비교 | 직전 대비만 | 그대로 | `wiki.ts:37 buildDiff(before, after, from, to)` 재사용 가능, `history/page.tsx:19` 는 diff 원문만 나열 |
| 최근 변경 | ○ | ● | `recent.ts:15`, `recent/page.tsx` |
| 주시목록 | ○ | ● 분류 갤러리 팔로우로 구현, 문서 단위는 ○ | `recent/page.tsx:27` `scope=following` |
| 보호 수준 | ○ | ● 규칙 계산 | `protection.ts:25` |
| 목차 | ○ | ● | `markdown.ts:19 extractToc` |
| 위키링크·빨간 링크·역링크 | ◐ | ◐ **`[[ ]]` 가 검색 링크로만 바뀜** | `markdown.ts:35` |
| 편집 충돌 | ◐ | ◐ 409 응답만 있고 필드별 해결 화면은 없음 | `api/items/[id]/edit/route.ts:70` |
| 출처·각주 | ◐ | ◐ 그대로(W48 ⑤ S) | BACKLOG 11-14 |
| 인포박스 | ◐ | ● | A-3 (8b21b9e) |
| 문서 이동·병합 | ○ | ○ | 후순위 유지 |
| 편집 요청 | ○ | ○ | 보호 수준이 생겼으니 W50 후보로 승격(7절) |

## 3. 특수 문서 전수표 (묶음별)
판정: **채택** / **변형** / **있음**(이미 구현) / **비채택**. "큐"는 6절 작업 번호다.

### 3.1 Maintenance reports (24) → 우리 이름은 "기여할 거리"
위키백과는 이 목록을 관리자와 숙련자가 쓴다. 우리는 이것을 **누구나 보는 기여 안내**로 바꾼다. 신뢰도가 기여에서만 오르므로, 할 일을 보여 주는 것이 곧 성장 경로가 된다.
| 기능 | 판정 | 우리 버전 | 큐 |
|---|---|---|---|
| Short pages | 변형 | **토막 문서**: 본문이 짧거나 필수 절이 비었으면 계산으로 표시 | ③ |
| Wanted pages | 변형 | 빨간 링크가 가장 많이 걸린 제목 = "만들어 주세요" | ③ (②의 부산물) |
| Dead-end pages | 변형 | 다른 문서로 가는 위키링크가 0인 문서 | ③ |
| Orphaned pages | 변형 | 역링크 0 + 상황 갤러리에 연결되지 않은 분류에 속한 문서 | ③ |
| Pages with the fewest revisions | 변형 | 리비전 1개뿐인 문서(검토가 필요한 문서) | ③ |
| Dormant pages | 변형 | 90일 넘게 편집이 없는 문서 → 가격 재확인 대상 | ③ |
| Uncategorized pages/categories | 비채택 | 문서는 생성할 때 분류에 반드시 속한다(구조상 0) | — |
| Protected pages | 변형 | 지금 보호 수준이 걸린 문서 목록(계산값 공개, 투명성) | ⑤ |
| Long pages | 비채택 | 긴 문서는 문제가 아니다 | — |
| Broken/Double redirects | 보류 | 넘겨주기가 생긴 뒤에 필요(7절) | W50+ |
| Lint errors | 있음 | `content:check` (`src/lib/content-check.ts`) | — |
| Pages not connected to items · without language links · Uncategorized files/templates · Unused/Wanted categories·files·templates · Protected titles | 비채택 | 위키데이터·다국어·파일·틀 체계가 없다 | — |

### 3.2 Lists of pages (14)
| 기능 | 판정 | 우리 버전 | 큐 |
|---|---|---|---|
| Categories · Category tree | 있음 | 분류 트리(대·중·소) `taxonomy.ts` | — |
| Search | 있음 | `/search` | — |
| Disambiguation pages | 변형 | **동명 문서**: 같은 이름의 문서가 여러 분류에 있으면 `[[이름]]` 이 고르는 목록으로 간다 | ② |
| Pages linking to disambiguation pages | 변형 | 동명 문서로 가는 링크를 기여할 거리에 표시 | ③ |
| All pages · All pages with prefix | 변형 | 가나다 문서 색인 | W50+ (낮음) |
| Redirects | 보류 | 7절 문서 이동 | W50+ |
| External links search | 변형 | 판매처 도메인별 문서 찾기(링크 정리용) | W50+ (낮음) |
| Tracking categories | 변형 | ③의 계산 목록이 대신한다 | ③ |
| Entity usage · Pages near you · page property · badges | 비채택 | 위키데이터·위치·내부용 | — |

### 3.3 Account management (14) · Users and rights (19)
| 기능 | 판정 | 이유 / 우리 버전 |
|---|---|---|
| Log in/out · Create account | 있음 | NextAuth OAuth (`src/lib/auth.ts`) |
| Preferences | 있음(부분) | `PATCH /api/me` |
| Notifications | 채택 | W48 ③ C(알림 3종)이 맡는다 |
| Topic subscriptions | 변형 | 토론·게시판 글 구독. C 다음 단계(W50+, 스키마) |
| User contributions | 변형 | `/u/[id]` 는 지금 개수만 보여 준다(`u/[id]/page.tsx:20`). 기여 목록(리비전·되돌려짐 여부)을 붙인다 (⑤) |
| Active users list | 비채택 | 순위표처럼 읽혀 기여 부풀리기를 부른다 |
| Blocked users · Autoblocks | 있음(최소) | `suspendedUntil`. 처리 흐름은 W45-4(검토자 결정 대기) |
| User groups / rights · Grants · Global groups | 비채택 | 권한은 신뢰도·보호 수준으로 계산한다. 사람에게 주는 권한 그룹은 만들지 않는다 |
| Email user | 비채택 | 개인정보, 괴롭힘 경로 |
| Bot passwords · OAuth consumer · Global accounts/rename/vanish · Reset tokens · Password policies · Change credentials/email | 비채택 | 외부 OAuth 로그인만 쓴다. 계정 삭제는 W46-3 에서 다룬다 |

### 3.4 Recent changes and logs (9)
| 기능 | 판정 | 우리 버전 | 큐 |
|---|---|---|---|
| Recent changes · Related changes | 있음 | `/recent`, `scope=following` | — |
| New pages · New pages feed | 변형 | `/recent?kind=create` 필터(`recent.ts:5 changeKind` 재사용). 새 글 순찰 큐는 비채택 | ⑤ |
| Valid change tags | 변형 | **계산형 변경 태그**: 가격 변경·대량 삭제·되돌리기·새 문서. 저장하지 않고 리비전에서 계산한다 | ④ |
| Edit filter log | 변형 | 편집 필터에 걸린 시도는 저장하지 않는다. 경고 문구만 보여 준다(스키마 없이) | ④ |
| Edit Recovery | 채택 | 편집 폼 임시 저장(localStorage, 저장 성공하면 지움) | ⑤ |
| User logs | 비채택 | 관리 기록. 제재 기록은 W45-4 에서 다룬다 |
| Gallery of new files | 비채택 | 업로드가 없다 |

### 3.5 Page tools (9) · Redirecting special pages (14)
| 기능 | 판정 | 우리 버전 | 큐 |
|---|---|---|---|
| Differences · Compare pages(리비전) | 채택 | 임의 두 리비전 비교 `history?from=&to=` | ① |
| Permanent link | 채택 | `?rev=N` 지난 리비전을 읽기 전용으로 보기 | ① |
| Page history | 있음 | `history/page.tsx` | — |
| What links here | 채택 | **역링크** 목록 | ② |
| Page info | 변형 | 문서 정보: 만든 날·만든 사람·리비전 수·편집자 수·역링크 수. 조회수는 보여 주되 점수와 떨어뜨려 둔다 | ⑤ |
| Random article · Random page in category | 채택 | `/random`, `/random?category=` | ⑤ |
| Compare pages(문서끼리) | 변형 | **문서 비교**: 같은 소분류의 두 문서 사양·가격을 나란히. 쇼핑 맥락에 잘 맞는다 | W50 (M) |
| Edit / New section / Purge / Delete / Protect a page | 있음·비채택 | 편집과 토론은 있다. 삭제·보호는 사람이 하지 않는다(규칙만). 캐시는 60초라 Purge 가 필요 없다 | — |
| Cite This Page | 변형 | 문서 인용 문구 복사(리비전 고정 링크 포함) | W50+ (낮음) |
| Page assessments | 변형 | 위키프로젝트 평가자 대신 **토막 문서** 계산 | ③ |
| Export pages · Book · URL shortener · Mass delete · Change content model | 비채택 | 쓸모가 낮거나 관리자 도구다 |

### 3.6 Data and tools (19) · High use pages (7)
| 기능 | 판정 | 이유 / 우리 버전 |
|---|---|---|
| Statistics | 변형 | `/stats`: 문서·리비전·기여자·분류 수. 관리자용 지표가 아니라 공개 수치 (⑤, 낮음) |
| Edit checks | 변형 | 편집 중 안내. 출처 없이 가격을 바꾸면 "출처를 붙이세요"라고 알려 준다(막지 않음) (④) |
| Edit filter configuration | 변형 | 규칙을 코드 상수로 공개한다(`how-ranking-works` 처럼). 관리자 화면은 없다 (④) |
| Most linked-to pages · Pages with the most revisions | 변형 | 역링크 수는 문서 정보에만 쓰고 **점수·인기에는 넣지 않는다**(점수는 투표만, ADR 0001 정신) |
| API sandbox · REST sandbox | 보류 | 공개 읽기 API 는 P2 후보 |
| Book sources · Expand templates · Template sandbox · Gadgets · System messages · Namespace · Interwiki · Wiki sets · IP Range · hieroglyph · Version · Gadget usage · API feature usage · Most transcluded · Most interwikis · Most categories · Most linked files/categories | 비채택 | 틀·가젯·다국어·사용자 스크립트 체계가 없다. 사용자 스크립트는 보안상 들이지 않는다 |

### 3.7 나머지 묶음
| 묶음 | 판정 | 이유 |
|---|---|---|
| Spam tools — Blocked External Domains | 변형 | 구매처 링크·출처 URL 의 차단 도메인 목록을 코드 상수로 둔다(단축 URL·리퍼럴 위장 차단) (④) |
| Growth tools (Newcomer homepage·tasks·Impact·mentors) | 변형/비채택 | 새내기 과제 = **기여할 거리** (③). Impact(내가 고친 문서 조회수)는 `/me` 에 보여 줄 수 있으나 점수와 무관하게(W50+). 멘토 배정은 운영자 개입이라 비채택 |
| Pending changes (3) | 비채택 | 검토자가 승인할 때까지 편집을 숨기는 기능은 사람 권한이다. 규칙 계산형 보호 수준이 대신한다 |
| Events (10) | 비채택 | 편집 행사 운영은 범위 밖 |
| Media reports and uploads (8) | 비채택 | 이미지는 URL 만 받는다(저작권·NAS 저장 부담) |
| Other (SecurePoll·ORES·Community Configuration·Automatic translation·Math·Discussion tools data·Find comment·lint transclusions·Global rename) | 비채택 | ORES(기계학습 훼손 점수)는 "AI 가 판정하지 않는다" 원칙과 맞지 않아 규칙형 태그(④)로 대신한다. 투표·선거 도구는 운영자 체계라 쓰지 않는다 |

## 4. 특수 문서 밖의 기능 (일반 지식 기준)
| 기능 | 판정 | 우리 버전 |
|---|---|---|
| 편집 요약 | 있음 | `EditHistory.summary` |
| 사소한 편집 표시 | 비채택 | 사용자가 스스로 표시하는 방식은 악용된다. 기여 규칙의 최소 변경량(20자)이 대신한다 |
| 미리보기 · 편집기 | 있음 | `MarkdownEditor` |
| 편집 충돌 해결 화면 | 변형 | 필드별로 내 것/최신 중 고르기. 409 응답에 최신 값을 담는다(W50, M) |
| 페이지 미리보기(링크 호버) | 변형 | ②로 링크가 해석되면 문서 요약 카드를 보여 준다(W50, 가짜 문구 금지) |
| 토론 문서 · 서명 | 있음 | `TalkComment`, 작성자는 자동 표시 |
| 틀(Template) · 마법 낱말 · Lua | 비채택 | 원시 문법이 복잡해지고 보안 부담이 늘어난다. 인포박스는 필드로 처리한다 |
| 알찬 글·좋은 글·대문 큐레이션·오늘의 알찬 글 | 비채택 | 운영자 선정이다. 개념글(자동)과 인기 문서가 대신한다 |
| 삭제 토론(AfD) | 비채택 | 문서 삭제는 규칙 위반 제재(`isRemoved`)만 한다 |
| 핵심 정책: 검증 가능성·독자 연구 금지·중립성 | 있음 | `docs/CONTENT_RESEARCH_GUIDELINE.md`(출처·확인일·원문 인용) |
| 저작권 표시(CC BY-SA 고지) | 채택 | 문서 하단 라이선스 고지. W46-3(약관)과 함께, 운영자 결정 필요 |
| 다크 모드 · 모바일 화면 | 있음 | 다크 기본, 라이트 토큰 |
| 단축키(accesskey) | 비채택(지금) | 쓸 사람이 생기면 |
| 위키데이터(구조화 사양) | 변형 | `specSummary` 를 구조화된 사양 필드로 바꾸면 문서 비교가 쉬워진다. W50 이후 스키마 |

## 5. 집계
3·4절 표의 **행 단위**로 셌다. 한 행에 여러 특수 문서를 묶은 곳이 있어서 합계가 190개와 맞지 않는다.
- **채택 7**: 리비전 비교, 고정 링크, 역링크, 무작위 문서, Edit Recovery, 알림, 저작권 고지. 2절의 되돌리기 버튼은 별도다.
- **변형 30**: 토막 문서, Wanted·Dead-end·Orphaned·Fewest revisions·Dormant, 보호 중인 문서 목록, 동명 문서와 그 링크, 색인, 도메인 검색, 추적 분류, 주제 구독, 기여 목록, 새 문서 필터, 변경 태그, 필터 경고, 문서 정보, 문서 비교, 문서 인용, 토막 평가, 통계, 편집 안내, 필터 규칙 공개, 역링크 수, 차단 도메인, 새내기 과제, 충돌 해결, 링크 미리보기, 구조화 사양
- **있음 13**, **보류 3**(넘겨주기 2, 공개 API), **비채택 22**
- 무관한 묶음 9개: 위키데이터, 다국어, 틀·가젯, 파일, 전역 계정, OAuth 앱, 행사, 선거, 수식

## 6. W49 작업 큐 (스키마 변경 없음)
**순서**: W1~W4 → W48 에서 넘어온 C·`useOptimistic`·S·K → W5. 이유: 11/18 사용자 지시가 가장 최근이고, W1~W4 는 G(`db:push`)와 관계없이 build 까지 확인할 수 있다. C·S 는 스키마 반영 전이라 어차피 "build 미확인"이 붙는다. 월~목 하루 2개, 최대 8칸이다. W5 는 남는 칸에서 집는다.

### W1 리비전 비교·고정 링크·되돌리기 버튼 (S~M)
- **데이터**: 없음. `EditHistory.snapshot` 두 개와 `buildDiff`(`wiki.ts:37`)를 쓴다.
- **화면**: `history?from=3&to=7` 이면 두 리비전의 diff 를 보여 준다. 각 리비전 줄에 "비교"(라디오 두 개 + 버튼, `<form method="get">`, JS 없음), "이 리비전 보기", "이 리비전으로 되돌리기" 를 둔다. `item/[itemSlug]?rev=N` 은 그 리비전 스냅샷을 읽기 전용으로 렌더하고 "지난 리비전입니다" 띠와 현재 문서 링크를 붙인다. 투표·편집 버튼은 숨긴다.
- **되돌리기 버튼**: 기존 `POST /api/items/[id]/revert` 를 부른다. 자격 검사(기여 5건 이상·최근 10개 리비전)는 서버에만 둔다. 화면은 자격이 없으면 버튼 대신 이유 한 줄을 보여 준다.
- **테스트**: 순수 함수 `parseRevRange(from, to, max)`(정수가 아니거나 범위 밖이면 null, 순서가 거꾸면 뒤집기)를 테스트한다. 라우트 테스트는 이미 있는 revert 경계만 쓴다.
- **위험**: `?rev=` 페이지가 검색엔진에 중복으로 잡힌다 → `robots: noindex`. 아주 오래된 리비전의 스냅샷 필드가 지금 필드와 다를 수 있다 → 없는 필드는 빈 값으로 둔다.

### W2 위키링크 해석: 빨간 링크·동명 문서·역링크 (M)
- **데이터**: 없음. 렌더할 때 이름으로 문서를 찾는다.
- **순수 함수**(`markdown.ts`): `extractWikiLinks(md): string[]`(코드 블록 제외, 지금 정규식 재사용), `wikiLinksToMarkdown(md, resolve)` — `resolve(title)` 이 `{kind:'one', href}` / `{kind:'many', href:'/search?q=..&same=1'}` / `{kind:'none'}` 를 돌려준다. `none` 이면 `[제목](/search?q=..&missing=1 "문서 없음")` 으로 바꾸고 클래스로 빨간 링크를 표시한다. 인자 없이 부르면 지금처럼 검색 링크다(하위 호환).
- **서버**: 문서 페이지가 `extractWikiLinks` → `prisma.item.findMany({ where: { name: { in }, isRemoved: false } })` 한 번으로 해석한다. 이름 비교는 앞뒤 공백을 자른 정확 일치다.
- **역링크**: 문서 페이지 하단 "이 문서를 가리키는 문서". `description contains '[[이름]]'` 으로 찾는다. `// ponytail: LIKE 전수 탐색, 문서 1만 개를 넘으면 링크 테이블(W50+)`.
- **화면**: `/search?missing=1` 이면 "아직 문서가 없습니다. 만들기" 안내(분류를 고르게 한다). `same=1` 이면 동명 문서 목록(분류 경로 표시).
- **테스트**: `extractWikiLinks`(코드 블록·중복·80자 제한), `wikiLinksToMarkdown` 세 경우.
- **위험**: 링크 제목을 쿼리 문자열에 넣을 때 인코딩한다(지금처럼 `encodeURIComponent`). 빨간 링크는 색만으로 구분하지 않고 `title` 과 밑줄 점선으로도 구분한다(접근성).

### W3 기여할 거리 `/contribute` + 토막 문서 (M)
- **순수 함수** `src/lib/upkeep.ts`: `stubReasons(item)` → `['본문 짧음','출처 절 없음','가격 없음','이미지 없음']` 의 부분집합. 기준은 상수로 공개한다(본문 300자 미만, `## 출처` 없음, `priceKrw == null`, `imageUrl` 없음). 하나라도 있으면 **토막 문서**다.
- **목록**: 토막 문서 / 만들어 주세요(빨간 링크가 많이 걸린 제목, W2 의 `extractWikiLinks` 를 전체 문서에 돌려 센다) / 리비전 1개 / 90일 미편집(가격 재확인) / 답변 없는 추천 요청(P3 `buildBestItems` 쪽 쿼리 재사용) / 나가는 링크 없음. 분류로 거를 수 있다(`?category=`). 각 목록 20개, `unstable_cache(300)`.
- **문서 페이지**: 토막 문서면 상단에 한 줄 "이 문서는 토막 문서입니다: 출처 절 없음. 편집하기".
- **점수와 분리**: 토막 여부는 점수·인기에 영향을 주지 않는다(점수는 투표만). 화면에도 그렇게 적는다.
- **테스트**: `stubReasons` 경계값, 빨간 링크 집계 함수 `countWanted(docs, existingNames)`.
- **용어**: GLOSSARY 에 토막 문서·기여할 거리 등록(이 커밋에서 함).

### W4 편집 필터와 계산형 변경 태그 (S~M)
- **순수 함수** `src/lib/edit-filter.ts`: `checkEdit(before, after) → { block: string[], confirm: string[], hint: string[] }`.
  - confirm(한 번 더 확인): 가격이 직전 대비 ±50% 넘게 변함(11/18 리서치 아이디어 3), 본문이 절반 넘게 줄어듦.
  - block: 구매처 링크가 차단 도메인 목록(단축 URL 등, 상수)에 걸림.
  - hint(편집 안내): 가격을 바꿨는데 본문에 출처 URL 이 늘지 않음.
- **라우트**: `POST /api/items/[id]/edit` 에서 `confirm` 이 있는데 요청에 `confirmed: true` 가 없으면 422 와 항목 목록을 돌려준다. `block` 이면 422. 편집 폼은 422 를 받으면 체크박스("확인했습니다")를 보여 준다.
- **변경 태그**: `changeTags(prevSnapshot, snapshot, revertOfRevision)` → `가격 변경 | 대량 삭제 | 되돌리기 | 새 문서`. `/recent` 와 history 에 배지로 표시한다. 저장하지 않는다.
- **테스트**: `checkEdit`·`changeTags` 표 기반 테스트, edit 라우트 422 경로 1개.
- **위험**: 정당한 큰 가격 변동(단종·대폭 할인)을 막지 않도록 block 이 아니라 confirm 으로 둔다.

### W5 작은 것 묶음 (각 S, 남는 칸)
1. 편집 폼 임시 저장(localStorage, try/catch, 저장 성공하면 지움)
2. `/random`(+`?category=`) → 무작위 문서로 리다이렉트
3. 문서 정보 접기(`<details>`): 만든 날·만든 사람·리비전 수·편집자 수·역링크 수
4. `/recent?kind=create` 새 문서 필터
5. `/u/[id]` 기여 목록(최근 리비전 20개, 되돌려진 것은 표시)
6. 보호 중인 문서 목록(`/contribute` 안 한 칸)

## 7. W50 이후 (스키마 필요 → G 선행, 일요일 설계에서 다시 판단)
| 작업 | 스키마 | 규모 |
|---|---|---|
| 문서 이동·넘겨주기(`ItemAlias`) + 깨진 넘겨주기 점검 | 추가 | M |
| 문서 단위 주시(`ItemWatch`) + 생성·편집 시 자동 주시 | 추가 | M |
| 감사 표시(알림 종류 하나 추가, 신뢰도·점수와 무관) | C 의 `Notification` 재사용 | S |
| 편집 요청: 보호 문서에서 권한이 부족한 편집을 요청으로 받기 | 추가 | M |
| 출처 구조 S(`Item.sources`) + 각주 | 추가(W48 ⑤) | L |
| 문서 비교(같은 소분류 두 문서) · 링크 미리보기 카드 · 필드별 충돌 해결 | 없음 | 각 M |
| 위키링크 테이블(역링크 LIKE 대체, 문서 1만 개 넘을 때) | 추가 | S |

## 8. 원칙 점검
- ADR 0001: 역링크 수·조회수·토막 여부는 점수에 들어가지 않는다. W3·W5 화면에도 이렇게 적는다.
- ADR 0002: 상황 갤러리는 문서를 갖지 않는다. 기여할 거리의 분류 필터는 분류 갤러리 기준이다.
- 운영자 큐레이션 금지: 모든 목록은 규칙으로 계산하며, 기준 상수는 코드와 공개 페이지에 둔다.
- 보안: 위키링크 제목, `?rev`, `?from/to` 는 모두 검증한다(정수 범위, 80자, 인코딩). 리비전 스냅샷은 지금처럼 raw HTML 없이 렌더한다.

## 9. 연결
- 11/25(수) 리서치는 위키 주제다. 이 전수조사를 반복하지 말고 W1·W2·W4 의 **오픈소스 구현 사례**(리비전 diff 화면, 역링크 색인, 편집 필터 규칙 형식)를 찾게 한다. 리서치 스크립트 프롬프트는 바꾸지 않고, 그 세션이 `docs/README.md` 를 통해 이 문서를 읽는다.
- 안티: 콘텐츠에 `[[문서명]]` 링크를 쓸 때 W2 이후 빨간 링크로 보인다. 정확한 문서명만 쓰게 한다(`gemini-brief.md` 반영은 W2 가 끝난 뒤).
