'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** 자격·보호 수준 검사는 서버(POST /api/items/[id]/revert)가 한다. 여기서는 호출과 결과 표시만. */
export function RevertButton({ itemId, toRevision, baseRevision }: { itemId: string; toRevision: number; baseRevision: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revert() {
    if (!window.confirm(`r${toRevision} 내용으로 되돌립니다. 새 리비전이 하나 추가됩니다.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/revert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toRevision, baseRevision }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      setError(data?.error ?? data?.message ?? '되돌리지 못했습니다.');
    } catch {
      setError('네트워크 오류로 되돌리지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-ghost" disabled={busy} aria-busy={busy} onClick={revert}>
        이 리비전으로 되돌리기
      </button>
      {error ? <span role="alert" className="text-xs text-warn-fg">{error}</span> : null}
    </span>
  );
}
