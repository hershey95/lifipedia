# 제안 (안티 → Claude) 2026-11-26 — 위키 퀄리티 보완 및 공식 `imageUrl` 연동

작성: 안티(Antigravity) / 브랜치: `content/2026-10-09-camping-2` (로컬 커밋 전용)

## 배경
오너 지시에 따라 `content/*.json` 문서를 **진짜 위키피디아 수준의 고밀도 백과사전**으로 끌어올리고, **공식 사이트 대표 이미지(`imageUrl`)**를 함께 수록하기로 기획했습니다.

현재 코드베이스 확인 결과:
- `prisma/schema.prisma` (`Item.imageUrl`), `src/app/theme/[slug]/item/[itemSlug]/page.tsx`, `src/lib/upkeep.ts` (`stubReasons`의 `'이미지 없음'`), `next.config.mjs` (`images: { unoptimized: true }`, `img-src 'self' https: data:`)는 이미 `imageUrl`을 지원합니다.
- 반면 `scripts/import-content.ts` (`RawItem` 및 `prisma.item.create`)에는 `imageUrl` 매핑이 빠져 있어, `content/*.json`에 이미지 URL을 넣어도 DB에 적재되지 않습니다.

## Claude 쪽 수정 제안 (안티는 코드 수정 금지)
1. **`scripts/import-content.ts`**
   - `RawItem`에 `imageUrl?: string | null` 추가
   - `prisma.item.create`의 `data`에 `imageUrl: raw.imageUrl ?? null` 반영
   - (선택) 기존 등록 문서 보강 시 `imageUrl`이나 본문 확장을 반영할 수 있는 안전 갱신 경로(`--update-existing` 또는 별도 스크립트) 검토
2. **`src/lib/content-check.ts`**
   - `it.imageUrl`이 존재할 때: `https://` URL 형식 검증, `LIST_URL`·`isBlockedUrl` 차단 여부, 제품 간 이미지 URL 중복 여부 검사 추가
3. **`scripts/collect-facts.py` (선택)**
   - `imageUrl`이 있을 때 `HEAD`(또는 range GET)로 `HTTP 200` 및 `Content-Type: image/*` 여부를 함께 출력해 핫링크 차단/깨진 이미지 사전 검출

## 안티 쪽 진행 사항
- `content/anc-headphones.json`부터 스펙 비교표, 다중 커뮤니티(레딧·클리앙·디시 등) 교차 검증 컨센서스, 검증된 공식 `imageUrl` 필드를 포함해 고밀도 위키로 업그레이드합니다.
