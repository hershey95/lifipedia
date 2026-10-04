'use client';

import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/slug';

type WikiLinkProps = {
  text: string;
};

type HoverState = {
  name: string;
  x: number;
  y: number;
} | null;

export function WikiTextRenderer({ text }: WikiLinkProps) {
  const [hoverState, setHoverState] = useState<HoverState>(null);

  // [[링크이름]] 패턴 정규식
  const parts = text.split(/(\[\[.*?\]\])/g);

  return (
    <span className="relative inline">
      {parts.map((part, i) => {
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const targetName = part.slice(2, -2).trim();
          const targetSlug = slugify(targetName);

          return (
            <span
              key={i}
              className="relative inline-block font-semibold text-emerald-400 underline decoration-emerald-400/40 hover:text-emerald-300 hover:decoration-emerald-400 cursor-pointer px-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverState({
                  name: targetName,
                  x: rect.left,
                  y: rect.bottom + 8,
                });
              }}
              onMouseLeave={() => setHoverState(null)}
            >
              <Link href={`/gallery/${targetSlug}`} className="no-underline text-inherit">
                📚 {targetName}
              </Link>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}

      {/* Wikipedia-Style Hover Card Preview Popup */}
      {hoverState && (
        <div
          style={{ left: hoverState.x, top: hoverState.y }}
          className="fixed z-50 w-72 rounded-2xl border border-emerald-500/30 bg-[#0f172a]/95 backdrop-blur-2xl p-4 shadow-2xl shadow-emerald-950/50 text-slate-100 text-xs space-y-2 animate-in fade-in duration-150 pointer-events-none"
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span>📖 위키피디아 연관 가이드</span>
          </div>
          <h5 className="font-extrabold text-sm text-white">{hoverState.name}</h5>
          <p className="text-slate-300 line-clamp-2">
            유저들이 실시간으로 공동 작성하고 3-Tier 저/중/고가 랭킹을 매기는 갤러리 문서입니다.
          </p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>👥 유저 참여 집단지성</span>
            <span className="text-emerald-400 font-bold">클릭 시 문서로 이동 ➔</span>
          </div>
        </div>
      )}
    </span>
  );
}
