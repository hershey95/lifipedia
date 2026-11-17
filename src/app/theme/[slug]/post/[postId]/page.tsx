import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { POST_KIND_LABEL, isAnswer, itemTallyForPost } from '@/lib/board';
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
      upCount: true, downCount: true, authorId: true, helpfulAt: true,
      author: { select: { name: true } },
      votes: me ? { where: { userId: me.id }, select: { type: true } } : false,
      items: {
        where: { item: { isRemoved: false } },
        select: { item: { select: { id: true, name: true, slug: true, theme: { select: { slug: true, name: true } } } } },
      },
    },
  });

  const isQuestion = post.kind === 'QUESTION';
  const isPostAuthor = Boolean(me && post.authorId === me.id);
  // 추천 요청: 문서별 집계(그 글 안에서만 보인다, 문서 점수와 무관)
  const answerVotes = isQuestion
    ? await prisma.postCommentVote.findMany({
        where: { comment: { postId, parentId: null } },
        select: { commentId: true, type: true, weight: true },
      })
    : [];
  const attachedByItem = new Map(rows.flatMap((r) => r.items.map((a) => [a.item.id, a.item] as const)));
  const tally = isQuestion
    ? itemTallyForPost(
        rows
          .filter((r) => r.parentId === null)
          .map((r) => ({
            isRemoved: r.isRemoved,
            itemIds: r.items.map((a) => a.item.id),
            votes: answerVotes.filter((v) => v.commentId === r.id),
            helpfulAt: r.helpfulAt,
          })),
      ).filter((t) => attachedByItem.has(t.itemId))
    : [];

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
    items: n.items.map((a) => ({
      id: a.item.id, name: a.item.name, slug: a.item.slug, themeSlug: a.item.theme.slug, themeName: a.item.theme.name,
    })),
    helpful: n.helpfulAt !== null,
    canMarkHelpful: isPostAuthor && isAnswer(post, n) && !n.isRemoved && n.authorId !== me?.id,
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

      {tally.length > 0 ? (
        <section aria-labelledby="tally-h" className="flex flex-col gap-2">
          <h2 id="tally-h" className="text-xl font-bold">이 추천 요청에서 추천된 문서</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">답변이 첨부한 문서별 집계</caption>
              <thead className="text-left text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="py-1 pr-2">문서</th>
                  <th scope="col" className="py-1 pr-2 text-right">가중 추천</th>
                  <th scope="col" className="py-1 pr-2 text-right">답변 수</th>
                  <th scope="col" className="py-1">도움됨</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tally.map((t) => {
                  const it = attachedByItem.get(t.itemId)!;
                  return (
                    <tr key={t.itemId}>
                      <td className="py-2 pr-2">
                        <Link href={`/theme/${encodeURIComponent(it.theme.slug)}/item/${it.slug}`} className="font-semibold">{it.name}</Link>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{t.weightedUp.toFixed(1)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{t.answerCount}</td>
                      <td className="py-2">{t.helpful ? <span className="chip">도움됨</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-fg-subtle">이 숫자는 이 글 안에서만 보이며 문서 점수에는 들어가지 않습니다.</p>
        </section>
      ) : null}

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
        <PostThread postId={post.id} tree={tree} isQuestion={isQuestion} />
        {rows.length >= COMMENT_RULES.MAX_PER_ITEM_FETCH ? (
          <p className="text-xs text-fg-subtle">오래된 댓글 {COMMENT_RULES.MAX_PER_ITEM_FETCH}개까지만 표시합니다.</p>
        ) : null}
      </section>
    </article>
  );
}
