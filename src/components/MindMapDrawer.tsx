'use client';

import Link from 'next/link';

export type SelectedNodeData = {
  id: string;
  type: 'ROOT' | 'CATEGORY' | 'THEME' | 'ITEM';
  name: string;
  description?: string | null;
  category?: string | null;
  followerCount?: number;
  slug?: string;
  themeSlug?: string;
  tier?: 'BUDGET' | 'MID' | 'PREMIUM';
  priceKrw?: number | null;
  score?: number;
  subThemesCount?: number;
};

type MindMapDrawerProps = {
  node: SelectedNodeData | null;
  onClose: () => void;
};

export function MindMapDrawer({ node, onClose }: MindMapDrawerProps) {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      {/* 배경 클릭 닫기 */}
      <div className="flex-1" onClick={onClose} />

      {/* 우측 글래스모피즘 팝업 패널 */}
      <div className="w-full max-w-md bg-[#0f172a]/95 border-l border-white/15 p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-purple-950/50 backdrop-blur-2xl text-slate-100 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="space-y-6">
          {/* 헤더 버튼 & 노드 구조 표시 */}
          <div className="flex items-center justify-between">
            <span className="chip bg-accent/20 text-accent border-accent/40 text-xs">
              {node.type === 'ROOT' && '🌐 메인 노드'}
              {node.type === 'CATEGORY' && '📂 대분류 테마'}
              {node.type === 'THEME' && '💡 세분화 테마'}
              {node.type === 'ITEM' && '📦 랭킹 제품 위키'}
            </span>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕ 닫기
            </button>
          </div>

          {/* 제목 & 카테고리 */}
          <div className="space-y-2">
            {node.category && (
              <span className="chip bg-white/10 text-slate-300 text-[11px]">#{node.category}</span>
            )}
            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              {node.name}
            </h3>
            {node.description && (
              <p className="text-sm text-slate-300/90 leading-relaxed">{node.description}</p>
            )}
          </div>

          {/* 상세 파라미터 / 메타 정보 카드 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            {node.followerCount !== undefined && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">👥 테마 팔로워</span>
                <span className="font-bold text-white">{node.followerCount.toLocaleString()}명</span>
              </div>
            )}

            {node.subThemesCount !== undefined && node.subThemesCount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">🌿 하위 브랜치 테마</span>
                <span className="font-bold text-accent">{node.subThemesCount}개</span>
              </div>
            )}

            {node.priceKrw && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">💰 대표 가격</span>
                <span className="font-bold text-emerald-400">{node.priceKrw.toLocaleString()}원</span>
              </div>
            )}

            {node.score !== undefined && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">⚡ 유저 랭킹 점수</span>
                <span className="font-black text-amber-400 text-base">{node.score.toFixed(1)}점</span>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="pt-6 border-t border-white/10 space-y-2">
          {node.type === 'ITEM' && node.themeSlug && node.slug ? (
            <Link
              href={`/theme/${node.themeSlug}/item/${node.slug}`}
              onClick={onClose}
              className="btn-primary w-full no-underline text-center justify-center text-sm py-3"
            >
              📖 상세 제품 위키 & 투표하기 ➔
            </Link>
          ) : node.slug ? (
            <Link
              href={`/theme/${node.slug}`}
              onClick={onClose}
              className="btn-primary w-full no-underline text-center justify-center text-sm py-3"
            >
              🏆 이 테마의 저·중·고가 랭킹 보기 ➔
            </Link>
          ) : (
            <button onClick={onClose} className="btn-ghost w-full py-3">
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
