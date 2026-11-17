import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tx, db, count, auth, recompute } = vi.hoisted(() => ({
  tx: {
    postVote: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    post: { update: vi.fn() },
    postCommentVote: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    postComment: { update: vi.fn(), create: vi.fn() },
    answerItem: { createMany: vi.fn() },
  },
  db: {
    theme: { findUnique: vi.fn() },
    post: { findUnique: vi.fn(), create: vi.fn() },
    postComment: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    item: { update: vi.fn(), count: vi.fn() },
    contributionEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  count: vi.fn(),
  auth: { user: { id: 'u1', trustScore: 1, createdAt: new Date(0), suspendedUntil: null } as Record<string, unknown> | null },
  recompute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/auth', () => ({ currentUser: async () => auth.user, isSuspended: () => false }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), countSince: (...a: unknown[]) => count(...a) }));
vi.mock('@/lib/scoring-service', () => ({ recomputeItemScore: (...a: unknown[]) => recompute(...a) }));

import { POST as createPost } from '@/app/api/themes/[slug]/posts/route';
import { POST as votePost } from '@/app/api/posts/[id]/vote/route';
import { POST as addComment } from '@/app/api/posts/[id]/comments/route';
import { POST as voteComment } from '@/app/api/post-comments/[id]/vote/route';
import { POST as helpful } from '@/app/api/post-comments/[id]/helpful/route';

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });
const validPost = { kind: 'QUESTION', title: '제목', body: '본문' };
const NOW = Date.now();

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'u1', trustScore: 1, createdAt: new Date(0), suspendedUntil: null };
  count.mockResolvedValue(0);
  db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
  db.theme.findUnique.mockResolvedValue({ id: 't1', status: 'ACTIVE' });
  db.post.create.mockResolvedValue({ id: 'p1' });
  db.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'u2', isRemoved: false, theme: { status: 'ACTIVE' } });
  db.postComment.findUnique.mockResolvedValue({
    id: 'c1',
    authorId: 'u2',
    isRemoved: false,
    post: { isRemoved: false, theme: { status: 'ACTIVE' } },
  });
  tx.postVote.findUnique.mockResolvedValue(null);
  tx.postVote.findMany.mockResolvedValue([{ type: 'UP', weight: 1, userId: 'u1', createdAt: new Date(), user: { createdAt: new Date(0) } }]);
  tx.postCommentVote.findUnique.mockResolvedValue(null);
  tx.postCommentVote.findMany.mockResolvedValue([]);
});

describe('POST /api/themes/[slug]/posts', () => {
  const call = (b: unknown = validPost) => createPost(req(b), params({ slug: 's' }));
  it('비로그인 401', async () => {
    auth.user = null;
    expect((await call()).status).toBe(401);
  });
  it('성공 201', async () => {
    const res = await call();
    expect(res.status).toBe(201);
    expect((await res.json()).post.id).toBe('p1');
    expect(db.post.create.mock.calls[0][0].data).toMatchObject({ themeId: 't1', authorId: 'u1', kind: 'QUESTION' });
  });
  it('가입 7일 미만 계정은 하루 3개: 4번째 429', async () => {
    auth.user = { id: 'u1', trustScore: 1, createdAt: new Date(NOW - 86_400_000), suspendedUntil: null };
    count.mockResolvedValue(3);
    expect((await call()).status).toBe(429);
    count.mockResolvedValue(2);
    expect((await call()).status).toBe(201);
  });
  it('오래된 계정은 3개를 넘어도 10개까지', async () => {
    count.mockResolvedValue(9);
    expect((await call()).status).toBe(201);
    count.mockResolvedValue(10);
    expect((await call()).status).toBe(429);
  });
  it('비ACTIVE 갤러리 403, 없는 갤러리 404, 잘못된 본문 400', async () => {
    db.theme.findUnique.mockResolvedValue({ id: 't1', status: 'PROPOSED' });
    expect((await call()).status).toBe(403);
    db.theme.findUnique.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    expect((await call({ ...validPost, title: '' })).status).toBe(400);
  });
});

