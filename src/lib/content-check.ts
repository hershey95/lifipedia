/**
 * content/*.json 결정적 검사. 토큰 없이 잡을 수 있는 오류(출처 부족, 목록 페이지 URL,
 * 제품 간 URL 공유, 광고 문구, 잘못된 교차링크)만 본다. 가격·스펙의 사실 여부는 못 본다.
 */
import { slugify } from './slug';
import { TIERS } from './tier';

export type Issue = { level: 'error' | 'warn'; item?: string; msg: string };

const BANNED = ['최고', '1위', '압도', '완벽', '강력 추천', '필수템', '대박'];
/** 상품 상세가 아닌 브랜드/카테고리/목록/검색 페이지 */
const LIST_URL = /\/(brands|category|categories|list|search)(\/|\?|$)|\/c\/[^/]+\/?$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Json = Record<string, any>;

function normUrl(raw: unknown): string | null {
  try {
    const u = new URL(String(raw));
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function checkContent(data: unknown, galleries: string[]): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue['level'], msg: string, item?: string) => issues.push({ level, msg, item });
  const d = data as Json;

  if (!d || typeof d !== 'object' || !Array.isArray(d.items)) {
    return [{ level: 'error', msg: '최상위에 gallery 와 items 배열이 필요합니다' }];
  }
  if (!galleries.includes(d.gallery)) add('error', `알 수 없는 갤러리: ${JSON.stringify(d.gallery)}`);

  const slugs = new Set<string>();
  const urlUsers = new Map<string, Set<string>>(); // url -> 사용한 아이템
  const buyUsers = new Map<string, Set<string>>(); // purchaseLinks 전용

  for (const it of d.items as Json[]) {
    const name = typeof it.name === 'string' ? it.name.trim() : '';
    const tag = name || '(이름 없음)';
    if (!name) add('error', 'name 이 비어 있습니다', tag);
    else if (slugs.has(slugify(name))) add('error', '파일 안에 같은 이름의 아이템이 중복됩니다', tag);
    else slugs.add(slugify(name));

    if (!TIERS.includes(it.tier)) add('error', `tier 는 ${TIERS.join('/')} 중 하나여야 합니다`, tag);
    if (it.priceKrw !== null && !(Number.isInteger(it.priceKrw) && it.priceKrw > 0)) {
      add('error', 'priceKrw 는 양의 정수 또는 null 이어야 합니다', tag);
    }

    const text = `${it.description ?? ''}\n${it.recommendReason ?? ''}`;
    if (typeof it.description !== 'string' || it.description.length < 200) add('warn', 'description 이 200자 미만입니다', tag);
    const hit = BANNED.filter((w) => text.includes(w));
    if (hit.length) add('error', `광고성·근거 없는 표현: ${hit.join(', ')}`, tag);

    const links = [...String(it.description ?? '').matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1]);
    for (const l of links) if (!galleries.includes(l)) add('error', `존재하지 않는 교차링크 [[${l}]]`, tag);
    if (links.length > 2) add('warn', `교차링크가 ${links.length}개입니다 (0~2개 권장)`, tag);

    const sources: Json[] = Array.isArray(it.sources) ? it.sources : [];
    if (sources.length < 2) add('error', `출처가 ${sources.length}개입니다 (2개 이상 필요)`, tag);
    const use = (map: Map<string, Set<string>>, url: string) => map.set(url, (map.get(url) ?? new Set()).add(tag));
    for (const s of sources) {
      const u = normUrl(s?.url);
      if (!u) add('error', `출처 URL 이 올바르지 않습니다: ${s?.url}`, tag);
      else {
        if (LIST_URL.test(u)) add('error', `출처가 상품 상세가 아닌 목록/브랜드 페이지입니다: ${u}`, tag);
        use(urlUsers, u);
      }
      if (!DATE.test(String(s?.accessedAt))) add('error', `출처에 확인일(YYYY-MM-DD)이 없습니다: ${s?.url}`, tag);
    }
    // 선택 필드: 서술별 근거 인용문. 검증자가 "인용문이 실제 페이지에 있는가"만 대조하면 되게 한다.
    if (it.evidence !== undefined) {
      if (!Array.isArray(it.evidence)) add('error', 'evidence 는 배열이어야 합니다', tag);
      else {
        for (const e of it.evidence as Json[]) {
          const n = Number(e?.source);
          if (!String(e?.claim ?? '').trim() || !String(e?.quote ?? '').trim()) add('error', 'evidence 항목에는 claim 과 quote 가 모두 필요합니다', tag);
          if (!Number.isInteger(n) || n < 1 || n > sources.length) add('error', `evidence.source 는 1~${sources.length} 사이의 출처 번호여야 합니다`, tag);
        }
      }
    }
    for (const p of Array.isArray(it.purchaseLinks) ? it.purchaseLinks : []) {
      const u = normUrl(p?.url);
      if (!u) add('error', `purchaseLinks URL 이 올바르지 않습니다: ${p?.url}`, tag);
      else {
        if (LIST_URL.test(u)) add('error', `구매링크가 상품 상세가 아닌 목록/브랜드 페이지입니다: ${u}`, tag);
        use(urlUsers, u);
        use(buyUsers, u);
      }
    }
  }

  for (const [u, who] of buyUsers) {
    if (who.size > 1) add('error', `서로 다른 제품이 같은 구매링크를 씁니다: ${u} ← ${[...who].join(' / ')}`);
  }
  for (const [u, who] of urlUsers) {
    if (who.size > 1 && !(buyUsers.get(u)?.size! > 1)) {
      add('warn', `여러 제품이 같은 URL 을 출처로 씁니다(제품이 맞는지 확인): ${u} ← ${[...who].join(' / ')}`);
    }
  }

  const items = d.items as Json[];
  const brands = new Map<string, number>();
  for (const it of items) {
    const b = String(it.name ?? '').split(/\s+/)[0];
    if (b) brands.set(b, (brands.get(b) ?? 0) + 1);
  }
  const [topBrand, topN] = [...brands].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (items.length >= 4 && topN / items.length > 0.5) add('warn', `브랜드 쏠림: ${topBrand} ${topN}/${items.length}`);
  for (const t of TIERS) if (!items.some((it) => it.tier === t)) add('warn', `${t} 티어 아이템이 없습니다`);

  return issues;
}
