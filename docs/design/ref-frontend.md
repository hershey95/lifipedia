# 프론트엔드 설계: 레퍼런스 기반 개편 (Wikipedia·나무위키·Reddit·디시)
- 작성: Claude (2026-10-11, 코드 기준 `c0f4972`) / 상태: **초안 — 리뷰 대기**
- 범위: 화면·컴포넌트·라우트·캐시·디자인 토큰. API/스키마 변경은 "의존성"으로만 적고 상세 설계는 별도 문서로 넘긴다.
- 표기: 레퍼런스 서비스의 동작 중 이 문서 작성 때 직접 확인하지 않은 것은 **(일반 지식 기준)** 으로 표시했다.

---

## 0. 요약 (핵심 결정)
1. **제품 문서는 서버에서 마크다운으로 렌더한다.** 지금은 `## 개요` 같은 마크다운이 원문 그대로 보이고(`prose-wiki` = `whitespace-pre-wrap`), 문서 페이지에서는 `[[링크]]` 도 렌더되지 않는다. 목차·각주·출처 표시는 모두 이 렌더러 위에 올린다.
2. **`ink` 색 문제는 2단계로 고친다.** ① `tailwind.config.ts` 의 `ink` 값을 밝은 색으로 바꿔 77곳을 즉시 보이게 하고, ② 의미 토큰(`fg-muted`, `fg-subtle` 등)으로 치환한 뒤 `ink` 를 삭제한다. 회귀는 grep 가드 테스트와 대비 계산 테스트로 막는다.
3. **갤러리 URL 을 `/theme/[slug]` 하나로 합친다.** `/gallery/[slug]` 는 영구 리다이렉트한다. 탭·정렬·티어 필터는 `searchParams` 로 옮겨 서버 렌더·공유 가능한 URL 로 만든다.
4. **새 테이블 없이 만들 수 있는 것만 4주 안에 한다.** 최근 변경(EditHistory), 주시목록(ThemeFollow 재사용), 개념글(추천 수 임계값), 분류(Theme.category/parent)는 기존 데이터로 만든다. 편집 요청 큐는 보류한다.
5. **투표·팔로우는 `useOptimistic` 으로 즉시 반영하고 `router.refresh()` 를 없앤다.** 지금은 클릭마다 페이지 전체와 레이아웃 DB 조회가 다시 돈다.

---

## 1. 현재 화면 인벤토리와 레퍼런스 격차

### 1.1 라우트 인벤토리 (코드 확인)
| 라우트 | 파일 | 렌더 | 캐시 | 비고 |
|---|---|---|---|---|
| `/` | `app/page.tsx` | 서버 | `force-dynamic` | 허브 카드, 핫 갤러리 8, 급상승 6 (`computeMomentum` 을 위해 아이템 60개의 **투표 전체**를 읽음) |
| `/gallery/[slug]` | `app/gallery/[slug]/page.tsx` + `GalleryFeed`(client) | 서버→**전부 클라이언트** | `force-dynamic` | 티어별 아이템 **상한 없이** 3쿼리, 탭은 `useState` |
| `/theme/[slug]` | `app/theme/[slug]/page.tsx` | 서버 | (세션 읽음 → 동적) | 티어별 Top3, 팔로우, 승격 진행. `ink` 9곳 |
| `/theme/[slug]/[tier]` | `.../[tier]/page.tsx` | 서버 | 동적 | Top50, 지난달 1위 |
| `/theme/[slug]/item/[itemSlug]` | `.../item/[itemSlug]/page.tsx` | 서버 | 동적 | 문서. **마크다운·위키링크 미렌더**, 점수 사이드 카드 |
| `.../edit` | `ItemForm` + `MarkdownEditor`(client) | 클라이언트 폼 | 동적 | 충돌 시 필드명만 문자열로 표시 |
| `.../history` | 서버 | 동적 | 리비전별 unified diff `<pre>` |
| `.../talk` | `TalkThread`(client) | 동적 | 트리 3단, 접기 없음 |
| `/theme/[slug]/item/new` | `ItemForm` | 동적 | |
| `/themes`, `/themes/new` | 서버 | `force-dynamic` | 상태별(정식/제안/휴면) 목록 |
| `/search` | 서버 | `force-dynamic` | 테마 20 + 제품 30, `contains` + `mode: 'insensitive'` |
| `/rankings` | 서버 | `revalidate = 3600` | 월/연 아카이브 |
| `/me`, `/u/[id]` | 서버 | `force-dynamic` / 동적 | W42 구현. `c0f4972` 에서 다크 대비 수정 완료 |
| `/how-ranking-works`, `/signin` | 서버 | 정적/동적 | `ink` 9곳(산정식 페이지) |
| 레이아웃 | `app/layout.tsx` | 서버 | **요청마다 Prisma 조회**(사이드바) | 모든 페이지를 동적으로 만든다 |

**쓰이지 않는 컴포넌트(import 0건)**: `SearchBox`, `MindMapCanvas`, `FullScreenInteractiveUniverse`, `ThemeExplorer` (+ 이 둘만 쓰는 `MindMapDrawer`). 합계 약 1,600줄. 번들에는 안 들어가지만 유지보수 대상이다 → 삭제(5절 TD-13).

### 1.2 화면·컴포넌트별 격차표
상태: ● 있음 / ◐ 부분 / ○ 없음. 판정: **채택**(그대로), **변형**(우리 데이터·규모에 맞게 바꿔서), **비채택**.

