/** 갤러리(/theme/[slug]) 탭·정렬·티어 파라미터 — 순수 함수. 잘못된 값은 기본값으로 돌아간다. */
import { tierFromSlug, TIER_SLUGS, type Tier } from '@/lib/tier';

export type FeedParams = { tab: 'rank' | 'list' | 'talk'; sort: 'hot' | 'new' | 'top'; tier: Tier | null };
export const FEED_DEFAULTS: FeedParams = { tab: 'rank', sort: 'hot', tier: null };

const TABS = ['rank', 'list', 'talk'] as const;
const SORTS = ['hot', 'new', 'top'] as const;
type Sp = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export function parseFeedParams(sp: Sp): FeedParams {
  const tab = TABS.find((t) => t === one(sp.tab)) ?? FEED_DEFAULTS.tab;
  const sort = SORTS.find((s) => s === one(sp.sort)) ?? FEED_DEFAULTS.sort;
  const t = one(sp.tier);
  return { tab, sort, tier: t ? tierFromSlug(t) : null };
}

/** 기본값인 키는 URL 에서 뺀다. */
export function feedHref(slug: string, p: Partial<FeedParams>): string {
  const q = new URLSearchParams();
  if (p.tab && p.tab !== FEED_DEFAULTS.tab) q.set('tab', p.tab);
  if (p.sort && p.sort !== FEED_DEFAULTS.sort) q.set('sort', p.sort);
  if (p.tier) q.set('tier', TIER_SLUGS[p.tier]);
  const s = q.toString();
  return `/theme/${encodeURIComponent(slug)}${s ? `?${s}` : ''}`;
}

export const FEED_ORDER_BY = {
  hot: [{ score: 'desc' }, { id: 'desc' }],
  new: [{ createdAt: 'desc' }, { id: 'desc' }],
  top: [{ upCount: 'desc' }, { id: 'desc' }],
} as const;
