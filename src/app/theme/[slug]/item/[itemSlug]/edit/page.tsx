import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ItemForm } from '@/components/ItemForm';

export const metadata: Metadata = { title: '문서 편집', robots: { index: false } };

export default async function EditItemPage({ params }: { params: Promise<{ slug: string; itemSlug: string }> }) {
  const { slug, itemSlug } = await params;

  const item = await prisma.item.findFirst({
    where: { slug: decodeURIComponent(itemSlug), theme: { slug: decodeURIComponent(slug) }, isRemoved: false },
    include: { theme: { select: { slug: true, name: true, status: true } } },
  });
  if (!item) notFound();

  if (item.theme.status !== 'ACTIVE') {
    return (
      <div className="card text-sm">
        휴면 테마의 문서는 편집할 수 없습니다.{' '}
        <Link href={`/theme/${item.theme.slug}/item/${item.slug}`}>문서로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="text-sm text-ink/50">
        <Link href={`/theme/${item.theme.slug}`}>{item.theme.name}</Link> /{' '}
        <Link href={`/theme/${item.theme.slug}/item/${item.slug}`}>{item.name}</Link> / 편집
      </nav>
      <h1 className="mt-2 text-2xl font-extrabold">{item.name} 편집</h1>
      <p className="mt-1 text-sm text-ink/60">
        리비전 {item.revision} 기준으로 편집합니다. 저장하는 사이 다른 사람이 같은 항목을 고치면
        충돌을 알려드리고, 서로 다른 항목만 고쳤다면 자동으로 병합됩니다.
      </p>
      <div className="mt-6">
        <ItemForm
          mode="edit"
          themeSlug={item.theme.slug}
          itemSlug={item.slug}
          itemId={item.id}
          baseRevision={item.revision}
          initial={{
            name: item.name,
            tier: item.tier,
            priceKrw: item.priceKrw,
            description: item.description,
            specSummary: item.specSummary,
            recommendReason: item.recommendReason,
            imageUrl: item.imageUrl,
            purchaseLinks: (item.purchaseLinks as { label: string; url: string }[] | null) ?? [],
          }}
        />
      </div>
    </div>
  );
}