| 영역 | 레퍼런스 기능 | 출처 | 현재 | 판정 | 이유 / 구현 메모 |
|---|---|---|---|---|---|
| 문서 | 상단 탭: 문서/토론/편집/역사 | Wikipedia | ◐ 헤더 메타줄의 링크 3개 | **채택** | `PageTabs` 서버 컴포넌트. 4개 라우트가 이미 있으니 탭만 만들면 된다 |
| 문서 | 목차(TOC) 사이드바 | Wikipedia | ○ | **변형** | 데스크톱은 우측 sticky, 모바일은 본문 위 `<details>` 접기(나무위키식). 2단계(h2/h3)까지만 |
| 문서 | 목차 접기 | 나무위키 (일반 지식 기준) | ○ | **채택** | 네이티브 `<details>`. JS 0 |
| 문서 | 인포박스(우측 요약 표) | Wikipedia | ◐ 점수 카드만 | **변형** | 이미지·티어·가격·가격 확인일·스펙 요약·점수를 한 상자에. 점수 상세(Wilson 등)는 접기 |
| 문서 | 각주 `[^1]` + 하단 목록 | Wikipedia | ○ | **채택** | GFM footnote 문법. 출처 신뢰 표시의 기반 |
| 문서 | 각주 호버 미리보기 | 나무위키 (일반 지식 기준) | ○ | **변형** | 데스크톱 hover+focus 팝오버, 모바일은 기본 앵커 이동(팝오버 없음) |
| 문서 | 하단 분류 바 | Wikipedia·나무위키 | ○ | **변형** | 분류 = 허브(`Theme.category`) › 갤러리 › 티어. 새 테이블 없음 |
| 문서 | "출처 필요" 표시 | Wikipedia | ○ | **변형** | 각주 0개면 문서 상단 배너 1개. 문단 단위 표시는 비채택(오탐·소음) |
| 문서 | 위키링크 호버 카드 | Wikipedia(Page Previews) | ◐ **가짜 고정 문구** | **변형** | 실제 요약을 주는 API 가 생기기 전까지는 카드 제거, 링크만 |
| 문서 | 문서 없음 → 빨간 링크 | Wikipedia | ○ (항상 `/gallery/slug` → 404 가능) | **채택** | `/wiki/[title]` 해석 라우트(2절). 없으면 "만들기" 안내 |
| 갤러리 | 정렬 탭 hot/new/top | Reddit | ○ (점수순 고정) | **채택** | `?sort=`. hot=`score`(이미 시간감쇠+Wilson), new=`createdAt`, top=`upCount` |
| 갤러리 | 개념글 탭 | 디시 (일반 지식 기준: 추천 수 기준 선별) | ○ | **변형** | `?best=1` = `upCount >= BEST_MIN_UP`(초기 5). 운영자 선정 없음 |
| 갤러리 | 말머리 필터 | 디시 | ○ | **변형** | 말머리 = 티어(저/중/고가). `?tier=budget` |
| 갤러리 | 밀도 높은 목록 테이블 | 디시 | ○ (큰 카드) | **채택** | 데스크톱: 번호·티어·제품명[댓글수]·가격·추천·수정일 테이블. 카드형은 Top1 3장만 유지 |
| 갤러리 | 피드 카드 + 세로 보트 | Reddit | ◐ 가로 버튼 | **비채택(세로)** | 우리는 "추천/비추천" 의미가 문서 평가라 가로 유지. 목록에서는 숫자만 보이고 버튼은 문서에서 |
| 갤러리 | 서브 사이드바(갤러리 소개·규칙·통계) | Reddit | ○ | **변형** | 우측 `GalleryAside`: 소개, 팔로워, 문서 수, 승격 진행, "순위 산정" 링크. 규칙은 비채택(아직 없음) |
| 갤러리 | 최근 변경 사이드 위젯 | 나무위키 (일반 지식 기준) | ◐ 갤러리 탭 안 diff 원문 | **변형** | 갤러리 우측에 최근 변경 5건(요약만), 전체는 `/recent?g=slug` |
| 전역 | 최근 변경 페이지 | Wikipedia·나무위키 | ○ | **채택** | `/recent`. 날짜별 그룹, 생성/편집 구분 |
| 전역 | 주시문서 | Wikipedia | ○ | **변형** | 팔로우한 갤러리의 최근 변경 = `/recent?scope=following`. 문서 단위 주시는 보류 |
| 토론 | 댓글 트리 접기 | Reddit | ◐ 트리만 | **채택** | `<details open>` 로 각 스레드 접기. 접힌 상태에 "답글 N개" |
| 편집 | 툴바·미리보기 | 나무위키 | ● | **변형** | 각주/출처 버튼, 단축키(Ctrl+B/I), 접근성 보강 |
| 편집 | 편집 충돌 해결 화면 | Wikipedia (일반 지식 기준: 두 텍스트 나란히) | ◐ 필드명만 에러 문구 | **변형** | 필드별 "내 것/최신/직접 고치기" 선택. API 409 응답에 최신 값 필요 |
| 편집 | 편집 요청(보호 문서) | Wikipedia·나무위키 | ○ | **비채택(보류)** | 지금은 보호 문서 개념이 없다. 누구나 편집 가능한 동안 큐는 쓰임새가 없다(열린 질문 Q6) |
| 모바일 | 하단 고정 글쓰기·목록 UX | 디시 모바일 (일반 지식 기준) | ○ | **변형** | 문서 페이지 하단 고정 바: 추천/비추천/편집/토론 |
| 모바일 | 검색 | 공통 | ○ (`hidden sm:block`) | **채택** | 헤더 검색 상시 노출(5절 TD-4) |

---

## 2. 정보 구조(IA)와 라우트 맵

### 2.1 IA
```
Lifipedia
├─ 홈 /                         허브 5 · 핫 갤러리 · 급상승 · (신규) 최근 변경 5
├─ 갤러리 /theme/[slug]          ← /gallery/[slug] 308 리다이렉트
│   ├─ ?tab=rank (기본)          티어별 Top1 카드 3 + 티어 Top3
│   ├─ ?tab=list&sort=hot|new|top&tier=budget|mid|premium&best=1
│   ├─ ?tab=talk                 갤러리 내 최근 토론 (기존 COMMUNITY 탭)
│   ├─ /[tier]                   티어 순위 Top50 (유지)
│   ├─ /item/new                 문서 만들기
│   └─ /item/[itemSlug]          제품 문서
│        ├─ (탭) 문서 | 토론 /talk | 편집 /edit | 역사 /history
├─ 분류 /themes?category=…       허브(카테고리)별 갤러리 목록 (기존 /themes 에 필터만 추가)
├─ 최근 변경 /recent             ?g=slug · ?scope=following · ?kind=create|edit
├─ 위키링크 해석 /wiki/[title]   → 갤러리 / 문서 / 검색 결과로 redirect
├─ 순위 아카이브 /rankings
├─ 검색 /search
├─ 마이 /me · 프로필 /u/[id]
└─ 산정식 /how-ranking-works · 로그인 /signin
```

### 2.2 라우트 맵 (현재 + 추가)
| 라우트 | 상태 | 서버 데이터 | 클라이언트 섬(island) | 캐시 전략 | Suspense/스트리밍 |
|---|---|---|---|---|---|
| `layout.tsx` | 개편 | 사이드바 갤러리 목록 | `Sidebar` → 서버 컴포넌트 + `<details>` 로 전환, `AuthButton` | `unstable_cache(fn, ['sidebar'], { revalidate: 300, tags: ['themes'] })`. 테마 생성·승격 라우트에서 `revalidateTag('themes')` | 없음(작음) |
| `/` | 개편 | 허브, 핫 갤러리, 급상승, 최근 변경 5 | 없음 | `force-dynamic` 제거 → `revalidate = 60`. 급상승 계산은 `unstable_cache` 300초 | 급상승·최근 변경을 각각 `<Suspense>` |
| `/theme/[slug]` | **통합** | 테마, 티어 Top, 목록(탭별), 최근 변경 5 | `FollowButton`, `VoteButtons`(목록에는 안 둠) | 세션(팔로우 여부) 때문에 동적 유지. 목록 쿼리는 `take: 50` + 커서 | 탭 본문 `<Suspense fallback={<ListSkeleton/>}>`, `loading.tsx` 추가 |
| `/gallery/[slug]` | 리다이렉트 | — | — | `permanentRedirect('/theme/' + slug)` | — |
| `/theme/[slug]/[tier]` | 유지 | Top50, 지난달 1위 | 없음 | 세션 안 읽음 → `revalidate = 300` 가능 | 없음 |
| `/theme/[slug]/item/[itemSlug]` | **개편** | 문서, 마크다운 AST→TOC, 분류, 점수 | `VoteButtons`, `FootnotePopover`(1개, 이벤트 위임), `ReportButton` | 내 투표(`myVote`) 때문에 동적. 렌더 비용 큰 마크다운은 `unstable_cache([item.id, item.revision])` | 본문은 즉시, "같은 갤러리 다른 티어 1위" 박스만 `<Suspense>` |
| `.../edit` | 개편 | 문서 현재값 + `revision` | `ItemForm`, `MarkdownEditor`, `ConflictResolver` | 동적, `robots: noindex` 유지 | 없음 |
| `.../history` | 개편 | 리비전 목록(페이지 30) | 없음 | 동적 → `revalidate = 60` 가능(세션 안 읽음) | 없음 |
| `.../talk` | 개편 | 댓글 트리 | `TalkThread`(폼만 클라이언트로 축소) | 동적 | 없음 |
| `/recent` | **신규** | EditHistory + Item 생성, 50건 커서 | 없음 (`scope=following` 일 때만 세션) | 공개 뷰 `revalidate = 30`, following 뷰는 동적 | 날짜 그룹 목록 1개 `<Suspense>` |
| `/wiki/[title]` | **신규** | Theme(slug/name) → Item(name) 순으로 조회 | 없음 | 동적(결과는 redirect) | — |
| `/themes?category=` | 개편 | 필터 추가 | 없음 | `force-dynamic` → `revalidate = 300` | — |
| `/search` | 유지(+모바일 폼) | 동일 | 검색 폼 | 동적 | — |
| 편집 요청 큐 | **보류** | (스키마 필요) | — | — | — |

