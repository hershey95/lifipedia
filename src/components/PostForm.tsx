'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { POST_KINDS, POST_KIND_LABEL, BOARD_RULES, type PostKindValue } from '@/lib/board';

/** 게시판 글쓰기. 본문은 마크다운(raw HTML 은 렌더되지 않는다). 비로그인은 페이지가 로그인으로 보낸다. */
export function PostForm({ themeSlug }: { themeSlug: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<PostKindValue>('QUESTION');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          const response = await fetch(`/api/themes/${encodeURIComponent(themeSlug)}/posts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind, title, body }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? '등록에 실패했습니다.');
            return;
          }
          router.push(`/theme/${encodeURIComponent(themeSlug)}/post/${data.post.id}`);
        } catch {
          setError('네트워크 오류로 등록에 실패했습니다.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        종류
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value as PostKindValue)}>
          {POST_KINDS.map((k) => (
            <option key={k} value={k}>{POST_KIND_LABEL[k]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        제목
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={BOARD_RULES.TITLE_MAX} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        본문 <span className="text-xs font-normal text-fg-subtle">마크다운을 쓸 수 있습니다</span>
        <textarea
          className="field min-h-48 font-normal"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={BOARD_RULES.BODY_MAX}
        />
      </label>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? '등록 중…' : '등록'}
      </button>
    </form>
  );
}