describe('POST /api/posts/[id]/vote', () => {
  const call = (type = 'UP') => votePost(req({ type }), params({ id: 'p1' }));
  it('신규 created, 같은 방향 removed, 반대 changed', async () => {
    expect((await (await call()).json()).action).toBe('created');
    expect(tx.postVote.create).toHaveBeenCalledTimes(1);
    tx.postVote.findUnique.mockResolvedValue({ type: 'UP' });
    expect((await (await call('UP')).json()).action).toBe('removed');
    expect(tx.postVote.delete).toHaveBeenCalled();
    expect((await (await call('DOWN')).json()).action).toBe('changed');
    expect(tx.postVote.update).toHaveBeenCalled();
  });
  it('쓰기는 트랜잭션 안에서만, 집계 캐시를 갱신하고 랭킹·기여는 건드리지 않는다', async () => {
    await call();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.post.update.mock.calls[0][0].data).toMatchObject({ upCount: 1, downCount: 0 });
    expect(recompute).not.toHaveBeenCalled();
    expect(db.item.update).not.toHaveBeenCalled();
    expect(db.contributionEvent.create).not.toHaveBeenCalled();
  });
  it('본인 글 403, 삭제 글 404, 비로그인 401', async () => {
    db.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'u1', isRemoved: false, theme: { status: 'ACTIVE' } });
    expect((await call()).status).toBe(403);
    db.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'u2', isRemoved: true, theme: { status: 'ACTIVE' } });
    expect((await call()).status).toBe(404);
    auth.user = null;
    expect((await call()).status).toBe(401);
  });
  it('글·댓글 투표 합계가 120 이면 429', async () => {
    count.mockResolvedValueOnce(60).mockResolvedValueOnce(60);
    expect((await call()).status).toBe(429);
  });
  it('동시 요청 P2002 는 409', async () => {
    db.$transaction.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
    expect((await call()).status).toBe(409);
  });
});

describe('POST /api/post-comments/[id]/vote', () => {
  const call = (type = 'UP') => voteComment(req({ type }), params({ id: 'c1' }));
  it('신규 created 이고 댓글 집계를 갱신한다', async () => {
    expect((await (await call()).json()).action).toBe('created');
    expect(tx.postComment.update).toHaveBeenCalledTimes(1);
    expect(recompute).not.toHaveBeenCalled();
  });
  it('본인 댓글 403, 삭제 댓글 404', async () => {
    db.postComment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u1', isRemoved: false, post: { isRemoved: false, theme: { status: 'ACTIVE' } } });
    expect((await call()).status).toBe(403);
    db.postComment.findUnique.mockResolvedValue({ id: 'c1', authorId: 'u2', isRemoved: true, post: { isRemoved: false, theme: { status: 'ACTIVE' } } });
    expect((await call()).status).toBe(404);
  });
});