**규칙**
- 세션을 읽는 페이지(`currentUser()`)는 어차피 동적이다. 거기서 `force-dynamic` 을 새로 붙이지 않는다. 세션을 안 읽는 목록 페이지는 `revalidate` 로 옮긴다.
- 클라이언트 컴포넌트에는 **버튼·폼·팝오버만** 둔다. 목록·본문·위키링크는 서버 컴포넌트다(현재 `GalleryFeed`·`WikiTextRenderer` 가 통째로 클라이언트인 것을 되돌린다).
- 날짜 표시는 서버에서 `toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 로만 한다. 클라이언트 컴포넌트 안의 `toLocaleString()`(현재 `GalleryFeed`)은 서버(UTC 컨테이너)와 브라우저(KST) 결과가 달라 하이드레이션 불일치가 난다.

### 2.3 의존하는 백엔드 변경 (이 문서 범위 밖, 순서만 고정)
| # | 변경 | 필요한 화면 | 주차 |
|---|---|---|---|
| B1 | `EditHistory @@index([createdAt])` | `/recent` | 4주차 |
| B2 | 편집 409 응답에 `current: ItemSnapshot`, `currentRevision` 추가 | 충돌 해결 UX | 4주차 |
| B3 | `GET /api/items/[id]/vote` 없이도 되도록, 문서 페이지는 서버에서 `myVote` 를 계속 넘김 (변경 없음) | — | — |
| B4 | `revalidateTag('themes')` 를 테마 생성·승격·휴면 처리 지점에 추가 | 레이아웃 캐시 | 3주차 |

---

## 3. 핵심 화면 와이어프레임

### ① 제품 문서 페이지 (데스크톱 ≥1024px)
```
┌ Header ─────────────────────────────────────────────────────────────────────┐
│ [r/] Lifipedia   [ 검색…                         ]   갤러리  산정식   [마이] │
└─────────────────────────────────────────────────────────────────────────────┘
 캠핑·차박 갤러리 › 저가                                    ← 브레드크럼(분류와 동일 경로)
┌─────────────────────────────────────────────────────────────────────────────┐
│ 헬리녹스 체어원 클래식                       [저가]       [▲ 추천 12][▼ 3]  │
│ ┌──────┬──────┬──────┬──────────┐                          [편집] [신고]     │
│ │ 문서 │ 토론 4│ 편집 │ 역사 r7  │   ← PageTabs, aria-current="page"        │
│ └──────┴──────┴──────┴──────────┘                                            │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ ⚠ 이 문서에는 출처(각주)가 없습니다. [출처 추가]│ ┌ Infobox ───────────────┐ │
│   (각주 0개일 때만)                            │ │   [ 제품 이미지 16:9 ]  │ │
│                                               │ │ 티어   저가             │ │
│ ┌ 목차 [접기] ─────────┐                      │ │ 가격   73,990원         │ │
│ │ 1 개요               │  ← 모바일/좁은 폭은  │ │        (2026-10-09 확인)│ │
│ │ 2 특징               │    여기, 데스크톱은  │ │ 무게   0.89kg  ← specSummary│
│ │ 3 장점 / 4 단점      │    우측 sticky       │ │ 점수   41.2  (참여 15명)│ │
│ └──────────────────────┘                      │ │ ▸ 점수 상세 (details)   │ │
│                                               │ │ 구매 링크: 다나와 ↗     │ │
│ ## 1. 개요                                    │ └─────────────────────────┘ │
│ 접어서 작은 원통형으로 수납되는 초경량…[1]    │ ┌ 목차 (sticky, lg 이상) ┐ │
│                                               │ │ 1 개요  2 특징  …       │ │
│ ## 2. 특징                                    │ └─────────────────────────┘ │
│ - 무게는 약 0.89kg … [2]                      │ [광고 item-side]            │
│   ┌ 각주 팝오버(hover/focus) ───────────────┐ │                             │
│   │ [2] helinox.co.kr · 2026-10-09 접속     │ │                             │
│   │     공식 · "Weight 890g"                │ │                             │
│   └──────────────────────────────────────────┘ │                             │
│ ## 추천 이유 / ## 스펙 요약  (기존 필드 섹션) │                             │
│                                               │                             │
│ ── 각주 ──────────────────────────────────    │                             │
│ 1. ↑ costco.co.kr … (쇼핑몰)                  │                             │
│ 2. ↑ helinox.co.kr … (공식)                   │                             │
│                                               │                             │
│ 출처 2개 · 공식 1 · 쇼핑몰 1 · 마지막 편집 r7 (10/11, 홍길동)               │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ 분류: 취미/아웃도어 › 캠핑·차박 갤러리 › 저가          ← CategoryBar        │
│ 이 갤러리 다른 티어 1위: [중가] 콜맨 …  [고가] 헬리녹스 선체어 …  (Suspense)│
└─────────────────────────────────────────────────────────────────────────────┘
```
- 출처 신뢰 표시: 각주 URL 의 도메인을 `SOURCE_KIND` 상수 표(공식/쇼핑몰/리뷰/커뮤니티/기타)로 분류해 라벨만 붙인다. 점수화는 하지 않는다(Q4).
- `[[위키링크]]` 는 본문 안에서 `/wiki/[title]` 로 가는 일반 링크. 대상이 없으면 회색 점선 밑줄 + `title="아직 없는 문서"`(빨간 링크 대응). 존재 여부는 렌더 시 1쿼리로 배치 조회한다.

### ② 갤러리 피드 (`/theme/[slug]?tab=list`)
```
┌ GalleryHeader ──────────────────────────────────────────────────────────────┐
│ 캠핑·차박 갤러리  [정식]  #취미/아웃도어          [팔로우 · 128] [+ 문서 작성]│
│ 캠핑·차박 장비를 가격대별로…                                                │
│ [순위] [목록] [토론]                       ← 탭 = <Link>, ?tab=             │
├─────────────────────────────────────────────────────────────┬───────────────┤
│ 정렬: (hot) new top   │ 말머리: [전체][저가][중가][고가]  [★ 개념글]       │ GalleryAside  │
├─────┬──────┬──────────────────────────────┬────────┬────┬─────┤ 소개·통계     │
│ 번호│ 티어 │ 제품명                        │ 가격   │추천│ 수정 │ 팔로워 128    │
├─────┼──────┼──────────────────────────────┼────────┼────┼─────┤ 문서 42       │
│  1  │ 저가 │ 헬리녹스 체어원 [4] ★         │ 73,990 │ 12 │10/11│ ───────────── │
│  2  │ 중가 │ 콜맨 컴팩트 폴딩 [1]          │129,000 │  9 │10/10│ 최근 변경     │
│  3  │ 고가 │ 헬리녹스 선체어 [0]           │259,000 │  7 │10/09│ · r7 헬리녹스…│
│ …   │      │ ([n] = 토론 수, ★ = 개념글)   │        │    │     │ · 새 문서 콜맨│
├─────┴──────┴──────────────────────────────┴────────┴────┴─────┤ [전체 보기→]  │
│                         [더 보기]  ← ?cursor=                 │               │
└───────────────────────────────────────────────────────────────┴───────────────┘
```
- `?tab=rank`(기본)는 지금의 Top1 카드 3장 + 티어별 Top3 를 그대로 쓴다(디자인만 토큰화).
- 목록 행 전체가 링크가 아니라 **제품명만 링크**(행 클릭 JS 금지, 키보드 탭 순서 단순화).
- 투표 버튼은 목록에서 뺀다. 숫자만 보인다. 이유: 행마다 클라이언트 컴포넌트 50개 + 문서를 읽지 않은 투표 유도.
- 정렬 정의(서버, `src/lib/feed.ts` 순수 함수 `parseFeedParams(searchParams) → { sort, tier, best, cursor }`):

| sort | orderBy | 비고 |
|---|---|---|
| `hot`(기본) | `score desc, id desc` | `score` 는 이미 반감기 감쇠 + Wilson. 새 공식 만들지 않음 |
| `new` | `createdAt desc, id desc` | |
| `top` | `upCount desc, id desc` | 누적 추천. 기간 필터(`t=`)는 보류 |
| `best=1` | 위 정렬 + `where upCount >= BEST_MIN_UP` | 상수 `BEST_MIN_UP = 5`, `ranking.ts` 의 `RANKING_CONSTANTS` 옆에 둔다 |

### ③ 최근 변경 (`/recent`)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 최근 변경                                                                    │
│ [전체] [팔로우한 갤러리]   종류: [모두][새 문서][편집]   갤러리: [전체 ▾]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▾ 2026-10-11 (일)                                                            │
│  19:58  편집  헬리녹스 체어원  r7   캠핑·차박   홍길동   "무게 출처 추가"   │
│               (역사)(차이)                                                   │
│  18:10  새문서 콜맨 컴팩트 폴딩 r1  캠핑·차박   김철수                       │
│ ▾ 2026-10-10 (토)                                                            │
│  23:01  편집  …                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                              [이전 50건]                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```
- 데이터: `editHistory.findMany({ orderBy: [{createdAt:'desc'},{id:'desc'}], take: 50, where: { item: { isRemoved: false, theme: g ? { slug: g } : undefined } } })`. revision 1 = 새 문서(생성 라우트가 r1 이력을 만든다는 W42 문서 4.4 확인 사항 재사용), 그래서 Item 테이블을 따로 합칠 필요가 없다.
- `scope=following`: `theme: { followers: { some: { userId } } }`. 비로그인이면 `/signin?callbackUrl=/recent?scope=following`.
- "(차이)"는 `/theme/…/history#r7` 앵커. 별도 diff 페이지는 만들지 않는다.
- 날짜 그룹 헤더는 `<h2>`, 각 행은 `<li>` 안의 `<time dateTime>`.

