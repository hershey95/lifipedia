# Stage 9: Implementation Readiness 보고 (DetailedRange 153-278행)

검토자: egm-implementation-readiness(코드·참조 문서 미열람), egm-codebase-details(코드 대조), egm-style(문체). 모두 새 컨텍스트. 설계서는 수정하지 않았다.
판정: **구현 준비 미달.** 새 구현자가 문서만으로 W3·W4·W5·R-1·R-2·C·`useOptimistic` 을 첫 시도에 만들 수 있는 것은 없다. 단, 준비도 검토자는 코드를 열지 않았고 코드 검토자가 일부를 코드로 반박·보강했다. 둘이 어긋나는 곳은 코드 검토자의 확인을 우선했다.

## 작업별 시작 가능 여부
| 작업 | 시작 가능 | 막는 항목 |
|---|---|---|
| R-1 | 불가 | IR-M4, IR-B1 |
| R-2 | 부분적 | IR-M5, CD-3·CD-4 |
| W3 | 불가 | IR-M1, CD-9·CD-10 |
| W4 | 불가 | IR-B2, IR-M2, CD-6·CD-7 |
| W5 | 불가 | IR-M3, CD-11 |
| C | 불가 | IR-B3, CD-5 |
| `useOptimistic` | 불가 | IR-B3 |

## Blocker
- **IR-B1 (175-198, 256-274행)** 작업별 변경 파일 경로(수정/신규/삭제 구분, 테스트 파일 포함)가 없다. 확정된 경로는 `src/lib/upkeep.ts`(175)·`src/lib/edit-filter.ts`(183)뿐이다. 새 라우트(`/contribute`, `/random`, `/notifications`, `/api/notifications`)와 테스트 경로를 표로 적어야 한다. 코드 검토자도 같은 지적을 Major 로 냈다(CD-13).
- **IR-B2 (233, 240 대 182-190행)** W4 본문은 규칙 형식을 이미 확정했는데 240행은 11/25 리서치 결과를 쓴다고 한다. 구현자는 본문대로 해도 되는지, 리서치 결과가 나오면 설계를 바꿔야 하는지 알 수 없다. 리서치 산출물 경로와, 없을 때의 기본값(본문이 기본, 리서치는 항목만 조정)이 필요하다.
- **IR-B3 (273-274행)** C 와 `useOptimistic` 이 "W45 설계서 5절 그대로", "W48 설계서 9절 4" 위임뿐이다. 라우트 경로·메서드, `notify.ts` 시그니처, 수신자 정의, cron 라우트, `applyVote(state, type)` 의 `state` 모양(같은 타입 재클릭 취소, 추천↔비추천 전환 계산, 가중치 표시, 401 처리, 팔로우 포함 여부: ROADMAP 62행은 "투표·팔로우"인데 274행은 투표 3종)이 없다.

