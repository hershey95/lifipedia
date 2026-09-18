import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ItemForm } from '@/components/ItemForm';

export const metadata: Metadata = { title: '제품 위키 작성', robots: { index: false } };

export default async function NewItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = await prisma.theme.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: { slug: true, name: true, status: true },
  });
  if (!theme) notFound();

  if (theme.status !== 'ACTIVE') {
    return (
      <div className="card">
        <p className="text-sm">
          아직 정식 승격되지 않은 테마입니다. 팔로워가 임계치를 넘으면 위키 작성이 열립니다.{' '}
          <Link href={`/theme/${theme.slug}`}>테마로 돌아가기</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="text-sm text-ink/50">
        <Link href={`/theme/${theme.slug}`}>{theme.name}</Link> / 새 문서
      </nav>
      <h1 className="mt-2 text-2xl font-extrabold">{theme.name} — 제품 위키 작성</h1>
      <p className="mt-1 text-sm text-ink/60">
        작성한 내용은 누구나 편집할 수 있고, 모든 편집은 이력에 남습니다.
      </p>
      <div className="mt-6">
        <ItemForm mode="create" themeSlug={theme.slug} />
      </div>
    </div>
  );
}
