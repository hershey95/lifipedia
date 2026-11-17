import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { POST_KIND_LABEL } from '@/lib/board';
import { buildCommentTree, COMMENT_RULES, parseCommentSort, type CommentNode } from '@/lib/comments';
import { WikiMarkdown } from '@/components/WikiMarkdown';
import { BoardVoteButtons } from '@/components/BoardVoteButtons';
import { PostThread, type PostCommentNode } from '@/components/PostThread';
import { ReportButton } from '@/components/ReportButton';
import { ViewBeacon } from '@/components/ViewBeacon';

type Params = {
  params: Promise<{ slug: string; postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' });
const SORT_LABEL = { best: '추천순', new: '최신', old: '오래된 순' } as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postId } = await params;
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { title: true, isRemoved: true } });
  return { title: post && !post.isRemoved ? post.title : '글을 찾을 수 없음' };
}

export default async function PostPage({ params, searchParams }: Params) {
  const { slug, postId } = await params;
  const sort = parseCommentSort((await searchParams).sort);
  const me = await currentUser();

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true, kind: true, title: true, body: true, isRemoved: true, createdAt: true, upCount: true, downCount: true,
      authorId: true,
      author: { select: { name: true } },
      theme: { select: { slug: true, name: true } },
      votes: me ? { where: { userId: me.id }, select: { type: true } } : false,
    },
  });
  // 글의 갤러리가 URL 과 다르면 없는 글로 본다
  if (!post || post.isRemoved || post.theme.slug !== decodeURIComponent(slug)) notFound();

  const rows = await prisma.postComment.findMany({
    where: { postId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: COMMENT_RULES.MAX_PER_ITEM_FETCH,
    select: {
      id: true, parentId: true, isRemoved: true, body: true, createdAt: true, bestScore: true,
      upCount: true, downCount: true, authorId: true,
      author: { select: { name: true } },
      votes: me ? { where: { userId: me.id }, select: { type: true } } : false,
    },
  });

  const toNode = (n: CommentNode<(typeof rows)[number]>): PostCommentNode => ({
    id: n.id,
    isRemoved: n.isRemoved,
    body: n.isRemoved ? '' : n.body,
    createdLabel: fmt(n.createdAt),
    authorId: n.authorId,
    authorName: n.author?.name ?? '탈퇴한 사용자',
    upCount: n.upCount,
    downCount: n.downCount,
    myVote: (n.votes?.[0]?.type as 'UP' | 'DOWN' | undefined) ?? null,
    own: Boolean(me && n.authorId === me.id),
    depth: n.depth,
    children: n.children.map(toNode),
  });
  const tree = buildCommentTree(rows, sort).map(toNode);
  const themeHref = `/theme/${encodeURIComponent(post.theme.slug)}`;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <ViewBeacon targetType="POST" targetId={post.id} />
      <header>
        <nav className="text-sm text-fg-muted">
          <Link href={themeHref}>{post.theme.name}</Link> / 게시판
        </nav>
        <div className="mt-2 flex items-center gap-2">
          <span className="chip">{POST_KIND_LABEL[post.kind]}</span>
          <h1 className="text-2xl font-extrabold [overflow-wrap:anywhere]">{post.title}</h1>
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          {post.author?.name ?? '탈퇴한 사용자'} · <time dateTime={post.createdAt.toISOString()}>{fmt(post.createdAt)}</time>
        </p>
      </header>

      <WikiMarkdown source={post.body} ids={false} />

      <div className="flex flex-wrap items-center gap-3">
        <BoardVoteButtons
          endpoint={`/api/posts/${post.id}/vote`}
          initialUp={post.upCount}
          initialDown={post.downCount}
          initialMyVote={(post.votes?.[0]?.type as 'UP' | 'DOWN' | undefined) ?? null}
          own={Boolean(me && post.authorId === me.id)}
        />
        <ReportButton targetType="POST" targetId={post.id} />
      </div>

      <section aria-labelledby="comments-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="comments-h" className="text-xl font-bold">댓글</h2>
          <nav aria-label="댓글 정렬" className="flex gap-3 text-sm">
            {(['best', 'new', 'old'] as const).map((s) => (
              <Link
                key={s}
                href={`${themeHref}/post/${post.id}${s === 'best' ? '' : `?sort=${s}`}`}
                aria-current={sort === s ? 'page' : undefined}
                className={sort === s ? 'font-bold' : ''}
              >
                {SORT_LABEL[s]}
              </Link>
            ))}
          </nav>
        </div>
        <PostThread postId={post.id} tree={tree} />
        {rows.length >= COMMENT_RULES.MAX_PER_ITEM_FETCH ? (
          <p className="text-xs text-fg-subtle">오래된 댓글 {COMMENT_RULES.MAX_PER_ITEM_FETCH}개까지만 표시합니다.</p>
        ) : null}
      </section>
    </article>
  );
}