### ④ 편집 화면 (`.../edit`)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 헬리녹스 체어원 › 편집          (문서 | 토론 | [편집] | 역사)                │
│ 리비전 r7 기준. 저장 사이 다른 편집이 있으면 필드 단위로 병합합니다.        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 제품명 [______________________]   가격대 [저가 ▾]   대표 가격 [73990] 원   │
│                                                                              │
│ 제품 위키 설명 *                                 [작성 | 미리보기] [템플릿]  │
│ ┌ 툴바 ──────────────────────────────────────────────────────────────────┐  │
│ │ B  I  H2  H3 │ • 목록  표  인용 │ [[링크]]  [^각주]  🔗출처추가        │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ ## 개요                                                               │    │
│ │ 접어서 … 수납됩니다.[^1]                                              │    │
│ │                                                                        │    │
│ │ [^1]: https://helinox.co.kr/… (2026-10-09 접속) "Weight 890g"         │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│ 출처 1개 · 각주 없는 단락 2개                         1,240 / 20,000자     │
│                                                                              │
│ ┌ 출처 추가 (dialog) ────────────────────┐                                  │
│ │ URL      [https://…            ]        │  → 커서 위치에 [^n] 삽입,        │
│ │ 인용(선택)[                    ]        │    본문 끝에 [^n]: URL (접속일)  │
│ │ 접속일   [2026-10-11] (기본 오늘)       │    정의 줄 추가                  │
│ │                     [취소] [삽입]       │                                  │
│ └─────────────────────────────────────────┘                                  │
│ 추천 이유 / 스펙 요약 / 이미지 / 구매 링크 (기존과 동일)                     │
│ 편집 요약 [무게 출처 추가______________]                                    │
│ [저장]                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘

충돌(409) 시 — 폼 위에 ConflictResolver 가 열린다 (role="alert" 로 알림, 포커스 이동)
┌ ⚠ 다른 사용자가 r8 을 먼저 저장했습니다. 겹친 항목 2개를 골라 주세요. ─────┐
│ ── description ───────────────────────────────────────────────────────────── │
│ ┌ 내 편집 ────────────────────┐ ┌ 최신 r8 ───────────────────────┐          │
│ │ …890g[^1]                    │ │ …0.89kg (공식)[^1]             │          │
│ └──────────────────────────────┘ └────────────────────────────────┘          │
│ ( ) 내 것 사용   ( ) 최신 사용   (•) 직접 합치기 → 아래 편집기에 최신 값 로드 │
│ ── priceKrw ────  내 73,990  /  최신 69,900   ( ) 내 것 (•) 최신             │
│                                           [선택대로 다시 저장 (기준 r8)]     │
└───────────────────────────────────────────────────────────────────────────────┘
```
- 다시 저장할 때 `baseRevision = currentRevision` 으로 보낸다. 고르지 않은 필드는 내 값이 유지된다.
- 필드 비교는 텍스트 2단 나란히 보기만 한다. 줄 단위 diff 하이라이트는 `diff` 패키지가 이미 있으므로 `diffLines` 로 추가/삭제 줄 색만 칠한다(새 의존성 없음).
- "각주 없는 단락 N개"는 미리보기와 같은 파서로 계산한다(`countUncitedParagraphs(md)` 순수 함수).

### ⑤ 모바일 (375px) — 제품 문서
```
┌───────────────────────────────────┐
│[r/] [검색…              ] [마이]  │ ← 워드마크 숨김, 검색 상시
├───────────────────────────────────┤  (사이드바는 lg 미만에서 숨김,
│ 캠핑·차박 › 저가                  │   헤더 우측 대신 /themes 링크)
│ 헬리녹스 체어원 클래식 [저가]     │
│ 문서 | 토론4 | 편집 | 역사  →     │ ← 가로 스크롤 탭, 스크롤바 숨김 X
├───────────────────────────────────┤
│ ┌ Infobox (본문 위, 접힘 아님) ─┐ │
│ │ [이미지]                       │ │
│ │ 73,990원 · 점수 41.2 · 15명    │ │
│ │ ▸ 스펙·점수 상세               │ │ ← <details>
│ └────────────────────────────────┘ │
│ ▸ 목차 (4)                        │ ← <details>, 기본 닫힘
│                                   │
│ ## 개요                           │
│ 접어서 … 수납됩니다.[1]           │ ← 탭하면 #fn-1 로 이동(팝오버 없음)
│ …                                 │
│ 각주 / 분류 / 다른 티어 1위       │
│                                   │
├───────────────────────────────────┤
│ [▲ 12] [▼ 3]   [편집]  [토론 4]   │ ← 하단 고정 바(position: sticky bottom:0)
└───────────────────────────────────┘    safe-area: padding-bottom env(safe-area-inset-bottom)
```
- 갤러리 목록(②)은 375px 에서 테이블 대신 2줄 행: `1. 헬리녹스 체어원 [4] ★` / `저가 · 73,990원 · 추천 12 · 10/11`. 같은 `<li>` 마크업에 `sm:grid` 로 열 배치만 바꾼다(마크업 2벌 금지).
- 터치 타깃 최소 44×44px(탭, 정렬 칩, 하단 바 버튼).

---

## 4. 컴포넌트 설계

### 4.1 신규·개편 목록과 props 계약
S = 반나절 이하, M = 1~2일, L = 3일+. RSC = 서버 컴포넌트, CC = `'use client'`.

| 컴포넌트 | 종류 | 신규/개편 | Props (TypeScript) | 크기 |
|---|---|---|---|---|
| `WikiMarkdown` | RSC | 신규 (`WikiTextRenderer` 대체) | `{ source: string; existingTitles?: Set<string>; idPrefix?: string }` | M |
| `extractToc` / `countUncitedParagraphs` / `toWikiHref` | 순수 함수 `src/lib/markdown.ts` | 신규 | `(md: string) => { id: string; text: string; depth: 2 \| 3 }[]` / `(md) => number` / `(title) => string` | S |
| `Toc` | RSC | 신규 | `{ items: TocItem[]; variant: 'inline' \| 'sidebar' }` — inline 은 `<details>`, sidebar 는 `<nav aria-label="목차">` | S |
| `Infobox` | RSC | 신규 | `{ item: { name; tier: Tier; priceKrw: number \| null; priceCheckedAt?: Date \| null; imageUrl: string \| null; specSummary: string \| null; purchaseLinks: {label;url}[] }; breakdown: ScoreBreakdown }` | M |
| `PageTabs` | RSC | 신규 | `{ base: string; active: 'doc' \| 'talk' \| 'edit' \| 'history'; counts: { talk: number; revision: number } }` | S |
| `CategoryBar` | RSC | 신규 | `{ hub: string \| null; theme: { slug: string; name: string }; tier: Tier }` | S |
| `SourceSummary` | RSC | 신규 | `{ footnotes: { n: number; url: string }[] }` → "출처 N개 · 공식 a · 쇼핑몰 b", 0개면 경고 배너 | S |
| `FootnotePopover` | CC | 신규 | `{ containerId: string }` — 컨테이너에 이벤트 위임(`pointerover`/`focusin`), 페이지당 1개 | M |
| `GalleryHeader` | RSC | `GalleryFeed` 분해 | `{ theme: ThemeSummary; following: boolean; threshold: number; tab: GalleryTab }` | S |
| `FeedControls` | RSC | 신규 | `{ base: string; params: FeedParams }` — 전부 `<Link>`(+`aria-current`) | S |
| `FeedList` | RSC | 신규 | `{ themeSlug: string; rows: FeedRow[]; nextCursor: string \| null }` | M |
| `FeedRow` 타입 | — | 신규 | `{ id; slug; name; tier: Tier; priceKrw: number \| null; upCount: number; commentCount: number; updatedAt: Date; isBest: boolean }` | — |
| `GalleryAside` | RSC | 신규 | `{ theme: ThemeSummary; itemCount: number; recent: RecentEntry[] }` | S |
| `RecentChangesList` | RSC | 신규 | `{ entries: RecentEntry[]; groupByDay?: boolean }` | M |
| `RecentEntry` 타입 | `src/lib/recent.ts` | 신규 | `{ id; at: Date; kind: 'create' \| 'edit'; revision: number; summary: string \| null; item: { name; slug }; theme: { name; slug }; editor: { id: string; name: string \| null } \| null }` | — |
| `VoteButtons` | CC | 개편 | 기존 `{ itemId; initialUp; initialDown; initialMyVote; disabled? }` + `compact?: boolean` | M |
| `FollowButton` | CC | 개편 | 기존 그대로(호출부 버그 수정이 핵심) | S |
| `MarkdownEditor` | CC | 개편 | 기존 + `id: string`(label 연결용), 툴바에 `[^각주]`, `출처 추가` | M |
| `SourceDialog` | CC | 신규 | `{ open: boolean; onClose(): void; onInsert(src: { url: string; quote?: string; accessed: string }): void }` — 네이티브 `<dialog>` | S |
| `ConflictResolver` | CC | 신규 | `{ fields: EditableField[]; mine: ItemSnapshot; latest: ItemSnapshot; latestRevision: number; onResolve(merged: Partial<ItemSnapshot>, baseRevision: number): void }` | L |
| `TalkThread` | CC → RSC+CC | 개편 | 트리 렌더는 RSC, `CommentForm` 만 CC. 각 스레드 `<details open>` | M |
| `Sidebar` | CC → RSC | 개편 | `{ groups }` 동일. `useState` 아코디언 → `<details open>` | S |
| `Header` | CC | 개편 | 변경 없음. 검색 폼 상시 노출 | S |

**`WikiMarkdown` 구현 결정**
- `react-markdown` + `remark-gfm`(표·각주·취소선) 을 **서버 컴포넌트에서만** 쓴다. 문서 페이지의 클라이언트 번들 증가는 0이다. 편집 미리보기는 같은 컴포넌트를 클라이언트에서 import 하므로 `/edit` 번들만 커진다(예산 4.4).
- raw HTML 은 렌더하지 않는다(`react-markdown` 기본값, `rehype-raw` 금지). XSS 방어선.
- `[[제목]]` 은 파싱 전에 `[제목](/wiki/<encodeURIComponent(제목)>)` 로 바꾼다(정규식 1줄, `toWikiHref`). 코드 블록 안은 제외한다.
- 제목 앵커 id 는 `extractToc` 가 만든 것과 같은 규칙(`slugify` 재사용 + 중복 시 `-2`)을 써서 TOC 와 어긋나지 않게 한다.
- 대안: 직접 파서. 비채택 — 표·각주·중첩 목록을 직접 구현하면 버그 표면이 크다.

### 4.2 상태 관리
| 상태 | 위치 | 방식 |
|---|---|---|
| 문서·목록·순위·최근 변경 | 서버 | RSC 에서 Prisma 직접 조회. 클라이언트 fetch 없음 |
| 탭·정렬·필터·페이지 | URL | `searchParams`. `useState` 탭 금지(공유·뒤로가기·SSR 깨짐) |
| 투표 | 클라이언트 낙관적 | 아래 |
| 팔로우 | 클라이언트 낙관적 | 투표와 같은 패턴. 성공 응답의 `followerCount` 로 확정, `justPromoted` 일 때만 `router.refresh()`(상태칩·작성 버튼이 바뀌므로) |
| 편집 폼 | 클라이언트 로컬 | `useState`. 떠날 때 경고: 값이 바뀌었으면 `beforeunload` |
| 각주 팝오버 열림 | 클라이언트 로컬 | 페이지당 1개 상태 |

**투표 낙관적 업데이트 (React 19)**
```ts
// src/lib/vote-state.ts — 순수 함수, Vitest 로 테스트
export type VoteState = { up: number; down: number; mine: 'UP' | 'DOWN' | null };
export function applyVote(s: VoteState, type: 'UP' | 'DOWN'): VoteState
// 없음 → 생성, 같은 방향 재클릭 → 취소(삭제), 반대 방향 → 전환. `api/items/[id]/vote/route.ts` 의 규칙(같은 type 이면 delete)과 동일하게.
```
- `VoteButtons`: `const [optimistic, add] = useOptimistic(state, applyVote)` → 클릭 시 `startTransition(async () => { add(type); const r = await fetch(...); r.ok ? setState(fromServer(r)) : setError(...) })`. 실패하면 트랜지션 종료와 함께 자동 롤백된다.
- `router.refresh()` 제거. 점수 숫자는 다음 방문 때 갱신된다(점수 재계산은 서버 몫, 즉시 반영 요구 없음).
- 버튼은 pending 중에도 `disabled` 대신 `aria-busy` 만 둔다. 연타 방지는 pending 중 클릭 무시로 한다.

### 4.3 접근성 요구
| 대상 | 요구 |
|---|---|
| 전역 | 본문 첫 요소에 "본문 바로가기" 링크(`#main`, 포커스 시만 보임). `<main id="main">`. 포커스 링 `focus-visible:ring-2 ring-accent` 을 `.btn`·`.chip` 링크·탭에 공통 적용 |
| 색 | 본문 텍스트 대비 ≥ 4.5:1, 큰 글씨·아이콘 ≥ 3:1. 토큰 표(5.1)에서 계산값 고정, 테스트로 보장 |
| 탭(`PageTabs`, 갤러리 탭, 정렬) | 페이지 이동이므로 `role="tablist"` 를 쓰지 않는다. `<nav aria-label>` + `<a aria-current="page">` |
| TOC | `<nav aria-label="목차">`. 모바일 `<details><summary>목차 (4)</summary>` |
| 각주 | 본문 참조 `<sup><a href="#fn-1" id="fnref-1" aria-describedby="footnote-label">` (remark-gfm 기본 마크업 유지). 팝오버는 `focusin` 에도 열리고 `Esc` 로 닫힘, `role="tooltip"` + 참조에 `aria-describedby` 동적 연결. 하단 목록의 "↑" 는 `aria-label="본문으로 돌아가기"` |
| 위키링크 | 실제 `<a>`. 없는 문서는 `aria-label="{제목} (아직 없는 문서)"` |
| 투표 | `aria-pressed`(이미 있음) 유지. 숫자 변경은 `aria-live="polite"` 로 "추천 13" 읽기. 이모지·▲▼ 는 `aria-hidden` |
| 다이얼로그(`SourceDialog`, 위키링크 도우미) | 네이티브 `<dialog>` + `showModal()` → 포커스 가두기·`Esc` 닫기가 기본 제공. 닫으면 여는 버튼으로 포커스 복귀. 지금 위키링크 모달(`div fixed`)도 같은 방식으로 교체 |
| 편집기 툴바 | 각 버튼 `aria-label`("굵게 (Ctrl+B)"), `title` 만 쓰지 않는다. `MarkdownEditor` 의 `<label>` 을 `htmlFor={id}` 로 textarea 와 연결. 래퍼의 `select-none` 제거(미리보기 텍스트 선택 불가 문제) |
| 충돌 해결 | 열릴 때 `role="alert"` 요약 + 제목으로 포커스 이동. 각 필드 선택은 `<fieldset><legend>{필드명}</legend>` + 라디오 |
| 댓글 트리 | `<details>` 의 `<summary>` 에 "답글 N개 접기/펼치기" |
| 모바일 하단 바 | 본문 마지막 요소가 가려지지 않도록 `main` 에 하단 패딩 |

### 4.4 성능 예산
| 지표 | 목표 | 측정 |
|---|---|---|
| First Load JS (문서·갤러리·최근 변경) | ≤ 130 kB gzip | `npm run build` 출력의 라우트별 "First Load JS". 주차 종료마다 표에 기록 |
| First Load JS (`/edit`) | ≤ 200 kB gzip | 미리보기용 마크다운 렌더러 포함 |
| LCP (모바일, 4G 느림 프로파일) | ≤ 2.5 s (문서 페이지) | Chrome DevTools Lighthouse(모바일). 문서 이미지는 `priority` + `sizes="(min-width:1024px) 300px, 100vw"` |
| CLS | ≤ 0.1 | 인포박스 이미지 `aspect-[16/9]` 고정(이미 있음), 광고 슬롯 `min-h` 고정(이미 있음) |
| 서버 쿼리 | 문서 페이지 ≤ 5쿼리, 갤러리 목록 ≤ 4쿼리 | 개발 중 Prisma `log: ['query']` 로 한 번 확인 |
| 홈 투표 로딩 | 아이템 60개의 투표 전체 로딩을 캐시(300초) 뒤로 숨긴다 | 지금은 요청마다 실행 |

- `backdrop-blur` 가 `.card` 에 기본으로 걸려 있다. 목록 행 50개에 블러가 걸리면 저사양 모바일에서 스크롤이 버벅인다(일반 지식 기준). 목록 행에는 `.card` 대신 테두리만 쓰는 `.row` 를 둔다.

---

## 5. 기술 부채

### 5.1 디자인 토큰 도입 (TD-1 ~ TD-3 해결의 기반)
**문제 (코드 확인)**
- 배경은 `#0b0f19`(`globals.css` body)인데 `ink = #12131a`(`tailwind.config.ts`)를 글자색으로 쓰는 `text-ink/NN` 이 **21개 파일 77곳**이다(`grep -rEo '[a-z:]*-ink(/[0-9]+)?' src | wc -l`, `c0f4972` 기준. 요청서의 "약 97곳"은 이전 시점 수치로 보인다. `/me`·`/u/[id]` 는 `c0f4972` 에서 이미 `text-slate-400` 등으로 바뀜). 많은 곳: `theme/[slug]`(9), `[tier]`(9), `how-ranking-works`(9), `themes`(7), `search`(6), `rankings`(6), 문서(5).
- 라이트 테마 잔재: `border-black/5·10·15`, `bg-black/5·10·[0.02~0.04]` 약 16곳(어두운 배경에서 안 보임. `bg-black/30` 이상 오버레이는 의도된 것이라 제외), `text-red-600` 4곳(대비 부족).
- `TierBadge` 의 `text-premium`(#9c36b5)은 `#0b0f19` 위 대비 3.29:1 로 AA 미달. `accent`(#3b5bdb) 링크 글자도 3.38:1 로 미달.
- 색이 `bg-[#0b0f19]`, `bg-[#070b14]`, `bg-[#0f172a]`, `slate-*`, `white/NN` 으로 흩어져 있다.

**토큰 정의** — CSS 변수 + Tailwind 매핑. 다크 단일 테마(라이트 모드는 Q3).
```css
/* globals.css :root */
--bg: 11 15 25;          /* #0b0f19 */
--surface: 255 255 255;  /* 사용: bg-surface/[0.03] */
--fg: 226 232 240;       /* #e2e8f0 본문 */
--fg-muted: 203 213 225; /* #cbd5e1 보조 본문 */
--fg-subtle: 148 163 184;/* #94a3b8 메타·캡션 (최소 텍스트 색) */
--border: 255 255 255;   /* 사용: border-border/10 */
--danger: 248 113 113;   /* #f87171 */
--tier-budget: 74 222 128;   /* 다크용 밝은 값 */
--tier-mid: 251 191 36;
--tier-premium: 216 180 254;
```
```ts
// tailwind.config.ts colors
bg: 'rgb(var(--bg) / <alpha-value>)', fg: { DEFAULT: 'rgb(var(--fg) / <alpha-value>)', muted: …, subtle: … },
surface: …, border: …, danger: …, budget: 'rgb(var(--tier-budget) / <alpha-value>)', mid: …, premium: …, accent: '#3b5bdb' (유지)
```
| 토큰 | 값 | `#0b0f19` 대비(계산) | 용도 |
|---|---|---|---|
| `fg` | #e2e8f0 | 15.5:1 | 본문·제목 |
| `fg-muted` | #cbd5e1 | 12.9:1 | 설명문 |
| `fg-subtle` | #94a3b8 | 7.5:1 | 메타·캡션. **이보다 어두운 글자색 금지** (`slate-500` #64748b 4.0:1 은 미달) |
| `danger` | #f87171 | 6.9:1 | 오류 문구 (현 `text-red-600` 은 4.0:1) |
| `premium`(신) | #d8b4fe | 10.8:1 | 고가 배지 글자 |
| `accent` | #3b5bdb | 3.4:1 | **링크 본문 색으로는 미달** → 링크 기본색을 `#748ffc`(6.5:1)로, `accent` 는 버튼 배경 전용 |

(대비 값은 WCAG 2.x 상대휘도 식으로 계산했다(2026-10-11, node 1회 계산). 기존 `budget` #2f9e44 5.6:1, `mid` #f08c00 7.7:1 은 통과라 값 유지 가능.)

**이행 순서**
1. **즉시 (1줄)**: `tailwind.config.ts` 의 `ink: '#12131a'` → `ink: '#e2e8f0'`. 77곳이 한 번에 보이게 된다. 단, 혼합 결과 `text-ink/30`(2.4:1)·`/40`(3.3:1)·`/45`(3.9:1)는 아직 AA 미달이고 `/50` 은 4.57:1 로 겨우 통과한다 → 2단계로 해소.
2. **치환 (codemod, sed 1회)**: `text-ink/(30|35|40|45|50|55)` → `text-fg-subtle`, `text-ink/(60|65|70|75)` → `text-fg-muted`, `text-ink` → `text-fg`, `border-black/(5|10|15)` → `border-border/10`, `bg-black/(5|10|\[0\.0[234]\])` → `bg-surface/[0.04]`, `text-red-600` → `text-danger`. 치환 후 `ink`·`paper` 를 config 에서 삭제(`paper` 는 사용처 0건).
3. **가드 테스트** (`tests/design-tokens.test.ts`, node 환경 그대로):
   - `src/**/*.tsx` 를 읽어 `/-ink\b|-black\/(5|10|15)\b|text-red-600|text-slate-500/` 이 0건인지 확인.
   - 토큰 쌍(`fg-subtle` on `bg` 등)의 대비를 계산해 ≥ 4.5 인지 확인(대비 함수 10줄, 의존성 없음).
4. **흩어진 하드코딩 색**: `bg-[#070b14]`(헤더), `bg-[#0f172a]`(팝오버) 등은 해당 컴포넌트를 개편하는 주에 토큰으로 바꾼다(한 번에 하지 않음).

### 5.2 부채 목록
| # | 문제 (코드 근거) | 영향 | 해결 | 주차 |
|---|---|---|---|---|
| TD-1 | `text-ink/NN` 77곳 (5.1) | 글자 안 보임 | 5.1 이행 1~3 | 1 |
| TD-2 | 라이트 잔재 `border/bg-black/*` 16곳, `text-red-600` 4곳 | 경계·오류 안 보임 | 5.1 이행 2 | 1 |
| TD-3 | 고가 배지·`accent` 링크 대비 미달 | 가독성 | 토큰 값 교체 | 1 |
| TD-4 | `Header.tsx` 검색 폼 `hidden sm:block` → 모바일에서 검색 진입점 없음 | 모바일 핵심 동선 단절 | `hidden sm:block` 삭제, 폼에 `min-w-0 flex-1`, placeholder "검색", 워드마크 `<span className="hidden sm:inline">Lifipedia</span>`, `aria-label="사이트 검색"`, `role="search"`. 별도 모바일 검색 화면은 만들지 않음 | 1 |
| TD-5 | 레이아웃 `Sidebar` 가 `w-full lg:w-64` 로 **모바일에서 본문 위에 전부 펼쳐져 나옴** | 375px 첫 화면이 사이드바로 가득 | `hidden lg:block`. 모바일은 헤더에 "갤러리" 링크(`/themes`) | 1 |
| TD-6 | 문서 페이지가 마크다운을 원문 표시(`<p className="prose-wiki">`), `[[링크]]` 미렌더 | 문서 품질 체감 최하 | `WikiMarkdown`(4.1) | 2 |
| TD-7 | `WikiTextRenderer`: 항상 `/gallery/slugify(name)` 로 연결(제품명이면 404), 호버 카드 문구가 고정 가짜, 마우스 전용, 모든 설명 텍스트를 클라이언트 컴포넌트로 만듦 | 잘못된 링크·접근성·번들 | `/wiki/[title]` 해석 라우트 + 서버 렌더. 가짜 카드 삭제 | 2 |
| TD-8 | `GalleryFeed`: `FollowButton initialFollowing={false}`·`threshold={20}` 하드코딩, `VoteButtons initialMyVote={null}` | 팔로우 중인 사람에게 "팔로우"가 보이고 누르면 **언팔로우됨**, 내 투표 표시 틀림 | 서버에서 following·`promotionThreshold()` 를 넘김. 목록에서는 투표 버튼 제거(②) | 1 (버그만), 3 (개편) |
| TD-9 | `GalleryFeed` 티어별 아이템 쿼리 상한 없음, 탭이 `useState`, 클라이언트에서 `toLocaleString()` | 갤러리 커질수록 느려짐, 하이드레이션 불일치 | `take: 50` + 커서, `?tab=`, 서버 날짜 포맷 | 1 (상한·날짜), 3 |
| TD-10 | `/gallery/[slug]` 와 `/theme/[slug]` 중복 (사이드바·홈·위키링크는 `/gallery`, 검색·테마목록·canonical 은 `/theme`) | SEO 분산, 기능 차이(팔로우 상태 등) | `/theme/[slug]` 로 통합, `/gallery` 는 `permanentRedirect` | 3 |
| TD-11 | 레이아웃이 요청마다 Prisma 조회 | 모든 페이지 TTFB +1쿼리, 정적화 불가 | `unstable_cache` + `revalidateTag('themes')` | 3 |
| TD-12 | `VoteButtons`·`FollowButton` 이 응답 대기 후 반영 + `router.refresh()` | 클릭 지연, 페이지·레이아웃 재조회 | 4.2 낙관적 업데이트 | 3 |
| TD-13 | 미사용 컴포넌트 5개(약 1,600줄) | 혼란, 검색 노이즈 | 삭제 (git 이력에 남음) | 1 |
| TD-14 | `MarkdownEditor`: 래퍼 `select-none`, `<label>` 미연결, 위키링크 모달이 `div`(포커스 가두기·Esc 없음) | 접근성 | 4.3 | 4 |
| TD-15 | 제목·탭에 이모지를 텍스트로 넣음(🏆, 📜 …) — 스크린리더가 읽음 | 접근성 소음 | 장식 이모지 `<span aria-hidden>` 로 감싸기. 개편하는 화면부터 | 2~3 |
| TD-16 | 검색이 `mode: 'insensitive'`(Postgres 전용 옵션). 이 작업 폴더의 `schema.prisma` 는 `sqlite`, `docker-compose` 는 Postgres | 로컬 sqlite 에서 검색 동작 **미확인** | 프론트 범위 밖. 로컬 검색 1회 확인 후 별도 이슈로 | 확인만 |

---

## 6. 4주 로드맵
주차 표기는 W42(/me 구현 주) 다음부터. 매일 `npm run typecheck && npm test`, 주 마지막 날 `npm run build` + First Load JS 기록.

| 주차 | 묶음 | 작업 (크기) | 의존성 | 완료 정의 |
|---|---|---|---|---|
| **1주 (W43)** 기반·부채 | 토큰·가독성 | `ink` 값 교체(S) → codemod 치환(S) → 토큰 CSS 변수·Tailwind 매핑(S) → 가드·대비 테스트(S) | 없음 | `grep -rE '\-ink\b' src` 0건, 테스트 통과, 375/1280px 에서 모든 라우트 글자 보임(스크린샷 6장 첨부) |
| | 모바일 | 헤더 검색 상시 노출(S), 사이드바 `hidden lg:block` + 헤더 "갤러리" 링크(S) | 없음 | 375px 에서 검색 입력·제출 가능, 첫 화면에 페이지 제목이 보임 |
| | 버그 | `GalleryFeed` 팔로우/임계값/myVote(S), 아이템 `take: 50`(S), 서버 날짜 포맷(S), 미사용 컴포넌트 삭제(S) | 없음 | 팔로우 중인 계정으로 갤러리 열면 "팔로우 중", 콘솔 하이드레이션 경고 0 |
| **2주 (W44)** 문서 페이지 | 렌더러 | `react-markdown`·`remark-gfm` 추가(S), `src/lib/markdown.ts`(`extractToc`, `toWikiHref`, `countUncitedParagraphs`) + 테스트(M), `WikiMarkdown`(M) | 1주 토큰 | 시드 문서의 `## 개요` 가 제목으로, 표가 표로 보임. raw HTML(`<script>`) 이 문자로 출력됨 |
| | 레이아웃 | `PageTabs`·`Toc`·`Infobox`·`CategoryBar`·`SourceSummary`(M), `FootnotePopover`(M), 모바일 하단 바(S) | 렌더러 | ③④ 제외 와이어프레임 ① ⑤ 와 일치. 키보드만으로 각주 팝오버 열고 닫기 가능 |
| | 위키링크 | `/wiki/[title]` 해석 라우트(S), 없는 문서 표시(S), 기존 `WikiTextRenderer` 삭제(S) | 렌더러 | `[[캠핑·차박 갤러리]]`→갤러리, `[[헬리녹스 체어원 클래식]]`→문서, 없는 제목→검색+만들기 안내 |
| **3주 (W45)** 갤러리 | 통합 | `/gallery/[slug]` → `/theme/[slug]` 리다이렉트, 사이드바·홈 링크 교체(M) | 2주(문서 탭과 같은 탭 패턴) | 옛 URL 이 308, 내부 링크에 `/gallery/` 0건 |
| | 피드 | `parseFeedParams` + 테스트(S), `FeedControls`·`FeedList`·`GalleryAside`(M), 개념글 `BEST_MIN_UP`(S), 커서 페이지(S), `loading.tsx`(S) | 통합 | hot/new/top·티어·개념글 조합이 URL 로 공유되고 뒤로가기로 복원 |
| | 상호작용·캐시 | `applyVote` + 테스트(S), `VoteButtons`/`FollowButton` `useOptimistic`(M), 레이아웃 `unstable_cache` + `revalidateTag`(S, B4) | B4 | 투표 클릭 후 숫자가 즉시 바뀜, 네트워크 탭에 RSC refresh 요청 없음 |
| **4주 (W46)** 최근 변경·편집 | 최근 변경 | B1 인덱스(S), `src/lib/recent.ts` + `/recent`(M), `scope=following`(S), 홈·갤러리 위젯(S) | B1 | ③ 와이어프레임과 일치, 50건 커서 동작 |
| | 편집 UX | 툴바 각주/출처 버튼 + `SourceDialog`(M), 에디터 접근성(TD-14)(S), B2 + `ConflictResolver`(L) | B2 | 두 브라우저로 같은 필드 동시 편집 → 충돌 화면에서 선택 후 저장 성공, 다른 필드는 자동 병합 문구 |
| | 회귀 | Playwright 스크린샷 도입(Q5 결정 시)(M) | — | 아래 시각 회귀 절차 1회 통과 |

### 6.1 테스트 전략
- **기본 방침: 컴포넌트 테스트(jsdom + Testing Library)는 도입하지 않는다.** 지금 Vitest 는 `environment: 'node'`, `tests/**/*.test.ts` 로 순수 함수·라우트 위주다. 화면 로직을 순수 함수로 빼서 같은 방식으로 테스트한다:
  - `markdown.ts`: TOC 추출(중복 제목 id `-2`), `[[ ]]` 변환(코드 블록 제외), 각주 없는 단락 수.
  - `feed.ts`: `parseFeedParams`(잘못된 값 → 기본값, `tier=xxx` 무시, 커서 디코드 실패 → null).
  - `vote-state.ts`: `applyVote` 의 신규/전환/취소 3경우.
  - `recent.ts`: 날짜 그룹(Asia/Seoul 자정 경계).
  - `design-tokens.test.ts`: 금지 클래스 grep + 대비 계산.
- 클라이언트 컴포넌트에 남는 로직은 위 함수 호출뿐이도록 유지한다. 그래도 버그가 반복되는 컴포넌트가 생기면 그때 jsdom 을 그 파일에만 켠다(`// @vitest-environment jsdom`).
- **E2E/시각 회귀**: Q5 참고. 추천안은 4주차에 `@playwright/test` 를 devDependency 로 추가해 아래 6장면만 스크린샷 비교(`toHaveScreenshot`, 허용 오차 0.2%):
  1. `/` 1280px 2. `/theme/<시드>` 목록 탭 1280px 3. 문서 1280px 4. 문서 375px 5. `/recent` 375px 6. 편집 + 충돌 화면 1280px
  - 시드 DB(`npm run db:seed`) + `TZ=Asia/Seoul` 고정, 애니메이션 끄기(`reducedMotion: 'reduce'`). CI 는 아직 없으므로 로컬 실행 + 기준 이미지 커밋.
- **도입 전(1~3주) 시각 확인**: 주 마지막 날 위 6장면을 DevTools 기기 모드(375×812, 1280×800)로 캡처해 PR/보고서에 붙인다. UX 검토자(`docs/agents/ux-reviewer.md`)의 375px·대비 항목으로 1회 검토.

---

## 7. 열린 질문 (추천안 포함)
| # | 질문 | 추천안 | 이유 |
|---|---|---|---|
| Q1 | 갤러리 정식 URL 을 `/theme/[slug]` 와 `/gallery/[slug]` 중 무엇으로? | **`/theme/[slug]`** | canonical·sitemap·문서 경로가 이미 `/theme` 아래다. `/gallery` 를 고르면 문서 URL 까지 바꿔야 한다. 표시 문구는 "갤러리"를 그대로 써도 된다 |
| Q2 | 마크다운 렌더러로 의존성 2개(`react-markdown`, `remark-gfm`)를 추가해도 되나? | **추가** | 서버 컴포넌트에서만 쓰여 문서 페이지 JS 는 늘지 않는다. 직접 파서는 표·각주·중첩 목록에서 버그가 난다 |
| Q3 | 라이트 모드를 지원하나? | **이번 4주는 안 함** | 토큰을 CSS 변수로 만들어 두면 나중에 `:root[data-theme=light]` 값만 추가하면 된다 |
| Q4 | 출처 "신뢰도"를 점수로 매길까, 종류 라벨만 붙일까? | **라벨만**(공식/쇼핑몰/리뷰/커뮤니티/기타) | 점수는 기준 논쟁과 조작 유인이 생긴다. BACKLOG 의 `facts:[{sentence, source, quote}]` 구조 전환 때 다시 본다 |
| Q5 | 시각 회귀용 Playwright 를 도입하나? | **4주차에 6장면만** | 새 devDependency 1개, 브라우저 바이너리 설치 필요. 그 전까지는 수동 캡처로 충분 |
| Q6 | 편집 요청 큐(보호 문서)를 만들까? | **보류** | 지금은 로그인 사용자 누구나 편집 가능해 큐가 쓸 데가 없다. 반달 피해가 관찰되면 "문서 보호(신뢰도 n 이상만 편집)" + `EditRequest` 테이블을 함께 설계한다 |
| Q7 | 개념글 기준 `BEST_MIN_UP = 5` 가 맞나? | **5로 시작, 갤러리 규모와 무관한 고정값** | 갤러리별 동적 임계값은 근거 데이터가 없다. 4주 뒤 개념글 비율이 갤러리 문서의 5~15% 범위인지 보고 조정 |
