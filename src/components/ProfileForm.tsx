'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export function ProfileForm({
  initialName,
  initialBio,
  disabled,
}: {
  initialName: string;
  initialBio: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [expired, setExpired] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      });
      if (res.ok) {
        setMessage('저장했습니다.');
        router.refresh();
        await update();
      } else if (res.status === 401) {
        setExpired(true);
        setMessage('로그인이 만료되었습니다.');
      } else if (res.status === 400 || res.status === 403) {
        setMessage((await res.json().catch(() => null))?.error ?? '저장할 수 없습니다.');
      } else {
        setMessage('잠시 후 다시 시도해 주세요.');
      }
    } catch {
      setMessage('잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="me-name" className="text-sm font-semibold">
          이름
        </label>
        <input
          id="me-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          required
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="me-bio" className="text-sm font-semibold">
          소개 <span className="font-normal text-ink/50">({bio.length}/200)</span>
        </label>
        <textarea
          id="me-bio"
          className="field min-h-24"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          disabled={disabled}
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy || disabled}>
          {busy ? '저장 중…' : '저장'}
        </button>
        {disabled ? <span className="text-xs text-ink/60">제재 중에는 프로필을 수정할 수 없습니다.</span> : null}
        {expired ? (
          <button type="button" className="btn-ghost" onClick={() => signIn(undefined, { callbackUrl: '/me' })}>
            다시 로그인
          </button>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-ink/70">
        {message}
      </p>
    </form>
  );
}