## Major
- **IR-M1 (175-180행) W3** 목록 정의·질의가 비어 있다. 3.1·3.2절이 ③으로 둔 Orphaned·동명 문서 링크·추적 분류 대체가 176행에 없다. "리비전 1개" 집계, "90일 미편집" 기준 필드, "나가는 링크 없음" 대상 조건, `countWanted` 의 반환·정렬·집계 단위·trim·필터, `?category=` 의 대·중 분류 하위 포함과 캐시 키, `stubReasons` 입력 타입과 `## 출처` 판정, 배너 문구·`?rev=` 숨김, 기준 상수 공개 위치(214행)가 없다. 테스트는 두 함수뿐이고 필터·20개 제한은 검증되지 않는다. 전 문서 스캔과 역링크 LIKE 가 합쳐지면 O(n²) 인데 한계 표기가 없다.
- **IR-M2 / CD-7 (183-190행) W4** `checkEdit` 입력 필드(가격 `priceKrw`, 본문 `description` 등)·±50% 경계(이전 가격 null/0)·짧은 문서 하한이 없다. **차단 도메인 목록 내용이 없다**(단축 URL 등만). 서브도메인·대소문자 규칙, 기존 링크 vs 이번에 새로 추가된 링크 구분이 없다. hint 전달 경로가 없다(422 만 정의). 422 본문 모양, `confirmed` 검증, 호출 순서(409·20자·403 과의 앞뒤), 되돌리기 라우트는 대상이 아님을 명시해야 한다. 코드: `edit/route.ts:15-27` zod 에 `confirmed` 가 없어 모르는 키는 조용히 버려지므로 스키마에 추가해야 하고, `before` 는 `resolveEdit` 이후 `current` 와 `resolution.merged` 중 무엇인지 정해야 한다. 422 는 `fail(422, msg, extra)`(`api.ts:8`)로 표현되므로 `api.ts` 수정은 필요 없다.
- **IR-M3 / CD-11 (192-198행) W5** 여섯 항목이 한 줄 요약이라 결정이 구현자에게 넘어간다(임시 저장 키·복원, `/random` 선택·제외·0건, 문서 정보 편집자 수·익명화, `kind=create` 검증, 기여 목록 "되돌려진 것" 판정, 보호 중인 문서 목록 비용). 코드: 보호 수준은 문서마다 `loadProtection` 3개 쿼리가 돌고 `rankTier` 가 가격대 전체 표를 읽으므로(`protection-service.ts:20-43`) 전체 문서에 돌리면 N+1 이다. 일괄 쿼리를 새로 만들지 정해야 한다. W5 전체에 테스트 지정이 없다.
- **IR-M4 (261-263행) R-1** 세 필드 이름이 지정되지 않았다(169행은 `description` 만). 역링크는 정확히 `[[이름]]`을 LIKE 로 찾는데 테스트는 `[[ A ]]` 를 허용해 공백 링크가 누락된다. 263행 "`%`/`_` 처리는 구현할 때 확인"은 결정을 구현자에게 넘긴다(테스트 케이스로 옮긴다). "`missing=1` 판정을 `findFirst` 정확 일치로 분리"는 무엇에서 분리하는지, 이미 있는 문서일 때의 화면이 무엇인지 불명확하다. `테마`→`분류 갤러리` 2곳의 파일·줄이 없고 코드 식별자를 건드릴 위험이 있다. `canEditAt` 과 161행 자격(기여 5건·최근 10개 리비전)의 관계·안내 문구, `min-w-0` 적용 파일이 없다. 답신 1~6 과 261행 항목 8개가 1:1 로 대응하지 않는다.
- **IR-M5 / CD-3·CD-4 (265-270행) R-2** 코드 확인 결과 설계서가 지목한 위치가 틀렸다. `idSet` 변수는 없고(`comments.ts:88` 은 `ids`) `buildCommentTree` 는 이미 그룹핑 키를 null 로 올린다(`comments.ts:91`). 실제 결함은 노드의 `parentId` 가 바뀌지 않아 `talk/page.tsx:43-45,79` 가 평탄화해 넘기면 `TalkThread.tsx:29-34` 가 원본 `parentId` 로 다시 그룹핑해 고아 댓글이 `byParent.get(null)` 에서 빠지는 것이다. 고칠 위치는 `talk/page.tsx:79` 매핑 또는 `TalkThread` 그룹핑이고, 테스트는 `TalkThread` 경로를 지나거나 `buildCommentTree` 의 `parentId` 덮어쓰기 단위 테스트여야 한다. `updateMany` 판정은 현재 `vote/route.ts:64-68` 이 한 번의 `update` 로 tally 와 `conceptAt` 을 함께 쓰는 구조라, 별도 `updateMany` 의 호출 조건·순서·조회 위치(`route.ts:31-37` 은 트랜잭션 밖)·`becameConcept` 출처가 정해져 있지 않다. 동시 판정 테스트는 모킹으로 경합을 재현할 수 없어 실제 SQLite 테스트 DB 여부를 지정해야 한다. 토글 문구와 정렬·커서 유지 방식이 없다. "토론 탭"이 어떤 모델을 읽는지 용어(개념글·토론)와 맞는지는 이 검토에서 확인하지 못했다.
- **IR-M6 / ST-1~3 (154-156, 244-254행)** 154행 "작업별 설계는 그대로 유효"가 R-1·10.1 #3 과 어긋나고, 156행의 11-18 원안 순서·"하루 2개, 최대 8칸"·"새 컬럼은 S 하나뿐"이 10절과 충돌한다. 156행의 `build` 실패는 11-18 기준이라고 밝혀야 한다. 10.3 의 "G 됐을 때" 열은 수요일에 C 전체를 하루에 마감한다. 단계별 빌드 가능 체크포인트와 검증 명령(테스트 러너·타입 검사)이 없고, G 전에 무엇으로 통과를 판단하는지 적혀 있지 않다.
- **CD-1 (240행) 사실 오류** "edit 라우트 테스트를 이때 처음 만든다"는 틀렸다. `tests/protection.test.ts:63-113` 에 edit·revert 라우트의 prisma·auth·protection 모킹 하네스와 `POST` 직접 호출 케이스가 이미 있다. W4 422 테스트는 이를 재사용한다.
- **CD-2 (162행)** "이미 있는 revert 경계"는 보호 단계 403 케이스(`protection.test.ts:93-112`)뿐이다. 자격·최근 10개·409 는 덮지 않는다.
- **CD-5 (273행, 187-189행) C** `Notification` 에 `@@unique([userId, kind, refId])` 가 이미 있어 중복 방지가 DB 로 된다(239행의 conceptAt 원자화 선행 설명은 이 제약을 무시). 다만 스키마 provider 가 sqlite(`schema.prisma:9`)이므로 `createMany` 의 `skipDuplicates` 지원 여부는 구현 전에 확인해야 한다(검토자도 미확인). 미지원이면 P2002 가 투표 트랜잭션을 롤백하고 `handleError`(`api.ts:16-18`)가 409 로 바꿔 투표가 실패한다. 중복 시 처리(upsert·사전 조회·개별 try/catch)를 정해야 한다.
- **CD-6 (188행) `changeTags`** `changeKind`(`recent.ts:5`)가 이미 `create`·`revert` 를 계산하므로 `changeTags` 는 이를 호출하고 가격 변경·대량 삭제만 더해야 한다. `/recent` 가 읽는 컬럼에는 `snapshot` 이 없다(`recent/page.tsx:36-40`). 이미 저장된 `EditHistory.diff`(`schema.prisma:259`)와 `diffDelta` 로 계산하면 스냅샷 조회가 필요 없다. 방식을 정해야 한다.
- **CD-8 (229행, 10.1 #3)** `?rev=` 스냅샷 URL 점검은 이미 구현되어 있다. `item/[itemSlug]/page.tsx:78-83` 이 `httpUrl.safeParse` 로 `imageUrl`·`purchaseLinks` 를 거르고 `revert/route.ts:67-72` 도 같다. 남는 일은 차단 도메인을 `?rev=` 화면에도 적용할지 한 가지다. 또 `httpUrl`(`api.ts:40`)은 스킴만 검증하고 도메인 목록이 없으므로 "같은 상수를 쓴다"는 표현은 부정확하고 차단 도메인 검사는 새 함수다. W4 본문에 이 작업이 없다(IR-M2 와 같은 지적).
- **CD-9 (176행)** "P3 `buildBestItems` 쪽 쿼리 재사용"은 사실과 다르다. `buildBestItems`(`situation.ts:118`)는 쿼리 없는 순수 함수다. "답변 없는 추천 요청" 조건은 `theme/[slug]/page.tsx:105` 의 `comments: { none: ... }` 에 있다. 재사용 위치와 공용 함수 추출 여부를 적어야 한다.
- **CD-10 (176행)** "90일 미편집"을 `Item.updatedAt`(`@updatedAt`, `schema.prisma:236`)으로 계산하면 투표 캐시 갱신으로 바뀔 수 있다(투표 라우트 전체는 미확인). 기준은 `EditHistory` 최신 `createdAt` 이어야 한다.
- **ST-4~9 (문체)** 완료된 W1·W2 가 계획처럼 "지금 …"으로 쓰이고 상태 표기가 없다. 약어 R·G·C·S·K·D 가 범위 안에서 정의되지 않고 S 가 규모와 출처 구조 두 뜻이다("칸"도 두 뜻). 187행 "편집 폼은 422 를 받으면 체크박스를 보여 준다"가 block 일 때도 체크박스를 보여 주는 것처럼 읽힌다(응답 키로 구분해야 하며, "항목 목록"의 "항목"은 GLOSSARY `_Avoid_`). 184행 "11/18 리서치 아이디어 3" 출처 경로가 없다. 212행은 ADR 0001(조회수)을 역링크·토막 여부까지 넓혀 인용하고 W5 3번(195행)에는 그 문구가 없다. 7절 제목(200행)이 "스키마 필요"인데 205·208행은 스키마 불필요이고 200행의 "일요일 설계에서 다시 판단"은 10.6(277행)이 이미 확정해 낡았다.

## Nit
- 262행 공백 트림 테스트는 코드가 이미 트림하므로(`markdown.ts:65`) 결함 수정이 아니라 회귀 방지 테스트다(CD).
- 267행 `FEED_DEFAULTS`(`feed.ts:5`)에 `best: false` 추가와 `tests/feed.test.ts` 갱신이 필요하다. `parseFeedParams` 의 `one()` 은 문자열만 받으므로 `one(sp.best) === '1'` 로 쓴다(CD).
- 205행 "알림 종류 하나 추가"는 `NotificationKind` enum 변경이라 `schema.prisma` 수정과 `db:push` 가 필요하다. "스키마 없음"이 아니다(CD). 9행의 분류와도 이중으로 어긋난다.
- 267행 `best=1` 은 GLOSSARY 의 "베스트" 용법과 충돌하고 176행 `buildBestItems` 와 이름이 겹친다. `concept=1` 권고(IR-N1).
- 214·212행의 "공개 페이지에 기준 상수" 중 W4 의 규칙 공개 페이지(3.6절 112행)가 작업에 없다(IR-N3). 422 가 block·confirm 모두에 쓰인다는 구분(IR-N4). 삭제 문서의 `?rev=`·revert API 도 404 인지(IR-N5).
- 문체: 162행 "거꾸면"(오기), 163행 "아주", 171행 80자 제한이 명세가 아니라 테스트 줄에만 있음, 172행 접근성 근거로 `title` 에 의존(터치·키보드에서 노출 불안정, 점선 밑줄은 유지), 176행 `unstable_cache(300)` 단위, 169행 `ponytail:` 설명 없음, 180행 "이 커밋에서 함", 228·231·232행 구어체("집는다", "부딪친다", "사람 10분짜리 일"), 188행 "배지"는 GLOSSARY 배지(신뢰도 이름표)와 혼동, 219행 "안티" 미정의, 273·274행 참조 문서 경로 없음.
- 유지(KEEP): 156행 `P2021` 안내, 178행 "점수와 분리", 190행 W4 위험의 block 대신 confirm 선택, 214행 규칙 계산 원칙.
- 코드와 일치 확인된 것: `buildDiff`(`wiki.ts:37`), `conceptAt`·인덱스(`schema.prisma:311,315`), `Notification`(`schema.prisma:338`), `changeKind`, `httpUrl`, `canEditAt`, `parseRevRange`, `extractWikiLinks`, `wikiLinksToMarkdown`, `buildBestItems`, `findBacklinks`, `parseFeedParams`, `feedHref`, edit·revert 라우트의 `loadProtection`·`canEditAt` 호출. 아직 없는 것(`upkeep.ts`, `notify.ts`, `edit-filter.ts`, `FeedParams.best`, `/notifications`, `/random`, `/contribute`)은 설계서가 새로 만든다고 한 것이라 결함이 아니다.
