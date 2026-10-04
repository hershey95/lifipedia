'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WikiTextRenderer } from './WikiLink';
import { TierBadge } from './TierBadge';
import { VoteButtons } from './VoteButtons';
import { FollowButton } from './FollowButton';

export type GalleryItem = {
  id: string;
  slug: string;
  name: string;
  tier: 'BUDGET' | 'MID' | 'PREMIUM';
  priceKrw?: number | null;
  description: string;
  recommendReason?: string | null;
  score: number;
  upCount: number;
  downCount: number;
  purchaseLinks?: unknown;
};

export type GalleryComment = {
  id: string;
  body: string;
  createdAt: Date;
  author?: {
    name: string | null;
    badgeLevel: string;
  } | null;
};

export type GalleryEditHistory = {
  id: string;
  revision: number;
  summary?: string | null;
  diff: string;
  createdAt: Date;
  editor?: {
    name: string | null;
  } | null;
};

type GalleryFeedProps = {
  theme: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: string | null;
    followerCount: number;
    status: string;
  };
  budgetItems: GalleryItem[];
  midItems: GalleryItem[];
  premiumItems: GalleryItem[];
  comments: GalleryComment[];
  editHistory: GalleryEditHistory[];
};

export function GalleryFeed({
  theme,
  budgetItems,
  midItems,
  premiumItems,
  comments,
  editHistory,
}: GalleryFeedProps) {
  const [activeTab, setActiveTab] = useState<'RANKING' | 'COMMUNITY' | 'HISTORY'>('RANKING');

  const topBudget = budgetItems[0] || null;
  const topMid = midItems[0] || null;
  const topPremium = premiumItems[0] || null;

  return (
    <div className="space-y-6">
      {/* 갤러리 타이틀 & 대문 헤더 */}
      <div className="card bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900/90 border-white/15 p-6 sm:p-8 space-y-4 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="chip bg-accent/20 text-accent border-accent/40 font-bold">
                r/{theme.slug}
              </span>
              {theme.category && (
                <span className="chip bg-white/10 text-slate-300 text-[11px]">#{theme.category}</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{theme.name}</h1>
            {theme.description && (
              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{theme.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <FollowButton
              themeSlug={theme.slug}
              initialFollowing={false}
              initialCount={theme.followerCount}
              threshold={20}
              status={(theme.status as 'PROPOSED' | 'ACTIVE' | 'DORMANT') || 'ACTIVE'}
            />
            <Link href={`/theme/${theme.slug}/item/new`} className="btn-primary no-underline text-xs py-2.5">
              + 제품 위키 작성
            </Link>
          </div>
        </div>

        {/* 탭 네비게이션 [🏆 3-Tier 랭킹 | 💬 갤러리 커뮤니티 | 📜 위키 히스토리] */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('RANKING')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'RANKING'
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🏆 3-Tier 위키 랭킹 (저/중/고가)
          </button>
          <button
            onClick={() => setActiveTab('COMMUNITY')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'COMMUNITY'
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            💬 갤러리 커뮤니티 ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            📜 위키 수정 내역 ({editHistory.length})
          </button>
        </div>
      </div>

      {/* 탭 1: 🏆 3-Tier 저/중/고가 랭킹 피드 */}
      {activeTab === 'RANKING' && (
        <div className="space-y-8">
          {/* 저가 / 중가 / 고가 1위 히어로 3-Tier 카드 */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* 저가 1위 */}
            <div className="card border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="chip bg-emerald-500/20 text-emerald-400 border-emerald-400/30">
                  🥉 BUDGET (저가) 1위
                </span>
                {topBudget && <span className="text-xs font-black text-amber-400">{topBudget.score.toFixed(1)}점</span>}
              </div>
              {topBudget ? (
                <div className="space-y-2">
                  <Link href={`/theme/${theme.slug}/item/${topBudget.slug}`} className="block font-black text-lg text-white hover:text-emerald-400 no-underline">
                    {topBudget.name}
                  </Link>
                  {topBudget.priceKrw && (
                    <p className="text-xs font-bold text-emerald-400">{topBudget.priceKrw.toLocaleString()}원</p>
                  )}
                  <div className="text-xs text-slate-300 line-clamp-2">
                    <WikiTextRenderer text={topBudget.description} />
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <VoteButtons itemId={topBudget.id} initialUp={topBudget.upCount} initialDown={topBudget.downCount} initialMyVote={null} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">저가 1위가 아직 등록되지 않았습니다.</p>
              )}
            </div>

            {/* 중가 1위 */}
            <div className="card border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="chip bg-amber-500/20 text-amber-400 border-amber-400/30">
                  🥈 MID (중가) 1위
                </span>
                {topMid && <span className="text-xs font-black text-amber-400">{topMid.score.toFixed(1)}점</span>}
              </div>
              {topMid ? (
                <div className="space-y-2">
                  <Link href={`/theme/${theme.slug}/item/${topMid.slug}`} className="block font-black text-lg text-white hover:text-amber-400 no-underline">
                    {topMid.name}
                  </Link>
                  {topMid.priceKrw && (
                    <p className="text-xs font-bold text-amber-400">{topMid.priceKrw.toLocaleString()}원</p>
                  )}
                  <div className="text-xs text-slate-300 line-clamp-2">
                    <WikiTextRenderer text={topMid.description} />
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <VoteButtons itemId={topMid.id} initialUp={topMid.upCount} initialDown={topMid.downCount} initialMyVote={null} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">중가 1위가 아직 등록되지 않았습니다.</p>
              )}
            </div>

            {/* 고가 1위 */}
            <div className="card border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="chip bg-purple-500/20 text-purple-400 border-purple-400/30">
                  🥇 PREMIUM (고가) 1위
                </span>
                {topPremium && <span className="text-xs font-black text-amber-400">{topPremium.score.toFixed(1)}점</span>}
              </div>
              {topPremium ? (
                <div className="space-y-2">
                  <Link href={`/theme/${theme.slug}/item/${topPremium.slug}`} className="block font-black text-lg text-white hover:text-purple-400 no-underline">
                    {topPremium.name}
                  </Link>
                  {topPremium.priceKrw && (
                    <p className="text-xs font-bold text-purple-400">{topPremium.priceKrw.toLocaleString()}원</p>
                  )}
                  <div className="text-xs text-slate-300 line-clamp-2">
                    <WikiTextRenderer text={topPremium.description} />
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <VoteButtons itemId={topPremium.id} initialUp={topPremium.upCount} initialDown={topPremium.downCount} initialMyVote={null} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">고가 1위가 아직 등록되지 않았습니다.</p>
              )}
            </div>
          </div>

          {/* 가격대별 전체 순위 리스트 */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>📊 가격대별 전체 랭킹 및 유저 위키</span>
            </h3>

            {[
              { label: '저가 (Budget)', items: budgetItems, badge: 'BUDGET' as const },
              { label: '중가 (Mid)', items: midItems, badge: 'MID' as const },
              { label: '고가 (Premium)', items: premiumItems, badge: 'PREMIUM' as const },
            ].map((section) => (
              <div key={section.label} className="space-y-3">
                <div className="flex items-center gap-2">
                  <TierBadge tier={section.badge} />
                  <span className="font-bold text-sm text-slate-200">{section.label}</span>
                </div>

                {section.items.length === 0 ? (
                  <p className="card text-xs text-slate-500 p-4">등록된 항목이 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={item.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-accent">#{idx + 1}</span>
                            <Link href={`/theme/${theme.slug}/item/${item.slug}`} className="font-bold text-white group-hover:text-accent no-underline text-base">
                              {item.name}
                            </Link>
                            {item.priceKrw && (
                              <span className="text-xs text-slate-400">({item.priceKrw.toLocaleString()}원)</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300">
                            <WikiTextRenderer text={item.description} />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                          <span className="text-xs font-bold text-amber-400">{item.score.toFixed(1)}점</span>
                          <VoteButtons itemId={item.id} initialUp={item.upCount} initialDown={item.downCount} initialMyVote={null} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 2: 💬 갤러리 커뮤니티 (토론/Q&A) */}
      {activeTab === 'COMMUNITY' && (
        <div className="space-y-4">
          <div className="card p-4 bg-white/5 border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-300">유저 자유 토론 및 구매 문의 Q&A</span>
            <span className="chip bg-accent/20 text-accent text-xs">레딧 스타일 소통</span>
          </div>

          {comments.length === 0 ? (
            <p className="card text-xs text-slate-500 p-6 text-center">첫 커뮤니티 의견을 남겨보세요!</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-slate-200">👤 {comment.author?.name || '익명 유저'}</span>
                    <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-slate-200">
                    <WikiTextRenderer text={comment.body} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 탭 3: 📜 위키 수정 내역 */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="card p-4 bg-white/5 border-white/10">
            <span className="text-xs text-slate-300">투명하게 공개되는 집단지성 위키 수정 로그</span>
          </div>

          {editHistory.length === 0 ? (
            <p className="card text-xs text-slate-500 p-6 text-center">수정 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {editHistory.map((hist) => (
                <li key={hist.id} className="card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-accent">Revision #{hist.revision}</span>
                    <span>{new Date(hist.createdAt).toLocaleString()}</span>
                  </div>
                  {hist.summary && <p className="text-xs text-slate-300">요약: {hist.summary}</p>}
                  <pre className="p-3 rounded-xl bg-black/50 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                    {hist.diff}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
