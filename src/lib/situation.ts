/**
 * 상황 페이지의 인기순 분류 카드 + 분류 시드(content/taxonomy.json) 검증 (순수 함수, prisma 를 import 하지 않는다).
 * 설계: docs/design/2026-W47-taxonomy-situation.md 2·3·4절
 */
import { POPULARITY_RULES, popularity, sortByPopularity } from './popularity';
import { categoryPath } from './taxonomy';

type Cat = { id: string; slug: string; name: string; parentId: string | null; followerCount: number };

export type SituationCard = {
  id: string;
  slug: string;
  name: string;
  pathNames: string[];
  itemCount: number;
  score: number;
  followerCount: number;
  topItem: { name: string; slug: string; themeSlug: string } | null;
};

export function buildSituationCards(input: {
  cats: Cat[];
  linkedIds: string[];
  items: { id: string; themeId: string; name: string; slug: string; score: number }[];
  votes: { themeId: string; weight: number; createdAt: Date }[];
  edits: { themeId: string; createdAt: Date }[];
  comments: { themeId: string; createdAt: Date }[];
  asOf: Date;
}): SituationCard[] {
  const { cats, items, votes, edits, comments, asOf } = input;
  const byId = new Map(cats.map((c) => [c.id, c]));
  const since = asOf.getTime() - POPULARITY_RULES.WINDOW_DAYS * 86_400_000;
  const inWindow = (d: Date) => d.getTime() >= since && d.getTime() <= asOf.getTime();

  // 카드 하나가 덮는 분류 = 자기 + 모든 하위(리프가 문서를 가진다)
  const subtree = (rootId: string) => {
    const ids = new Set([rootId]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const c of cats) {
        if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    return ids;
  };

  const rows = input.linkedIds.flatMap((id) => {
    const cat = byId.get(id);
    if (!cat) return [];
    const ids = subtree(id);
    const mine = items.filter((i) => ids.has(i.themeId));
    const top = [...mine].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[0];
    const score = popularity(
      {
        votes: votes.filter((v) => ids.has(v.themeId)),
        editCount: edits.filter((e) => ids.has(e.themeId) && inWindow(e.createdAt)).length,
        commentCount: comments.filter((c) => ids.has(c.themeId) && inWindow(c.createdAt)).length,
      },
      asOf,
    );
    return [
      {
        id,
        slug: cat.slug,
        name: cat.name,
        pathNames: (categoryPath(id, cats) ?? [id]).map((p) => byId.get(p)?.name ?? p),
        itemCount: mine.length,
        score,
        followerCount: cat.followerCount,
        topItem: top ? { name: top.name, slug: top.slug, themeSlug: byId.get(top.themeId)?.slug ?? cat.slug } : null,
      },
    ];
  });
  return sortByPopularity(rows);
}

export type TaxonomySeed = {
  categories: { slug: string; name: string; parent: string | null }[];
  situations: { slug: string; name: string; categories: string[] }[];
};

/** content/taxonomy.json 검증. 던지지 않고 오류 문장 목록을 돌려준다(content:check 확장 때 그대로 붙인다). */
export function parseTaxonomySeed(raw: unknown): { seed: TaxonomySeed | null; errors: string[] } {
  const r = raw as Partial<TaxonomySeed> | null;
  if (!r || !Array.isArray(r.categories) || !Array.isArray(r.situations)) {
    return { seed: null, errors: ['categories·situations 배열이 필요합니다'] };
  }
  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const c of r.categories) {
    if (!c?.slug || !c?.name) errors.push(`분류에 slug·name 이 없습니다: ${JSON.stringify(c)}`);
    else if (slugs.has(c.slug)) errors.push(`분류 slug 중복: ${c.slug}`);
    else slugs.add(c.slug);
  }
  for (const c of r.categories) {
    if (c?.parent && !slugs.has(c.parent)) errors.push(`${c.slug}: 없는 부모 ${c.parent}`);
  }
  const nodes = r.categories.filter((c) => c?.slug).map((c) => ({ id: c.slug, parentId: c.parent ?? null }));
  for (const n of nodes) {
    if (n.parentId && slugs.has(n.parentId) && !categoryPath(n.id, nodes)) errors.push(`${n.id}: 깊이 3 초과 또는 순환`);
  }
  const sitSlugs = new Set<string>();
  for (const s of r.situations) {
    if (!s?.slug || !s?.name) errors.push(`상황에 slug·name 이 없습니다: ${JSON.stringify(s)}`);
    else if (sitSlugs.has(s.slug) || slugs.has(s.slug)) errors.push(`slug 중복: ${s.slug}`);
    else sitSlugs.add(s.slug);
    for (const c of s?.categories ?? []) if (!slugs.has(c)) errors.push(`${s?.slug}: 없는 분류 ${c}`);
  }
  return { seed: errors.length ? null : (r as TaxonomySeed), errors };
}
