'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { MindMapDrawer, SelectedNodeData } from './MindMapDrawer';

export type RawThemeNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  followerCount: number;
  parentId: string | null;
  subThemes?: RawThemeNode[];
  items?: {
    id: string;
    slug: string;
    name: string;
    tier: 'BUDGET' | 'MID' | 'PREMIUM';
    priceKrw?: number | null;
    score: number;
    description: string;
  }[];
};

type MindMapCanvasProps = {
  initialThemes: RawThemeNode[];
};

type FlatNode = {
  id: string;
  type: 'ROOT' | 'CATEGORY' | 'THEME' | 'ITEM';
  name: string;
  description?: string | null;
  category?: string | null;
  followerCount?: number;
  slug?: string;
  themeSlug?: string;
  tier?: 'BUDGET' | 'MID' | 'PREMIUM';
  priceKrw?: number | null;
  score?: number;
  subThemesCount?: number;
  parentId: string | null;
  depth: number;
  x: number;
  y: number;
  hasChildren: boolean;
};

type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function MindMapCanvas({ initialThemes }: MindMapCanvasProps) {
  // 캔버스 인터랙션 상태 (Pan & Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 노드 확장/접기 상태 (Expanded Node IDs)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    set.add('root');
    initialThemes.forEach((t) => set.add(t.id)); // 루트 테마들 기본 펼침
    return set;
  });

  // 검색어 및 선택된 노드 (Drawer)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 트리 노드 2D 방사형/계층 좌표(Layout Engine) 계산
  const { nodes, edges } = useMemo(() => {
    const flatNodes: FlatNode[] = [];
    const flatEdges: Edge[] = [];

    // 루트 노드 (Lifipedia)
    flatNodes.push({
      id: 'root',
      type: 'ROOT',
      name: 'Lifipedia 🌟',
      description: '유저 주도 랭킹 커뮤니티 마인드맵',
      parentId: null,
      depth: 0,
      x: 0,
      y: 0,
      hasChildren: initialThemes.length > 0,
    });

    if (!expandedNodeIds.has('root')) {
      return { nodes: flatNodes, edges: flatEdges };
    }

    // Level 1: 루트 테마 카테고리 노드들배치
    const rootCount = initialThemes.length;
    const level1Radius = 260;

    initialThemes.forEach((theme, idx) => {
      const angle = (idx / rootCount) * 2 * Math.PI - Math.PI / 2;
      const x1 = Math.cos(angle) * level1Radius;
      const y1 = Math.sin(angle) * level1Radius;

      const subCount = (theme.subThemes?.length || 0) + (theme.items?.length || 0);

      flatNodes.push({
        id: theme.id,
        type: 'CATEGORY',
        name: theme.name,
        description: theme.description,
        category: theme.category,
        followerCount: theme.followerCount,
        slug: theme.slug,
        subThemesCount: theme.subThemes?.length || 0,
        parentId: 'root',
        depth: 1,
        x: x1,
        y: y1,
        hasChildren: subCount > 0,
      });

      flatEdges.push({
        id: `root->${theme.id}`,
        sourceId: 'root',
        targetId: theme.id,
        x1: 0,
        y1: 0,
        x2: x1,
        y2: y1,
      });

      // Level 2 & 3: 하위 테마 재귀 배치 (펼침 상태인 경우)
      if (expandedNodeIds.has(theme.id) && theme.subThemes) {
        const subCount = theme.subThemes.length;
        const arcSpread = Math.PI / 1.5; // 방사 각도 범위
        const startAngle = angle - arcSpread / 2;
        const level2Radius = 240;

        theme.subThemes.forEach((sub, subIdx) => {
          const subAngle = startAngle + (subIdx / Math.max(1, subCount - 1)) * arcSpread;
          const x2 = x1 + Math.cos(subAngle) * level2Radius;
          const y2 = y1 + Math.sin(subAngle) * level2Radius;

          const itemChildren = sub.items?.length || 0;
          const hasGrandChildren = (sub.subThemes?.length || 0) + itemChildren > 0;

          flatNodes.push({
            id: sub.id,
            type: 'THEME',
            name: sub.name,
            description: sub.description,
            category: sub.category,
            followerCount: sub.followerCount,
            slug: sub.slug,
            subThemesCount: sub.subThemes?.length || 0,
            parentId: theme.id,
            depth: 2,
            x: x2,
            y: y2,
            hasChildren: hasGrandChildren,
          });

          flatEdges.push({
            id: `${theme.id}->${sub.id}`,
            sourceId: theme.id,
            targetId: sub.id,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
          });

          // Level 3/4: 세분화 하위 테마 또는 제품 위키 아이템
          if (expandedNodeIds.has(sub.id)) {
            // 하위 테마
            if (sub.subThemes && sub.subThemes.length > 0) {
              const deepCount = sub.subThemes.length;
              sub.subThemes.forEach((deep, deepIdx) => {
                const deepAngle = subAngle + ((deepIdx - (deepCount - 1) / 2) * 0.4);
                const x3 = x2 + Math.cos(deepAngle) * 220;
                const y3 = y2 + Math.sin(deepAngle) * 220;

                flatNodes.push({
                  id: deep.id,
                  type: 'THEME',
                  name: deep.name,
                  description: deep.description,
                  category: deep.category,
                  followerCount: deep.followerCount,
                  slug: deep.slug,
                  parentId: sub.id,
                  depth: 3,
                  x: x3,
                  y: y3,
                  hasChildren: false,
                });

                flatEdges.push({
                  id: `${sub.id}->${deep.id}`,
                  sourceId: sub.id,
                  targetId: deep.id,
                  x1: x2,
                  y1: y2,
                  x2: x3,
                  y2: y3,
                });
              });
            }

            // 제품 위키 아이템
            if (sub.items && sub.items.length > 0) {
              const itemCount = sub.items.length;
              sub.items.forEach((item, itemIdx) => {
                const itemAngle = subAngle + ((itemIdx - (itemCount - 1) / 2) * 0.35);
                const x3 = x2 + Math.cos(itemAngle) * 210;
                const y3 = y2 + Math.sin(itemAngle) * 210;

                flatNodes.push({
                  id: item.id,
                  type: 'ITEM',
                  name: item.name,
                  description: item.description,
                  tier: item.tier,
                  priceKrw: item.priceKrw,
                  score: item.score,
                  slug: item.slug,
                  themeSlug: sub.slug,
                  parentId: sub.id,
                  depth: 3,
                  x: x3,
                  y: y3,
                  hasChildren: false,
                });

                flatEdges.push({
                  id: `${sub.id}->${item.id}`,
                  sourceId: sub.id,
                  targetId: item.id,
                  x1: x2,
                  y1: y2,
                  x2: x3,
                  y2: y3,
                });
              });
            }
          }
        });
      }
    });

    return { nodes: flatNodes, edges: flatEdges };
  }, [initialThemes, expandedNodeIds]);

  // 검색어 일치 노드 목록
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (
        n.name.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      ) {
        set.add(n.id);
      }
    });
    return set;
  }, [nodes, searchQuery]);

  // 캔버스 드래그 Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'DIV' && (e.target as HTMLElement).tagName !== 'svg') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // 줌 조절 (Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(2.2, Math.max(0.4, z + delta)));
  };

  // 노드 클릭 (확장/접기 + Drawer)
  const handleNodeClick = (node: FlatNode) => {
    if (node.hasChildren) {
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    }

    setSelectedNode(node);
  };

  return (
    <div className="relative w-full h-[650px] rounded-3xl overflow-hidden border border-white/15 bg-[#070b14] shadow-2xl select-none">
      {/* 캔버스 상단 컨트롤 바 */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
        <span className="chip bg-accent/20 text-accent border-accent/30 text-xs font-bold px-3">
          🌌 마인드맵 인터랙티브 캔버스
        </span>

        {/* 줌 조절 버튼 */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
            className="w-7 h-7 rounded-lg text-white font-bold bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-sm"
          >
            +
          </button>
          <span className="text-xs text-slate-300 font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="w-7 h-7 rounded-lg text-white font-bold bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-sm"
          >
            -
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 우측 상단 검색어 필터 */}
      <div className="absolute top-4 right-4 z-20 max-w-xs w-full">
        <input
          type="text"
          placeholder="🔍 마인드맵 노드 검색 (30대, 이직, 캠핑...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="field bg-black/60 text-white placeholder:text-slate-400 border-white/20 text-xs py-2 backdrop-blur-xl shadow-lg focus:border-accent"
        />
      </div>

      {/* 마인드맵 메인 캔버스 뷰포트 */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative overflow-hidden`}
      >
        <div
          className="absolute inset-0 transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* SVG 엣지 곡선 Connection Lines */}
          <svg className="absolute overflow-visible w-full h-full pointer-events-none" style={{ left: '50%', top: '50%' }}>
            <defs>
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b5bdb" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#9c36b5" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="edge-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
              </linearGradient>
            </defs>

            {edges.map((edge) => {
              const dx = (edge.x2 - edge.x1) * 0.5;
              const pathD = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${edge.y1}, ${edge.x2 - dx} ${edge.y2}, ${edge.x2} ${edge.y2}`;
              const isHovered = hoveredNodeId === edge.targetId || hoveredNodeId === edge.sourceId;
              const isMatch = matchingNodeIds.has(edge.targetId) || matchingNodeIds.has(edge.sourceId);

              return (
                <path
                  key={edge.id}
                  d={pathD}
                  fill="none"
                  stroke={isHovered || isMatch ? 'url(#edge-highlight)' : 'url(#edge-gradient)'}
                  strokeWidth={isHovered || isMatch ? 3.5 : 2}
                  strokeDasharray={isHovered ? '6 3' : 'none'}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* HTML 노드 카드 레이어 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            {nodes.map((node) => {
              const isExpanded = expandedNodeIds.has(node.id);
              const isMatch = matchingNodeIds.has(node.id);
              const isHovered = hoveredNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    transform: `translate(${node.x}px, ${node.y}px)`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer ${
                    node.type === 'ROOT'
                      ? 'w-44 h-44 rounded-full bg-gradient-to-tr from-indigo-600 via-accent to-purple-600 border-4 border-white/60 shadow-2xl shadow-accent/50 flex flex-col items-center justify-center text-center p-3 z-30 animate-pulse-glow'
                      : node.type === 'CATEGORY'
                      ? 'w-48 rounded-2xl bg-slate-900/90 border-2 border-indigo-400/60 p-4 shadow-xl shadow-indigo-950/50 backdrop-blur-xl text-center z-20 hover:border-accent hover:scale-105'
                      : node.type === 'THEME'
                      ? 'w-44 rounded-xl bg-slate-900/80 border border-purple-400/40 p-3 shadow-lg backdrop-blur-md text-center z-10 hover:border-purple-400 hover:scale-105'
                      : 'w-40 rounded-xl bg-slate-950/90 border border-emerald-400/40 p-2.5 shadow-md text-center z-10 hover:border-emerald-400 hover:scale-105'
                  } ${isMatch ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-110 z-40' : ''} ${
                    isHovered ? 'border-white scale-105 shadow-2xl z-30' : ''
                  }`}
                >
                  {/* ROOT NODE */}
                  {node.type === 'ROOT' && (
                    <div className="space-y-1 select-none">
                      <span className="text-2xl font-black text-white tracking-tight">Lifipedia</span>
                      <p className="text-[10px] text-slate-200 font-medium">가지 노드를 클릭하세요</p>
                    </div>
                  )}

                  {/* CATEGORY & THEME NODES */}
                  {(node.type === 'CATEGORY' || node.type === 'THEME') && (
                    <div className="space-y-1 select-none">
                      {node.category && (
                        <span className="chip bg-white/10 text-slate-300 text-[9px] px-2 py-0">#{node.category}</span>
                      )}
                      <h4 className="text-sm font-black text-white leading-tight">{node.name}</h4>
                      {node.followerCount !== undefined && (
                        <p className="text-[10px] text-slate-400">👥 {node.followerCount}명 팔로우</p>
                      )}
                      {node.hasChildren && (
                        <div className="mt-1.5 pt-1 border-t border-white/10 flex items-center justify-center gap-1 text-[10px] text-accent font-bold">
                          <span>{isExpanded ? '접기 ▲' : '가지 펼치기 ▼'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ITEM NODE */}
                  {node.type === 'ITEM' && (
                    <div className="space-y-1 select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {node.tier}
                        </span>
                        {node.score && <span className="text-[10px] font-black text-amber-400">{node.score.toFixed(1)}점</span>}
                      </div>
                      <h5 className="text-xs font-bold text-slate-100 line-clamp-1">{node.name}</h5>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 마우스 안내 팁 & 상태 바 */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between bg-black/40 backdrop-blur-xl p-3 rounded-2xl border border-white/10 text-xs text-slate-300">
        <span>💡 **사용 가이드**: 노드를 클릭해 가지를 펼치거나 상세정보 팝업을 열 수 있습니다. 캔버스를 드래그하여 이동하세요.</span>
        <span>노드 {nodes.length}개 표시 중</span>
      </div>

      {/* 우측 팝업 상세 Drawer */}
      <MindMapDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
