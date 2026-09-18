import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { TalkThread } from '@/components/TalkThread';

type Params = { params: Promise<{ slug: string; itemSlug: string }> };

export const metadata: Metadata = { title: '토론', robots: { index: false } };

export default async function TalkPage({ params }: Params) {
  const { slug, itemSlug } = await params;

  const item = await prisma.item.findFirst({
    where: { slug: decodeURIComponent(itemSlug), theme: { slug: decodeURIComponent(slug) } },
    select: {
      id: true, name: true, slug: true,
      theme: { select: { slug: true, name: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, body: true, createdAt: true, parentId: true, isRemoved: true,
          author: { select: { id: true, name: true, badgeLevel: true } },
        },
      },
    },
  });
  if (!item) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-ink/50">
        <Link href={`/theme/${item.theme.slug}`}>{item.theme.name}</Link> /{' '}
        <Link href={`/theme/${item.theme.slug}/item/${item.slug}`}>{item.name}</Link> / 토론
      </nav>

      <header>
        <h1 className="text-2xl font-extrabold">{item.name} — 토론</h1>
        <p className="mt-1 text-sm text-ink/60">
          편집 근거를 설명하거나 다른 의견에 반박하는 곳입니다. 본문 편집은 문서에서 직접 해 주세요.
        </p>
      </header>

      <TalkThread
        itemId={item.id}
        comments={item.comments.map((comment) => ({
          id: comment.id,
          parentId: comment.parentId,
          body: comment.isRemoved ? '(규칙 위반으로 삭제된 댓글입니다)' : comment.body,
          createdAt: comment.createdAt.toISOString(),
          authorId: comment.author?.id ?? null,
          authorName: comment.author?.name ?? '탈퇴한 사용자',
        }))}
      />
    </div>
  );
}
