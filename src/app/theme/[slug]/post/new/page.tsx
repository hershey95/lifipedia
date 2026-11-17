import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canContribute } from '@/lib/theme-lifecycle';
import { PostForm } from '@/components/PostForm';

export const metadata: Metadata = { title: '게시판 글쓰기', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function NewPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const theme = await prisma.theme.findUnique({ where: { slug: decoded }, select: { slug: true, name: true, status: true } });
  if (!theme) notFound();

  const me = await currentUser();
  if (!me) redirect(`/signin?callbackUrl=${encodeURIComponent(`/theme/${theme.slug}/post/new`)}`);

  if (!canContribute(theme.status)) {
    return (
      <div className="card">
        <p className="text-sm">
          아직 정식 승격되지 않은 갤러리입니다. 팔로워가 임계치를 넘으면 글쓰기가 열립니다.{' '}
          <Link href={`/theme/${theme.slug}`}>갤러리로 돌아가기</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="text-sm text-fg-muted">
        <Link href={`/theme/${theme.slug}`}>{theme.name}</Link> / 게시판 글쓰기
      </nav>
      <h1 className="mt-2 text-2xl font-extrabold">{theme.name} — 게시판 글쓰기</h1>
      <div className="mt-6">
        <PostForm themeSlug={theme.slug} />
      </div>
    </div>
  );
}
