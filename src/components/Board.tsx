import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BOARD_RULES, POST_KINDS, POST_KIND_LABEL, boardHref, type BoardParams } from '@/lib/board';
import { FEED_ORDER_BY } from '@/lib/feed';

const fmt = (d: Date) => d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' });
const SORT_LABEL = { hot: '인기', new: '최신', top: '추천순' } as const;

/**
 * 게시판 목록(서버 컴포넌트). 상황 갤러리·분류 갤러리 공용.
 * base 는 목록이 놓인 URL(쿼리 포함 가능, 예: /theme/a?tab=board). 기본값 키는 URL 에서 뺀다.
 */
export async function Board({
  themeId,
  themeSlug,
  base,
  params,
  canWrite,
}: {
  themeId: string;
  themeSlug: string;
  base: string;
  params: BoardParams;
  canWrite: boolean;
}) {
  const { kind, sort, page } = params;
  const rows = await prisma.post.findMany({
    where: { themeId, isRemoved: false, ...(kind && { kind }) },
    orderBy: [...FEED_ORDER_BY[sort]],
    skip: (page - 1) * BOARD_RULES.PAGE_SIZE,
    take: BOARD_RULES.PAGE_SIZE + 1, // 한 개 더 읽어 다음 쪽이 있는지 안다
    select: {
      id: true, kind: true, title: true, createdAt: true, upCount: true,
      author: { select: { name: true } },
      _count: { select: { comments: { where: { isRemoved: false } } } },
    },
  });
  const hasMore = rows.length > BOARD_RULES.PAGE_SIZE;
  const posts = rows.slice(0, BOARD_RULES.PAGE_SIZE);
  const newHref = `/theme/${encodeURIComponent(themeSlug)}/post/new`;

  return (
    <section aria-labelledby="board-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="board-h" className="text-xl font-bold">게시판</h2>
        {canWrite ? (
          <Link href={newHref} className="btn-ghost no-underline">글쓰기</Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <nav aria-label="글 종류" className="flex flex-wrap items-center gap-2">
          {[null, ...POST_KINDS].map((k) => (
            <Link
              key={k ?? 'all'}
              href={boardHref(base, { kind: k, sort })}
              aria-current={kind === k ? 'page' : undefined}
              className={kind === k ? 'font-bold' : ''}
            >
              {k ? POST_KIND_LABEL[k] : '전체'}
            </Link>
          ))}
        </nav>
        <nav aria-label="글 정렬" className="flex flex-wrap items-center gap-2">
          <span className="text-fg-muted">정렬</span>
          {(['hot', 'new', 'top'] as const).map((s) => (
            <Link
              key={s}
              href={boardHref(base, { kind, sort: s })}
              aria-current={sort === s ? 'page' : undefined}
              className={sort === s ? 'font-bold' : ''}
            >
              {SORT_LABEL[s]}
            </Link>
          ))}
        </nav>
      </div>

      {posts.length === 0 ? (
        <p className="card text-sm text-fg-muted">
          아직 게시판 글이 없습니다.{' '}
          {canWrite ? <Link href={newHref}>첫 글을 써 보세요.</Link> : null}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className="chip">{POST_KIND_LABEL[p.kind]}</span>
              <Link href={`/theme/${encodeURIComponent(themeSlug)}/post/${p.id}`} className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">
                {p.title}
              </Link>
              <span className="text-xs text-fg-muted">
                {p.author?.name ?? '탈퇴한 사용자'} · {fmt(p.createdAt)} · ▲{p.upCount} · 댓글 {p._count.comments}
              </span>
            </li>
          ))}
        </ul>
      )}

      {page > 1 || hasMore ? (
        <nav aria-label="글 쪽 이동" className="flex gap-4 text-sm">
          {page > 1 ? <Link href={boardHref(base, { kind, sort, page: page - 1 })}>이전</Link> : null}
          {hasMore ? <Link href={boardHref(base, { kind, sort, page: page + 1 })}>더 보기</Link> : null}
        </nav>
      ) : null}
    </section>
  );
}
