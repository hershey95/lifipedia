'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type SidebarCategoryGroup = {
  hubName: string;
  icon: string;
  galleries: {
    name: string;
    slug: string;
    followerCount: number;
    category: string | null;
  }[];
};

type SidebarProps = {
  groups: SidebarCategoryGroup[];
};

export function Sidebar({ groups }: SidebarProps) {
  const pathname = usePathname();
  const [openHubs, setOpenHubs] = useState<Record<string, boolean>>({
    '연령/생애주기': true,
    '주거/공간': true,
    '취미/아웃도어': true,
    '상황/선물': true,
    '테크/가전': true,
  });

  const toggleHub = (name: string) => {
    setOpenHubs((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6 select-none">
      {/* 🏛️ 레딧/디시 스타일 5대 라이프 허브 사이드바 */}
      <div className="card bg-slate-900/80 border-white/10 p-4 space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-black text-slate-300 tracking-wider">🏛️ 5대 라이프 허브</span>
          <span className="chip bg-accent/20 text-accent text-[10px]">r/Lifipedia</span>
        </div>

        {/* 5대 허브 그룹 아코디언 */}
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = openHubs[group.hubName] ?? true;

            return (
              <div key={group.hubName} className="space-y-1">
                {/* 허브 헤더 (클릭 접기/펼치기) */}
                <button
                  onClick={() => toggleHub(group.hubName)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-300 font-bold text-xs transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{group.icon}</span>
                    <span>{group.hubName}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">{isOpen ? '▼' : '▶'}</span>
                </button>

                {/* 서브 갤러리 리스트 */}
                {isOpen && (
                  <ul className="pl-3 space-y-0.5 border-l border-white/10 ml-2">
                    {group.galleries.map((gal) => {
                      const isActive = pathname === `/gallery/${gal.slug}`;
                      return (
                        <li key={gal.slug}>
                          <Link
                            href={`/gallery/${gal.slug}`}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline transition-all ${
                              isActive
                                ? 'bg-accent text-white font-bold shadow-md shadow-accent/20'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{gal.name}</span>
                            <span className="text-[10px] text-slate-500 shrink-0 font-normal">
                              👥 {gal.followerCount}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 🔥 핫 갤러리 뱃지 & 액션 */}
      <div className="card bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border-white/15 p-4 space-y-3">
        <h4 className="text-xs font-extrabold text-white flex items-center gap-1">
          <span>🚀 나만의 서브 갤러리</span>
        </h4>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          새로운 관심사나 위키 주제가 필요하다면 누구나 서브 갤러리를 개설할 수 있습니다.
        </p>
        <Link href="/themes/new" className="btn-primary w-full text-xs py-2 no-underline text-center justify-center">
          + 서브 갤러리 만들기
        </Link>
      </div>
    </aside>
  );
}
