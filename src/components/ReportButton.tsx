'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

const REASONS = [
  { value: 'SPAM', label: '스팸' },
  { value: 'ADVERTISING', label: '광고/홍보' },
  { value: 'VOTE_MANIPULATION', label: '투표 조작 의심' },
  { value: 'ABUSIVE', label: '욕설/비방' },
  { value: 'COPYRIGHT', label: '저작권 침해' },
  { value: 'OTHER', label: '기타' },
] as const;

type Props = { targetType: 'ITEM' | 'COMMENT' | 'THEME'; targetId: string };

export function ReportButton({ targetType, targetId }: Props) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [detail, setDetail] = useState('');
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs text-ink/50">신고 접수됨</span>;

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost text-ink/50"
        onClick={() => (status === 'authenticated' ? setOpen(true) : void signIn())}
      >
        신고
      </button>
    );
  }

  return (
    <form
      className="card absolute z-20 mt-2 flex w-72 flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ targetType, targetId, reason, detail: detail || undefined }),
        });
        setOpen(false);
        setDone(true);
      }}
    >
      <p className="text-sm font-semibold">신고 사유</p>
      <select className="field" value={reason} onChange={(event) => setReason(event.target.value)}>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <textarea
        className="field min-h-16"
        placeholder="자세한 내용 (선택)"
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        maxLength={2000}
      />
      <p className="text-xs text-ink/50">
        운영자는 규칙 위반 여부만 판단하며, 콘텐츠의 옳고 그름이나 순위에는 개입하지 않습니다.
      </p>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">신고</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>취소</button>
      </div>
    </form>
  );
}
