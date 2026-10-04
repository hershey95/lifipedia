import Link from 'next/link';
import { prisma } from '@/lib/db';
import { computeMomentum } from '@/lib/ranking';
import { TierBadge } from '@/components/TierBadge';
import { WikiTextRenderer } from '@/components/WikiLink';
import { AdSlot } from '@/components/AdSlot';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [rootGalleries, subGalleries, recentItems] = await Promise.all([
    // 메인 허브 갤러리
    prisma.theme.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        followerCount: true,
        subThemes: {
          select: { name: true, slug: true, followerCount: true },
          take: 4,
        },
      },
    }),
    // 핫 서브 갤러리
    prisma.theme.findMany({
      where: { parentId: { not: null }, status: 'ACTIVE' },
      orderBy: { followerCount: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        followerCount: true,
        _count: { select: { items: true } },
      },
    }),
    // 최근 아이템 & 투표
    prisma.item.findMany({
      where: { isRemoved: false, theme: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        slug: true,
        name: true,
        tier: true,
        priceKrw: true,
        description: true,
        createdAt: true,
        theme: { select: { slug: true, name: true } },
        votes: { select: { type: true, weight: true, createdAt: true, userId: true } },
      },
    }),
  ]);

  const rising = recentItems
    .map((item) => ({ item, momentum: computeMomentum(item.votes) }))
    .filter((entry) => entry.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* 대문 히어로 Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 p-6 sm:p-10 border border-white/15 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="chip bg-accent/20 text-accent border-accent/40 font-bold text-xs">
              🏛️ r/Lifipedia 집단지성 위키
            </span>
            <span className="chip bg-emerald-500/20 text-emerald-400 border-emerald-400/40 text-[10px]">
              [[WikiLink]] 교차 연결 활성화
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            레딧 커뮤니티와 위키피디아가 만나는 <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              진짜 인생템 랭킹
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            운영자 추천 NO! 유저들이 서브 갤러리에서 직접 쓰고, 추천하고, 경쟁시킨 저/중/고가 3-Tier 순위.
            문서 속 <span className="text-emerald-400 font-bold">[[교차링크]]</span>를 클릭해 유기적으로 우주를 탐험하세요.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <Link href="/themes/new" className="btn-primary no-underline text-xs py-2 px-4 shadow-lg">
              + 서브 갤러리 만들기
            </Link>
            <Link href="/how-ranking-works" className="btn-ghost no-underline text-xs py-2 px-4">
              ⚡ 투명 랭킹 산정식 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 🏛️ 5대 라이프 허브 카드 배열 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>🏛️ 5대 라이프 메인 허브</span>
          </h2>
          <span className="text-xs text-slate-400">카테고리별 주요 서브 갤러리</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rootGalleries.map((root) => (
            <div key={root.id} className="card bg-slate-900/80 border-white/10 p-5 space-y-3 hover:border-accent/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="chip bg-white/10 text-slate-300 text-[10px]">#{root.category}</span>
                <span className="text-xs text-slate-400 font-medium">👥 {root.followerCount}명</span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">{root.name}</h3>
              {root.description && <p className="text-xs text-slate-400 line-clamp-2">{root.description}</p>}

              {/* 하위 서브 갤러리 칩 모음 */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">주요 서브 갤러리:</span>
                <div className="flex flex-wrap gap-1.5">
                  {root.subThemes.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/gallery/${sub.slug}`}
                      className="chip bg-white/5 hover:bg-accent text-slate-300 hover:text-white border-white/10 no-underline text-[11px] transition-all"
                    >
                      r/{sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AdSlot slot="theme-top" />

      {/* 🔥 핫 서브 갤러리 그리드 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            🔥 실시간 핫 서브 갤러리
          </h2>
          <span className="text-xs text-slate-400">유저 활동량이 가장 높은 갤러리</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subGalleries.map((gal) => (
            <Link
              key={gal.id}
              href={`/gallery/${gal.slug}`}
              className="card bg-white/[0.03] hover:bg-white/[0.07] border-white/10 p-4 space-y-2 no-underline group transition-all"
            >
              <div className="flex items-center justify-between">
                {gal.category && <span className="chip bg-white/10 text-slate-300 text-[10px]">#{gal.category}</span>}
                <span className="text-[10px] text-slate-500">👥 {gal.followerCount}</span>
              </div>
              <h4 className="font-bold text-slate-100 group-hover:text-accent transition-colors text-base">
                {gal.name}
              </h4>
              {gal.description && <p className="text-xs text-slate-400 line-clamp-2">{gal.description}</p>}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>📦 위키 {gal._count.items}개</span>
                <span className="text-accent font-bold group-hover:translate-x-0.5 transition-transform">
                  입장 ➔
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 🚀 이번 달 급상승 위키 아이템 (3-Tier & [[WikiLink]]) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            🚀 이번 달 급상승 3-Tier 위키 아이템
          </h2>
          <span className="text-xs text-slate-400">유저 추천 지수가 빠르게 증가하는 항목</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rising.map(({ item, momentum }) => (
            <div key={`${item.theme.slug}/${item.slug}`} className="card p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <TierBadge tier={item.tier} />
                  <span className="chip bg-accent/20 text-accent font-bold text-[10px]">
                    +{momentum.toFixed(1)} Pts
                  </span>
                </div>
                <Link
                  href={`/theme/${item.theme.slug}/item/${item.slug}`}
                  className="block font-bold text-white hover:text-accent no-underline text-base truncate"
                >
                  {item.name}
                </Link>
                <div className="text-xs text-slate-300">
                  <WikiTextRenderer text={item.description} />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <Link href={`/gallery/${item.theme.slug}`} className="no-underline text-slate-400 hover:text-white truncate">
                  r/{item.theme.name}
                </Link>
                <Link href={`/theme/${item.theme.slug}/item/${item.slug}`} className="text-accent font-bold no-underline">
                  위키 보기 ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
