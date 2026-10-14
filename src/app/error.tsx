'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-xl font-bold text-slate-100">문제가 생겼습니다</h1>
      <p className="text-sm text-slate-400">잠시 후 다시 시도해 주세요. 계속되면 알려 주세요.</p>
      <button type="button" onClick={reset} className="btn-ghost">
        다시 시도
      </button>
    </div>
  );
}
