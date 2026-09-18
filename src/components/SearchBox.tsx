'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState('');

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <input
        type="search"
        aria-label="테마·제품 검색"
        placeholder="검색"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-28 rounded-lg border border-black/15 px-3 py-1.5 text-sm outline-none focus:w-44 focus:border-accent sm:w-40 sm:focus:w-56"
      />
    </form>
  );
}
