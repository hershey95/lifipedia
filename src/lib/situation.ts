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

/** 자기 + 모든 하위 분류 id (리프가 문서를 가진다) */
function subtree(cats: { id: string; parentId: string | null }[], rootId: string): Set<string> {
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
}

export const CATEGORY_SUMMARY_RULES = { MIN_ITEMS_TO_RANK: 3 } as const;
export type ChildSummary = { slug: string; name: string; itemCount: number; top: { name: string; slug: string } | null };

const byScore = <T extends { id: string; score: number }>(a: T, b: T) => b.score - a.score || a.id.localeCompare(b.id);

/** 중·대분류 페이지용. 직속 하위 분류마다 하위 전체 문서를 모아, 3개 이상이면 1위(score)를 보이고 아니면 merged 로 보낸다. */
export function summarizeChildren(input: {
  parentId: string;
  cats: { id: string; slug: string; name: string; parentId: string | null }[];
  items: { id: string; themeId: string; name: string; slug: string; score: number }[];
}): { ranked: ChildSummary[]; merged: { name: string; slug: string; themeSlug: string }[] } {
  const ranked: (ChildSummary & { id: string; score: number })[] = [];
  const merged: { id: string; score: number; name: string; slug: string; themeSlug: string }[] = [];
  for (const child of input.cats.filter((c) => c.parentId === input.parentId)) {
    const ids = subtree(input.cats, child.id);
    const mine = input.items.filter((i) => ids.has(i.themeId));
    if (mine.length === 0) continue;
    if (mine.length >= CATEGORY_SUMMARY_RULES.MIN_ITEMS_TO_RANK) {
      const top = [...mine].sort(byScore)[0];
      ranked.push({ id: top.id, score: top.score, slug: child.slug, name: child.name, itemCount: mine.length, top: { name: top.name, slug: top.slug } });
    } else {
      for (const i of mine) merged.push({ id: i.id, score: i.score, name: i.name, slug: i.slug, themeSlug: input.cats.find((c) => c.id === i.themeId)?.slug ?? child.slug });
    }
  }
  return {
    ranked: ranked.sort(byScore).map((r) => ({ slug: r.slug, name: r.name, itemCount: r.itemCount, top: r.top })),
    merged: merged.sort(byScore).map((m) => ({ name: m.name, slug: m.slug, themeSlug: m.themeSlug })),
  };
}

export function buildSituationCards(input: {
  cats: Cat[];
  linkedIds: string[];
  items: { id: string; themeId: string; name: string; slug: string; score: number }[];
  votes: { themeId: string; weight: number; createdAt: Date }[];
  edits: { themeId: string; createdAt: Date }[];
  comments: { themeId: string; createdAt: Date }[];
  /** 창 안의 분류별 조회 합계(THEME 조회 + 소속 문서의 ITEM 조회를 분류 id 로 합친 것)와 조회 지표가 쌓인 일수 */
  views?: { themeId: string; count: number }[];
  viewsTrackedDays?: number;
  asOf: Date;
}): SituationCard[] {
  const { cats, items, votes, edits, comments, asOf } = input;
  const byId = new Map(cats.map((c) => [c.id, c]));
  const since = asOf.getTime() - POPULARITY_RULES.WINDOW_DAYS * 86_400_000;
  const inWindow = (d: Date) => d.getTime() >= since && d.getTime() <= asOf.getTime();

  const rows = input.linkedIds.flatMap((id) => {
    const cat = byId.get(id);
    if (!cat) return [];
    const ids = subtree(cats, id);
    const mine = items.filter((i) => ids.has(i.themeId));
    const top = [...mine].sort(byScore)[0];
    const score = popularity(
      {
        votes: votes.filter((v) => ids.has(v.themeId)),
        editCount: edits.filter((e) => ids.has(e.themeId) && inWindow(e.createdAt)).length,
        commentCount: comments.filter((c) => ids.has(c.themeId) && inWindow(c.createdAt)).length,
        views: (input.views ?? []).filter((v) => ids.has(v.themeId)).reduce((s, v) => s + v.count, 0),
        viewsTrackedDays: input.viewsTrackedDays,
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

export type BestItem = { id: string; name: string; slug: string; themeSlug: string; score: number };

/** 상황 페이지 베스트 문서: 배치된 분류의 하위 문서를 문서 단위 인기(분류 인기와 같은 식)로 정렬해 상위 limit 개. */
export function buildBestItems(input: {
  cats: Pick<Cat, 'id' | 'slug' | 'parentId'>[];
  linkedIds: string[];
  items: { id: string; themeId: string; name: string; slug: string }[];
  votes: { itemId: string; weight: number; createdAt: Date }[];
  edits: { itemId: string; createdAt: Date }[];
  comments: { itemId: string; createdAt: Date }[];
  views?: { itemId: string; count: number }[];
  viewsTrackedDays?: number;
  asOf: Date;
  limit?: number;
}): BestItem[] {
  const { cats, asOf } = input;
  const slugOf = new Map(cats.map((c) => [c.id, c.slug]));
  const placed = new Set(input.linkedIds.flatMap((id) => [...subtree(cats, id)]));
  const since = asOf.getTime() - POPULARITY_RULES.WINDOW_DAYS * 86_400_000;
  const inWindow = (d: Date) => d.getTime() >= since && d.getTime() <= asOf.getTime();
  const mine = <T extends { itemId: string }>(rows: T[], id: string) => rows.filter((r) => r.itemId === id);
  return input.items
    .filter((i) => placed.has(i.themeId))
    .map((i) => ({
      id: i.id,
      name: i.name,
      slug: i.slug,
      themeSlug: slugOf.get(i.themeId) ?? '',
      score: popularity(
        {
          votes: mine(input.votes, i.id),
          editCount: mine(input.edits, i.id).filter((e) => inWindow(e.createdAt)).length,
          commentCount: mine(input.comments, i.id).filter((c) => inWindow(c.createdAt)).length,
          views: mine(input.views ?? [], i.id).reduce((s, v) => s + v.count, 0),
          viewsTrackedDays: input.viewsTrackedDays,
        },
        asOf,
      ),
    }))
    .sort(byScore)
    .slice(0, input.limit ?? 5)
    .map(({ id, name, slug, themeSlug, score }) => ({ id, name, slug, themeSlug, score }));
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
