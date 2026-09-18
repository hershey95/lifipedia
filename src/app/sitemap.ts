import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { TIER_SLUGS } from '@/lib/tier';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const [themes, items] = await Promise.all([
    prisma.theme.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, lastActivityAt: true },
    }),
    prisma.item.findMany({
      where: { isRemoved: false, theme: { status: 'ACTIVE' } },
      select: { slug: true, updatedAt: true, theme: { select: { slug: true } } },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/themes`, priority: 0.8 },
    { url: `${base}/rankings`, priority: 0.8 },
    { url: `${base}/how-ranking-works`, priority: 0.6 },
  ];

  const themeRoutes = themes.flatMap((theme) => [
    { url: `${base}/theme/${theme.slug}`, lastModified: theme.lastActivityAt, priority: 0.9 },
    ...Object.values(TIER_SLUGS).map((tier) => ({
      url: `${base}/theme/${theme.slug}/${tier}`,
      lastModified: theme.lastActivityAt,
      priority: 0.7,
    })),
  ]);

  const itemRoutes = items.map((item) => ({
    url: `${base}/theme/${item.theme.slug}/item/${item.slug}`,
    lastModified: item.updatedAt,
    priority: 0.6,
  }));

  return [...staticRoutes, ...themeRoutes, ...itemRoutes];
}
