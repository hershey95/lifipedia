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
  const [failed, setFailed] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        if (saved) {
          setName(saved.name ?? '');
          setBio(saved.bio ?? '');
        }
        setMessage('저장했습니다.');
        setFailed(false);
        router.refresh();
        await update().catch(() => undefined); // 저장은 끝났으므로 헤더 갱신 실패가 결과를 덮어쓰지 않게 한다
      } else if (res.status === 401) {
        setExpired(true);
        setFailed(true);
        setMessage('로그인이 만료되었습니다.');
      } else if (res.status === 400 || res.status === 403) {
        const data = await res.json().catch(() => null);
        setFailed(true);
        setMessage(data?.issues?.[0]?.message ?? data?.error ?? '저장할 수 없습니다.');
      } else {
        setFailed(true);
        setMessage('잠시 후 다시 시도해 주세요.');
      }
    } catch {
      setFailed(true);
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
          소개 <span className="font-normal text-slate-400">({bio.length}/200)</span>
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
        {disabled ? <span className="text-xs text-slate-400">제재 중에는 프로필을 수정할 수 없습니다.</span> : null}
        {expired ? (
          <button type="button" className="btn-ghost" onClick={() => signIn(undefined, { callbackUrl: '/me' })}>
            다시 로그인
          </button>
        ) : null}
      </div>
      <p
        role={failed ? 'alert' : 'status'}
        aria-live={failed ? 'assertive' : 'polite'}
        className={`min-h-5 text-sm ${failed ? 'text-red-300' : 'text-slate-300'}`}
      >
        {message}
      </p>
    </form>
  );
}
