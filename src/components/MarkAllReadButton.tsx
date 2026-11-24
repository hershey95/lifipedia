'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) router.refresh();
      else setError('읽음 처리하지 못했습니다.');
    } catch {
      setError('네트워크 오류로 읽음 처리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-ghost text-xs" disabled={busy} aria-busy={busy} onClick={run}>
        모두 읽음으로 표시
      </button>
      {error ? <span role="alert" className="text-xs text-warn-fg">{error}</span> : null}
    </span>
  );
}
