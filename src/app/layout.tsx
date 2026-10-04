import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Header } from '@/components/Header';
import { Sidebar, SidebarCategoryGroup } from '@/components/Sidebar';
import { Providers } from '@/components/Providers';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Lifipedia — 레딧/디시 커뮤니티 + 위키피디아 제품 랭킹',
    template: '%s | Lifipedia',
  },
  description:
    '5대 라이프 허브 서브 갤러리와 위키피디아 교차링크, 3-Tier 저/중/고가 랭킹 위키 커뮤니티.',
  openGraph: { type: 'website', siteName: 'Lifipedia', locale: 'ko_KR' },
};

const HUB_ICONS: Record<string, string> = {
  '연령/생애주기': '👥',
  '주거/공간': '🏠',
  '취미/아웃도어': '⛺',
  '상황/선물': '🎁',
  '테크/가전': '⚡',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // DB에서 5대 라이프 허브 서브 갤러리 쿼리
  const subGalleries = await prisma.theme.findMany({
    where: { status: 'ACTIVE', parentId: { not: null } },
    select: {
      name: true,
      slug: true,
      followerCount: true,
      category: true,
    },
    orderBy: { followerCount: 'desc' },
  });

  // 카테고리별 그룹화
  const groupMap = new Map<string, SidebarCategoryGroup>();
  subGalleries.forEach((gal) => {
    const cat = gal.category || '기타 갤러리';
    if (!groupMap.has(cat)) {
      groupMap.set(cat, {
        hubName: cat,
        icon: HUB_ICONS[cat] || '📌',
        galleries: [],
      });
    }
    groupMap.get(cat)!.galleries.push(gal);
  });

  const sidebarGroups = Array.from(groupMap.values());

  return (
    <html lang="ko">
      <body>
        <Providers>
          {/* 상단 메인 레딧 스타일 글로벌 헤더 */}
          <Header />

          {/* 메인 레이아웃: 좌측 레딧/디시 5대 허브 사이드바 + 우측 메인 피드 */}
          <div className="wrap py-6">
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <Sidebar groups={sidebarGroups} />
              <main className="flex-1 w-full min-w-0">{children}</main>
            </div>
          </div>

          <footer className="mt-16 border-t border-white/10 py-8 text-xs text-slate-400">
            <div className="wrap flex flex-col gap-2 sm:flex-row sm:justify-between">
              <p>Lifipedia — r/Lifipedia 집단지성 3-Tier 제품 위키 랭킹 커뮤니티.</p>
              <nav className="flex gap-4">
                <Link href="/how-ranking-works">투명 랭킹 공식</Link>
                <Link href="/themes/new">서브 갤러리 만들기</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
