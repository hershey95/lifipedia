'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export type ThemeNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  followerCount: number;
  parentId: string | null;
  subThemes?: ThemeNode[];
  _count?: {
    items: number;
  };
};

type ThemeExplorerProps = {
  initialThemes: ThemeNode[];
};

export function ThemeExplorer({ initialThemes }: ThemeExplorerProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'BUBBLE' | 'TREE'>('BUBBLE');

  // 1. 전체 카테고리 목록 추출
  const categories = useMemo(() => {
    const set = new Set<string>();
    const collect = (nodes: ThemeNode[]) => {
      nodes.forEach((node) => {
        if (node.category) set.add(node.category);
        if (node.subThemes) collect(node.subThemes);
      });
    };
    collect(initialThemes);
    return Array.from(set);
  }, [initialThemes]);

  // 2. 현재 선택된 노드 및 브레드크럼(경로) 찾기
  const { currentNodes, breadcrumbs, currentParentNode } = useMemo(() => {
    // 맵 생성
    const nodeMap = new Map<string, ThemeNode>();
    const parentMap = new Map<string, ThemeNode | null>();

    const traverse = (nodes: ThemeNode[], parent: ThemeNode | null) => {
      for (const node of nodes) {
        nodeMap.set(node.id, node);
        parentMap.set(node.id, parent);
        if (node.subThemes) traverse(node.subThemes, node);
      }
    };
    traverse(initialThemes, null);

    if (!selectedParentId) {
      // 최상위 노드들
      return {
        currentNodes: initialThemes,
        breadcrumbs: [{ id: null, name: '전체 테마' }],
        currentParentNode: null,
      };
    }

    const currentParentNode = nodeMap.get(selectedParentId) || null;
    const sub = currentParentNode?.subThemes || [];

    // 브레드크럼 빌드
    const crumbs: { id: string | null; name: string }[] = [];
    let curr: ThemeNode | null = currentParentNode;
    while (curr) {
      crumbs.unshift({ id: curr.id, name: curr.name });
      curr = parentMap.get(curr.id) || null;
    }
    crumbs.unshift({ id: null, name: '전체 테마' });

    return {
      currentNodes: sub.length > 0 ? sub : [currentParentNode!],
      breadcrumbs: crumbs,
      currentParentNode,
    };
  }, [initialThemes, selectedParentId]);

  // 3. 필터링 및 검색 처리
  const filteredNodes = useMemo(() => {
    let list = currentNodes;

    // 카테고리 필터
    if (activeCategory !== 'ALL') {
      list = list.filter((n) => n.category === activeCategory);
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      // 전체 트리에서 검색
      const matches: ThemeNode[] = [];
      const searchTraverse = (nodes: ThemeNode[]) => {
        for (const node of nodes) {
          if (
            node.name.toLowerCase().includes(q) ||
            node.description?.toLowerCase().includes(q) ||
            node.category?.toLowerCase().includes(q)
          ) {
            matches.push(node);
          }
          if (node.subThemes) searchTraverse(node.subThemes);
        }
      };
      searchTraverse(initialThemes);
      return matches;
    }

    return list;
  }, [currentNodes, activeCategory, searchQuery, initialThemes]);

  // 팔로워 수에 따른 노드 버블 크기 계산 (S / M / L / XL)
  const getNodeSizeStyle = (followers: number) => {
    if (followers >= 100) return 'col-span-12 sm:col-span-6 md:col-span-4 p-7 text-xl node-bubble-hot animate-pulse-glow';
    if (followers >= 70) return 'col-span-12 sm:col-span-6 md:col-span-4 p-6 text-lg node-bubble-hot';
    if (followers >= 40) return 'col-span-6 sm:col-span-4 md:col-span-3 p-5 text-base node-bubble-normal';
    return 'col-span-6 sm:col-span-3 md:col-span-2 p-4 text-sm node-bubble-normal';
  };

  return (
    <div className="glass-panel space-y-6">
      {/* 헤더 & 탐색 설명 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="chip bg-accent/20 text-accent border-accent/30">🧠 브레인스토밍 탐색기</span>
            <span className="text-xs text-slate-400">인기도별 반응형 버블 & 멀티 계층</span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white tracking-tight sm:text-3xl">
            핫한 테마를 타고 깊숙이 탐험해보세요
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            대분류(연령대/취미/상황)에서 10대·20대·30대 세분화 테마까지 계속해서 파고들 수 있습니다.
          </p>
        </div>

        {/* 뷰 모드 토글 */}
        <div className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-black/30 p-1 backdrop-blur-md">
          <button
            onClick={() => setViewMode('BUBBLE')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'BUBBLE' ? 'bg-accent text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🫧 핫 테마 버블
          </button>
          <button
            onClick={() => setViewMode('TREE')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'TREE' ? 'bg-accent text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌳 계층 트라이 View
          </button>
        </div>
      </div>

      {/* 실시간 검색 및 카테고리 필터 바 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
        {/* 검색 입력창 */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 30대, 이직, 출산, 자취 등 테마 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field pl-10 pr-8 bg-black/40 text-white placeholder:text-slate-400 border-white/20 focus:border-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* 카테고리 칩 필터 */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`chip cursor-pointer transition-all ${
              activeCategory === 'ALL'
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            전체 보기
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`chip cursor-pointer transition-all ${
                activeCategory === cat
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              #{cat}
            </button>
          ))}
        </div>
      </div>

      {/* 브레드크럼 탐색 경로 Navigation */}
      {!searchQuery && (
        <nav aria-label="테마 브레드크럼" className="flex items-center gap-1.5 overflow-x-auto text-sm py-1">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={crumb.id || 'root'} className="flex items-center gap-1.5 shrink-0">
                {idx > 0 && <span className="text-slate-500 font-bold">›</span>}
                <button
                  onClick={() => setSelectedParentId(crumb.id)}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    isLast
                      ? 'bg-white/15 text-white shadow-inner font-bold border border-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            );
          })}
        </nav>
      )}

      {/* 결과 화면: 버블 모드 vs 트리 모드 */}
      {filteredNodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-400">
          <p className="text-base font-medium">검색어에 부합하는 테마를 찾지 못했습니다.</p>
          <p className="mt-1 text-xs text-slate-500">원하시는 테마를 직접 제안해보세요!</p>
          <Link href="/themes/new" className="btn-primary mt-4 inline-flex no-underline text-xs">
            + 새 테마 제안하기
          </Link>
        </div>
      ) : viewMode === 'BUBBLE' ? (
        /* 반응형 버블 뷰 */
        <div className="grid grid-cols-12 gap-3 pt-2">
          {filteredNodes.map((node) => {
            const hasSub = (node.subThemes?.length || 0) > 0;
            const sizeClass = getNodeSizeStyle(node.followerCount);

            return (
              <div
                key={node.id}
                className={`node-bubble ${sizeClass} group`}
                onClick={() => {
                  if (hasSub && !searchQuery) {
                    setSelectedParentId(node.id);
                  }
                }}
              >
                {/* 상단 태그 & 아이콘 */}
                <div className="flex items-center gap-1.5 mb-1">
                  {node.category && (
                    <span className="chip bg-white/10 text-slate-300 text-[10px]">#{node.category}</span>
                  )}
                  {hasSub && (
                    <span className="chip bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px]">
                      하위 테마 {node.subThemes?.length}개
                    </span>
                  )}
                </div>

                {/* 테마 제목 */}
                <h3 className="font-extrabold text-white group-hover:text-accent transition-colors">
                  {node.name}
                </h3>

                {/* 설명 */}
                {node.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-300/80 font-normal">
                    {node.description}
                  </p>
                )}

                {/* 하단 메타 & 액션 버튼 */}
                <div className="mt-3 flex items-center justify-between w-full pt-2 border-t border-white/10 text-xs text-slate-400">
                  <span>👥 팔로워 {node.followerCount.toLocaleString()}명</span>

                  <div className="flex items-center gap-1.5">
                    {hasSub && !searchQuery ? (
                      <span className="text-accent font-bold group-hover:translate-x-0.5 transition-transform">
                        파고들기 ➔
                      </span>
                    ) : (
                      <Link
                        href={`/theme/${node.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg bg-accent/80 hover:bg-accent px-2.5 py-1 text-white font-semibold no-underline shadow-sm"
                      >
                        랭킹 보기 ➔
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 계층 트리 View */
        <div className="space-y-3 pt-2">
          {filteredNodes.map((node) => (
            <TreeItemKey
              key={node.id}
              node={node}
              onSelectParent={(id) => setSelectedParentId(id)}
            />
          ))}
        </div>
      )}

      {/* 현재 상위 노드의 하위 테마 안내 힌트 */}
      {currentParentNode && (
        <div className="mt-4 rounded-xl border border-white/10 bg-accent/10 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-accent">현재 탐색 중인 테마</span>
            <p className="text-sm font-bold text-white">{currentParentNode.name}</p>
          </div>
          <Link
            href={`/theme/${currentParentNode.slug}`}
            className="btn-primary no-underline text-xs"
          >
            이 테마 랭킹 페이지로 이동 ➔
          </Link>
        </div>
      )}
    </div>
  );
}

function TreeItemKey({
  node,
  onSelectParent,
}: {
  node: ThemeNode;
  onSelectParent: (id: string) => void;
}) {
  const hasSub = (node.subThemes?.length || 0) > 0;

  return (
    <div className="card bg-white/[0.04] hover:bg-white/[0.08] transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {node.category && <span className="chip bg-white/10 text-slate-300 text-[10px]">#{node.category}</span>}
            <h4 className="text-lg font-bold text-white">{node.name}</h4>
          </div>
          {node.description && <p className="text-xs text-slate-300/80">{node.description}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">👥 {node.followerCount}명</span>
          {hasSub ? (
            <button
              onClick={() => onSelectParent(node.id)}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              하위 테마 ({node.subThemes?.length}) ➔
            </button>
          ) : (
            <Link href={`/theme/${node.slug}`} className="btn-primary no-underline text-xs py-1.5 px-3">
              랭킹 보기 ➔
            </Link>
          )}
        </div>
      </div>

      {/* 서브 테마 미리보기 리스트 */}
      {hasSub && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border-t border-white/10 pt-3">
          {node.subThemes!.map((sub) => (
            <div
              key={sub.id}
              onClick={() => onSelectParent(sub.id)}
              className="rounded-xl border border-white/10 bg-black/30 p-2.5 cursor-pointer hover:border-accent/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 group-hover:text-accent">
                  {sub.name}
                </span>
                <span className="text-[10px] text-slate-500">👥 {sub.followerCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
