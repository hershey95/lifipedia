import { TIER_LABELS, type Tier } from '@/lib/tier';

const STYLES: Record<Tier, string> = {
  BUDGET: 'bg-budget/10 text-budget',
  MID: 'bg-mid/10 text-mid',
  PREMIUM: 'bg-premium/10 text-premium',
};

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`chip ${STYLES[tier]}`}>{TIER_LABELS[tier]}</span>;
}
