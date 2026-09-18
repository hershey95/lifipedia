'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

export function ProposeThemeForm() {
  const { status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== 'authenticated') {
      void signIn();
      return;
    }
    setBusy(true);
    setError(null);

    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? '제안에 실패했습니다.');
      return;
    }
    router.push(`/theme/${data.theme.slug}`);
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">테마 이름</span>
        <input
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 자취 인생템"
          required
          minLength={2}
          maxLength={40}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">설명 <span className="font-normal text-ink/40">(선택)</span></span>
        <textarea
          className="field min-h-24"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="어떤 사람에게, 어떤 상황에 필요한 테마인지 적어 주세요."
          maxLength={500}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? '제안 중…' : '제안하기'}
      </button>
    </form>
  );
}
