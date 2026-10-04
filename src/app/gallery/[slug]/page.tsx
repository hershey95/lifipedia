import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { GalleryFeed } from '@/components/GalleryFeed';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GalleryPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const theme = await prisma.theme.findUnique({
    where: { slug: decodedSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      followerCount: true,
      status: true,
    },
  });

  if (!theme) {
    notFound();
  }

  const [budgetItems, midItems, premiumItems, comments, editHistory] = await Promise.all([
    prisma.item.findMany({
      where: { themeId: theme.id, tier: 'BUDGET', isRemoved: false },
      orderBy: { score: 'desc' },
      select: { id: true, slug: true, name: true, tier: true, priceKrw: true, description: true, recommendReason: true, score: true, upCount: true, downCount: true, purchaseLinks: true },
    }),
    prisma.item.findMany({
      where: { themeId: theme.id, tier: 'MID', isRemoved: false },
      orderBy: { score: 'desc' },
      select: { id: true, slug: true, name: true, tier: true, priceKrw: true, description: true, recommendReason: true, score: true, upCount: true, downCount: true, purchaseLinks: true },
    }),
    prisma.item.findMany({
      where: { themeId: theme.id, tier: 'PREMIUM', isRemoved: false },
      orderBy: { score: 'desc' },
      select: { id: true, slug: true, name: true, tier: true, priceKrw: true, description: true, recommendReason: true, score: true, upCount: true, downCount: true, purchaseLinks: true },
    }),
    prisma.talkComment.findMany({
      where: { item: { themeId: theme.id }, isRemoved: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true, badgeLevel: true } },
      },
    }),
    prisma.editHistory.findMany({
      where: { item: { themeId: theme.id } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        revision: true,
        summary: true,
        diff: true,
        createdAt: true,
        editor: { select: { name: true } },
      },
    }),
  ]);

  return (
    <GalleryFeed
      theme={theme}
      budgetItems={budgetItems}
      midItems={midItems}
      premiumItems={premiumItems}
      comments={comments}
      editHistory={editHistory}
    />
  );
}
