import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { COMMENT_RULES, buildCommentTree, parseCommentSort } from '@/lib/comments';
import { TalkThread } from '@/components/TalkThread';

type Params = {
  params: Promise<{ slug: string; itemSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = { title: '토론', robots: { index: false } };

const SORT_LABEL = { best: '추천순', new: '최신순', old: '오래된순' } as const;

export default async function TalkPage({ params, searchParams }: Params) {
  const { slug, itemSlug } = await params;
  const sort = parseCommentSort((await searchParams).sort);
  const me = await currentUser();

  const item = await prisma.item.findFirst({
    where: { slug: decodeURIComponent(itemSlug), theme: { slug: decodeURIComponent(slug) } },
    select: {
      id: true, name: true, slug: true,
      theme: { select: { slug: true, name: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        take: COMMENT_RULES.MAX_PER_ITEM_FETCH,
        select: {
          id: true, body: true, createdAt: true, parentId: true, isRemoved: true,
          upCount: true, downCount: true, bestScore: true, conceptAt: true,
          author: { select: { id: true, name: true, badgeLevel: true } },
          votes: me ? { where: { userId: me.id }, select: { type: true } } : false,
        },
      },
    },
  });
  if (!item) notFound();

  // 트리 정렬은 서버에서: 깊이 우선으로 펼쳐 넘기면 TalkThread 가 형제 순서를 그대로 쓴다.
  const flatten = (nodes: ReturnType<typeof buildCommentTree<(typeof item.comments)[number]>>): (typeof item.comments)[number][] =>
    nodes.flatMap((n) => [n, ...flatten(n.children)]);
  const ordered = flatten(buildCommentTree(item.comments, sort));

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

      <nav aria-label="정렬" className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-ink/60">정렬</span>
        {(['best', 'new', 'old'] as const).map((s) => (
          <Link
            key={s}
            href={`/theme/${item.theme.slug}/item/${item.slug}/talk${s === 'best' ? '' : `?sort=${s}`}`}
            aria-current={sort === s ? 'page' : undefined}
            className={sort === s ? 'font-bold' : ''}
          >
            {SORT_LABEL[s]}
          </Link>
        ))}
      </nav>

      <TalkThread
        itemId={item.id}
        comments={ordered.map((comment) => ({
          id: comment.id,
          parentId: comment.parentId,
          body: comment.isRemoved ? '(규칙 위반으로 삭제된 댓글입니다)' : comment.body,
          createdAt: comment.createdAt.toISOString(),
          createdAtLabel: comment.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }),
          authorId: comment.author?.id ?? null,
          authorName: comment.author?.name ?? '탈퇴한 사용자',
          upCount: comment.upCount,
          downCount: comment.downCount,
          myVote: comment.votes?.[0]?.type ?? null,
          own: me !== null && comment.author?.id === me.id,
          isConcept: comment.conceptAt !== null,
          isRemoved: comment.isRemoved,
        }))}
      />
      {item.comments.length >= COMMENT_RULES.MAX_PER_ITEM_FETCH ? (
        <p className="text-xs text-ink/50">오래된 {COMMENT_RULES.MAX_PER_ITEM_FETCH}개까지만 표시합니다.</p>
      ) : null}
    </div>
  );
}
