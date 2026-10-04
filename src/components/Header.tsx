'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthButton } from './AuthButton';

export function Header() {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchVal.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070b14]/90 backdrop-blur-xl transition-all">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        {/* 로고 & 브랜딩 */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white font-black text-xl tracking-tight no-underline hover:opacity-90">
            <span className="rounded-xl bg-gradient-to-r from-indigo-500 to-accent px-2.5 py-1 text-sm shadow-md shadow-indigo-500/30">
              r/
            </span>
            <span>Lifipedia</span>
          </Link>
          <span className="chip bg-white/10 text-slate-300 text-[10px] hidden md:inline-flex">
            집단지성 제품 위키
          </span>
        </div>

        {/* 메인 레딧 스타일 글로벌 검색 바 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <input
              type="search"
              placeholder="🔍 서브 갤러리, 제품 위키, [[교차링크]] 검색..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="field bg-white/5 border-white/15 text-white placeholder:text-slate-400 text-xs py-2 px-4 rounded-xl focus:border-accent shadow-inner"
            />
          </div>
        </form>

        {/* 우측 액션 & 소셜 로그인 Auth */}
        <div className="flex items-center gap-2.5">
          <Link href="/themes/new" className="btn-ghost text-xs py-1.5 px-3 hidden lg:inline-flex no-underline">
            + 갤러리 만들기
          </Link>
          <Link href="/how-ranking-works" className="btn-ghost text-xs py-1.5 px-3 hidden md:inline-flex no-underline">
            ⚡ 랭킹 공식
          </Link>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