describe('POST /api/posts/[id]/comments', () => {
  const call = (b: unknown = { bodyText: '댓글' }) => addComment(req(b), params({ id: 'p1' }));
  const ID = (n: number) => `ckabcdefghijklmnopqrstuv${n}`; // cuid 모양 25자
  beforeEach(() => {
    db.post.findUnique.mockResolvedValue({ id: 'p1', kind: 'QUESTION', isRemoved: false });
    tx.postComment.create.mockResolvedValue({ id: 'c9' });
    db.item.count.mockResolvedValue(2);
  });
  it('성공 201', async () => {
    expect((await call()).status).toBe(201);
    expect(tx.answerItem.createMany).not.toHaveBeenCalled();
  });
  it('다른 글의 parentId 는 400', async () => {
    db.postComment.findUnique.mockResolvedValue({ postId: 'other' });
    expect((await call({ bodyText: 'x', parentId: ID(1) })).status).toBe(400);
    expect(tx.postComment.create).not.toHaveBeenCalled();
  });
  it('삭제 글 404, 시간당 20개 초과 429', async () => {
    db.post.findUnique.mockResolvedValue({ id: 'p1', kind: 'QUESTION', isRemoved: true });
    expect((await call()).status).toBe(404);
    count.mockResolvedValue(20);
    expect((await call()).status).toBe(429);
  });
  it('답변에 문서 2개 첨부: 같은 트랜잭션에서 answerItem 생성', async () => {
    expect((await call({ bodyText: 'x', itemIds: [ID(1), ID(2)] })).status).toBe(201);
    expect(tx.answerItem.createMany.mock.calls[0][0].data).toEqual([
      { commentId: 'c9', itemId: ID(1) },
      { commentId: 'c9', itemId: ID(2) },
    ]);
  });
  it('첨부 4개 → 400', async () => {
    expect((await call({ bodyText: 'x', itemIds: [ID(1), ID(2), ID(3), ID(4)] })).status).toBe(400);
  });
  it('후기 글·답글에 첨부 → 400', async () => {
    db.post.findUnique.mockResolvedValue({ id: 'p1', kind: 'REVIEW', isRemoved: false });
    expect((await call({ bodyText: 'x', itemIds: [ID(1)] })).status).toBe(400);
    db.post.findUnique.mockResolvedValue({ id: 'p1', kind: 'QUESTION', isRemoved: false });
    db.postComment.findUnique.mockResolvedValue({ postId: 'p1' });
    expect((await call({ bodyText: 'x', parentId: ID(5), itemIds: [ID(1)] })).status).toBe(400);
    expect(tx.postComment.create).not.toHaveBeenCalled();
  });
  it('삭제·없는 문서가 섞이면 400', async () => {
    db.item.count.mockResolvedValue(1);
    expect((await call({ bodyText: 'x', itemIds: [ID(1), ID(2)] })).status).toBe(400);
    expect(db.item.count.mock.calls[0][0].where).toMatchObject({ isRemoved: false });
  });
});

describe('POST /api/post-comments/[id]/helpful', () => {
  const call = () => helpful(req({}), params({ id: 'c1' }));
  const answer = (over: Record<string, unknown> = {}) => ({
    id: 'c1', postId: 'p1', parentId: null, authorId: 'u2', isRemoved: false, helpfulAt: null,
    post: { authorId: 'u1', kind: 'QUESTION', isRemoved: false },
    ...over,
  });
  beforeEach(() => {
    db.postComment.findUnique.mockResolvedValue(answer());
    db.postComment.count.mockResolvedValue(0);
  });
  it('글 작성자가 누르면 표시하고, 기여 원장은 건드리지 않는다', async () => {
    const res = await call();
    expect((await res.json()).helpful).toBe(true);
    expect(db.postComment.update.mock.calls[0][0].data.helpfulAt).toBeInstanceOf(Date);
    expect(db.contributionEvent.create).not.toHaveBeenCalled();
  });
  it('이미 표시된 답변을 다시 누르면 해제(상한과 무관)', async () => {
    db.postComment.findUnique.mockResolvedValue(answer({ helpfulAt: new Date() }));
    db.postComment.count.mockResolvedValue(3);
    expect((await (await call()).json()).helpful).toBe(false);
    expect(db.postComment.update.mock.calls[0][0].data.helpfulAt).toBeNull();
  });
  it('남이 누르면 403, 4번째는 409', async () => {
    db.postComment.findUnique.mockResolvedValue(answer({ post: { authorId: 'u9', kind: 'QUESTION', isRemoved: false } }));
    expect((await call()).status).toBe(403);
    db.postComment.findUnique.mockResolvedValue(answer());
    db.postComment.count.mockResolvedValue(3);
    expect((await call()).status).toBe(409);
    expect(db.postComment.update).not.toHaveBeenCalled();
  });
  it('답변이 아니거나(후기·답글) 본인 답변이면 거절', async () => {
    db.postComment.findUnique.mockResolvedValue(answer({ post: { authorId: 'u1', kind: 'REVIEW', isRemoved: false } }));
    expect((await call()).status).toBe(400);
    db.postComment.findUnique.mockResolvedValue(answer({ authorId: 'u1' }));
    expect((await call()).status).toBe(403);
  });
  it('비로그인 401, 삭제 답변 404', async () => {
    db.postComment.findUnique.mockResolvedValue(answer({ isRemoved: true }));
    expect((await call()).status).toBe(404);
    auth.user = null;
    expect((await call()).status).toBe(401);
  });
});
