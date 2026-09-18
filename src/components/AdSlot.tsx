/**
 * 광고 슬롯. 지금은 자리만 잡아두고, 광고 네트워크 스크립트는 나중에 주입한다.
 * NEXT_PUBLIC_ADS_ENABLED 가 'true' 가 아니면 개발 중 자리표시자만 보인다.
 */
export function AdSlot({ slot, className = '' }: { slot: 'theme-top' | 'theme-inline' | 'item-side' | 'item-bottom'; className?: string }) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

  return (
    <aside
      data-ad-slot={slot}
      aria-label="광고"
      className={`flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-black/15 bg-black/[0.02] text-xs text-ink/35 ${className}`}
    >
      {enabled ? null : `광고 영역 (${slot})`}
    </aside>
  );
}
