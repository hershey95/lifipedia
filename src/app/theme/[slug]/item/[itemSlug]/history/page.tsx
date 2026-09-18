import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ slug: string; itemSlug: string }> };

export const metadata: Metadata = { title: '편집 이력', robots: { index: false } };

export default async function HistoryPage({ params }: Params) {
  const { slug, itemSlug } = await params;

  const item = await prisma.item.findFirst({
    where: { slug: decodeURIComponent(itemSlug), theme: { slug: decodeURIComponent(slug) } },
    select: {
      id: true, name: true, slug: true, revision: true,
      theme: { select: { slug: true, name: true } },
      edits: {
        orderBy: { revision: 'desc' },
        select: {
          id: true, revision: true, summary: true, diff: true, createdAt: true,
          editor: { select: { id: true, name: true, badgeLevel: true } },
        },
      },
    },
  });
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-ink/50">
        <Link href={`/theme/${item.theme.slug}`}>{item.theme.name}</Link> /{' '}
        <Link href={`/theme/${item.theme.slug}/item/${item.slug}`}>{item.name}</Link> / 편집 이력
      </nav>

      <header>
        <h1 className="text-2xl font-extrabold">{item.name} — 편집 이력</h1>
        <p className="mt-1 text-sm text-ink/60">
          누가 무엇을 바꿨는지 전부 공개됩니다. 현재 리비전 {item.revision}.
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {item.edits.map((edit) => (
          <li key={edit.id} className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                r{edit.revision}
                {edit.summary ? <span className="ml-2 font-normal text-ink/70">{edit.summary}</span> : null}
              </h2>
              <p className="text-xs text-ink/50">
                {edit.editor ? (
                  <Link href={`/u/${edit.editor.id}`}>{edit.editor.name ?? '이름 없음'}</Link>
                ) : (
                  '탈퇴한 사용자'
                )}{' '}
                · {edit.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
              </p>
            </div>
            <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-black/[0.04] p-3 text-xs leading-5">
              {edit.diff}
            </pre>
          </li>
        ))}
      </ol>
    </div>
  );
}
