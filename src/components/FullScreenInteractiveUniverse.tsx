'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MindMapDrawer, SelectedNodeData } from './MindMapDrawer';

export type RawThemeTree = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  followerCount: number;
  parentId: string | null;
  subThemes?: RawThemeTree[];
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

type FullScreenInteractiveUniverseProps = {
  initialThemes: RawThemeTree[];
};

type UniverseNode = {
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
  baseX: number;
  baseY: number;
  currentX: number;
  currentY: number;
  phase: number;
  speed: number;
  amplitude: number;
  hasChildren: boolean;
  childrenIds: string[];
};

type CanvasEdge = {
  id: string;
  sourceId: string;
  targetId: string;
};

export function FullScreenInteractiveUniverse({ initialThemes }: FullScreenInteractiveUniverseProps) {
  // 카메라 Transform 상태 (Pan & Zoom Lerp)
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const targetCam = useRef({ x: 0, y: 0, zoom: 1 });

  // 마우스 커서 좌표 & 자성 반응
  const mousePos = useRef({ x: -9999, y: -9999 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // 펼침 상태 (Expanded Nodes) & 활성 노드
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    s.add('root');
    initialThemes.forEach((t) => s.add(t.id));
    return s;
  });

  const [activePath, setActivePath] = useState<string[]>(['root']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrawerNode, setSelectedDrawerNode] = useState<SelectedNodeData | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameId = useRef<number | null>(null);

  // 1. 방사형/계층 2D 노드 위치 생성
  const { nodesMap, allNodes, edgesList } = useMemo(() => {
    const map = new Map<string, UniverseNode>();
    const edges: CanvasEdge[] = [];
    const list: UniverseNode[] = [];

    // 루트 노드 (Lifipedia Core)
    const rootNode: UniverseNode = {
      id: 'root',
      type: 'ROOT',
      name: 'Lifipedia 🌟',
      description: '유저 주도 랭킹 우주 탐색기',
      parentId: null,
      depth: 0,
      baseX: 0,
      baseY: 0,
      currentX: 0,
      currentY: 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.4,
      amplitude: 15,
      hasChildren: initialThemes.length > 0,
      childrenIds: initialThemes.map((t) => t.id),
    };
    map.set('root', rootNode);
    list.push(rootNode);

    // Level 1: 루트 테마 카테고리
    const rootCount = initialThemes.length;
    const r1 = 320;

    initialThemes.forEach((theme, idx) => {
      const angle = (idx / rootCount) * Math.PI * 2 - Math.PI / 2;
      const bx = Math.cos(angle) * r1;
      const by = Math.sin(angle) * r1;

      const subIds: string[] = [];
      if (theme.subThemes) theme.subThemes.forEach((s) => subIds.push(s.id));
      if (theme.items) theme.items.forEach((i) => subIds.push(i.id));

      const categoryNode: UniverseNode = {
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
        baseX: bx,
        baseY: by,
        currentX: bx,
        currentY: by,
        phase: Math.random() * Math.PI * 2,
        speed: 1.0 + Math.random() * 0.5,
        amplitude: 22,
        hasChildren: subIds.length > 0,
        childrenIds: subIds,
      };
      map.set(theme.id, categoryNode);
      list.push(categoryNode);
      edges.push({ id: `root->${theme.id}`, sourceId: 'root', targetId: theme.id });

      // Level 2 & 3: 서브 테마
      if (theme.subThemes) {
        const subCount = theme.subThemes.length;
        const arc = Math.PI / 1.4;
        const startA = angle - arc / 2;
        const r2 = 300;

        theme.subThemes.forEach((sub, sIdx) => {
          const sAngle = startA + (sIdx / Math.max(1, subCount - 1)) * arc;
          const sx = bx + Math.cos(sAngle) * r2;
          const sy = by + Math.sin(sAngle) * r2;

          const grandChildIds: string[] = [];
          if (sub.subThemes) sub.subThemes.forEach((d) => grandChildIds.push(d.id));
          if (sub.items) sub.items.forEach((i) => grandChildIds.push(i.id));

          const subNode: UniverseNode = {
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
            baseX: sx,
            baseY: sy,
            currentX: sx,
            currentY: sy,
            phase: Math.random() * Math.PI * 2,
            speed: 1.2 + Math.random() * 0.6,
            amplitude: 26,
            hasChildren: grandChildIds.length > 0,
            childrenIds: grandChildIds,
          };
          map.set(sub.id, subNode);
          list.push(subNode);
          edges.push({ id: `${theme.id}->${sub.id}`, sourceId: theme.id, targetId: sub.id });

          // Level 3/4: 깊은 서브 테마 또는 아이템
          if (sub.subThemes && sub.subThemes.length > 0) {
            const deepCount = sub.subThemes.length;
            sub.subThemes.forEach((deep, dIdx) => {
              const dAngle = sAngle + (dIdx - (deepCount - 1) / 2) * 0.45;
              const dx = sx + Math.cos(dAngle) * 260;
              const dy = sy + Math.sin(dAngle) * 260;

              const deepNode: UniverseNode = {
                id: deep.id,
                type: 'THEME',
                name: deep.name,
                description: deep.description,
                category: deep.category,
                followerCount: deep.followerCount,
                slug: deep.slug,
                parentId: sub.id,
                depth: 3,
                baseX: dx,
                baseY: dy,
                currentX: dx,
                currentY: dy,
                phase: Math.random() * Math.PI * 2,
                speed: 1.4 + Math.random() * 0.6,
                amplitude: 28,
                hasChildren: false,
                childrenIds: [],
              };
              map.set(deep.id, deepNode);
              list.push(deepNode);
              edges.push({ id: `${sub.id}->${deep.id}`, sourceId: sub.id, targetId: deep.id });
            });
          }

          if (sub.items && sub.items.length > 0) {
            const itemCount = sub.items.length;
            sub.items.forEach((item, iIdx) => {
              const iAngle = sAngle + (iIdx - (itemCount - 1) / 2) * 0.4;
              const ix = sx + Math.cos(iAngle) * 250;
              const iy = sy + Math.sin(iAngle) * 250;

              const itemNode: UniverseNode = {
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
                baseX: ix,
                baseY: iy,
                currentX: ix,
                currentY: iy,
                phase: Math.random() * Math.PI * 2,
                speed: 1.5 + Math.random() * 0.7,
                amplitude: 30,
                hasChildren: false,
                childrenIds: [],
              };
              map.set(item.id, itemNode);
              list.push(itemNode);
              edges.push({ id: `${sub.id}->${item.id}`, sourceId: sub.id, targetId: item.id });
            });
          }
        });
      }
    });

    return { nodesMap: map, allNodes: list, edgesList: edges };
  }, [initialThemes]);

  // 2. 현재 표시할 노드 및 엣지 구하기 (Expanded 기준)
  const visibleNodes = useMemo(() => {
    const set = new Set<string>();

    const reveal = (id: string) => {
      set.add(id);
      if (expandedIds.has(id)) {
        const node = nodesMap.get(id);
        if (node) {
          node.childrenIds.forEach((childId) => reveal(childId));
        }
      }
    };
    reveal('root');

    return allNodes.filter((n) => set.has(n.id));
  }, [allNodes, expandedIds, nodesMap]);

  const visibleEdges = useMemo(() => {
    const visibleSet = new Set(visibleNodes.map((n) => n.id));
    return edgesList.filter((e) => visibleSet.has(e.sourceId) && visibleSet.has(e.targetId));
  }, [visibleNodes, edgesList]);

  // 검색어 필터링 일치 노드
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    const set = new Set<string>();
    allNodes.forEach((n) => {
      if (
        n.name.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      ) {
        set.add(n.id);
      }
    });
    return set;
  }, [allNodes, searchQuery]);

  // 3. requestAnimationFrame 물결 피지컬 (Wave Motion + Cursor Repulsion Physics) Engine Loop
  useEffect(() => {
    let startTime = performance.now();

    const renderLoop = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      // 카메라 Lerp 수행
      setCam((prev) => ({
        x: prev.x + (targetCam.current.x - prev.x) * 0.12,
        y: prev.y + (targetCam.current.y - prev.y) * 0.12,
        zoom: prev.zoom + (targetCam.current.zoom - prev.zoom) * 0.12,
      }));

      // 물결 피지컬 애니메이션 계산
      allNodes.forEach((node) => {
        // 기본 파동 (Sine Wave Bobbing)
        const waveX = Math.sin(elapsed * node.speed + node.phase) * node.amplitude;
        const waveY = Math.cos(elapsed * node.speed * 0.8 + node.phase) * node.amplitude;

        // 마우스 반응형 자성 밀림/끌림 (Cursor Magnet Repulsion Physics)
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        // 월드 좌표 변환
        const worldMouseX = (mousePos.current.x - screenWidth / 2 - targetCam.current.x) / targetCam.current.zoom;
        const worldMouseY = (mousePos.current.y - screenHeight / 2 - targetCam.current.y) / targetCam.current.zoom;

        const dx = node.baseX - worldMouseX;
        const dy = node.baseY - worldMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let repelX = 0;
        let repelY = 0;
        if (dist < 220 && dist > 0) {
          const force = (1 - dist / 220) * 45; // 근접 시 밀려나는 힘
          repelX = (dx / dist) * force;
          repelY = (dy / dist) * force;
        }

        node.currentX = node.baseX + waveX + repelX;
        node.currentY = node.baseY + waveY + repelY;
      });

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [allNodes]);

  // 4. 노드 클릭 시 Smooth Camera Zoom & Focusing Transition
  const handleNodeClick = (node: UniverseNode) => {
    // 1) 자식 노드가 있으면 펼치기/접기
    if (node.hasChildren) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id) && node.id !== 'root') {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    }

    // 2) 카메라 해당 노드로 부드럽게 Zoom & Pan Focus
    if (node.type === 'ROOT') {
      targetCam.current = { x: 0, y: 0, zoom: 1 };
      setActivePath(['root']);
    } else {
      const zoomTarget = node.type === 'CATEGORY' ? 1.4 : node.type === 'THEME' ? 1.8 : 2.2;
      targetCam.current = {
        x: -node.baseX * zoomTarget,
        y: -node.baseY * zoomTarget,
        zoom: zoomTarget,
      };

      // 경로 빌드
      const path: string[] = [];
      let curr: UniverseNode | undefined = node;
      while (curr) {
        path.unshift(curr.id);
        curr = curr.parentId ? nodesMap.get(curr.parentId) : undefined;
      }
      setActivePath(path);
    }

    // 3) 상세 드로어 오픈
    setSelectedDrawerNode(node);
  };

  // 마우스 drag / move handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'DIV') return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - targetCam.current.x, y: e.clientY - targetCam.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (!isDragging) return;
    targetCam.current.x = e.clientX - dragStart.current.x;
    targetCam.current.y = e.clientY - dragStart.current.y;
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    targetCam.current.zoom = Math.min(3.0, Math.max(0.3, targetCam.current.zoom + delta));
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#070b14] text-slate-100 select-none z-0">
      {/* 🌌 은은한 우주 파티클 앰비언트 배경 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,91,219,0.15),transparent_70%)] pointer-events-none" />

      {/* 🔮 플로팅 헤더 UI & 검색 바 */}
      <header className="absolute top-6 left-6 right-6 z-30 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              targetCam.current = { x: 0, y: 0, zoom: 1 };
              setActivePath(['root']);
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl px-5 py-2.5 text-white font-black text-lg shadow-2xl hover:bg-white/20 transition-all active:scale-95"
          >
            🌟 Lifipedia Universe
          </button>
          <span className="chip bg-accent/20 text-accent border-accent/40 text-xs hidden sm:inline-flex">
            🌊 풀뷰포트 물결 피지컬 캔버스
          </span>
        </div>

        {/* 실시간 검색창 */}
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="🔍 마우스를 움직여 테마를 물결치게 하세요 (30대, 이직, 캠핑...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field bg-black/60 backdrop-blur-2xl border-white/20 text-white placeholder:text-slate-400 text-sm py-3 px-4 shadow-2xl focus:border-accent"
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
      </header>

      {/* 🧭 경로 브레드크럼 Navigation */}
      <div className="absolute top-24 left-6 z-30 flex items-center gap-2 overflow-x-auto bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 text-xs">
        {activePath.map((id, idx) => {
          const n = nodesMap.get(id);
          if (!n) return null;
          const isLast = idx === activePath.length - 1;
          return (
            <div key={id} className="flex items-center gap-1.5 shrink-0">
              {idx > 0 && <span className="text-slate-500 font-bold">›</span>}
              <button
                onClick={() => handleNodeClick(n)}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  isLast
                    ? 'bg-accent text-white font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {n.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* 🎛️ 좌측 하단 줌 & 카메라 리셋 컨트롤 */}
      <div className="absolute bottom-6 left-6 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-2xl p-2 rounded-2xl border border-white/15 shadow-2xl">
        <button
          onClick={() => (targetCam.current.zoom = Math.min(3.0, targetCam.current.zoom + 0.3))}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-lg transition-all flex items-center justify-center active:scale-95"
        >
          +
        </button>
        <span className="text-xs font-mono text-slate-200 px-2 font-bold">
          {Math.round(cam.zoom * 100)}%
        </span>
        <button
          onClick={() => (targetCam.current.zoom = Math.max(0.3, targetCam.current.zoom - 0.3))}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-lg transition-all flex items-center justify-center active:scale-95"
        >
          -
        </button>
        <button
          onClick={() => {
            targetCam.current = { x: 0, y: 0, zoom: 1 };
            setActivePath(['root']);
          }}
          className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
        >
          🏠 뷰 초기화
        </button>
      </div>

      {/* 🌊 메인 뷰포트 인터랙티브 캔버스 */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
            transformOrigin: '50% 50%',
          }}
        >
          {/* SVG 엣지 커브 연결선 */}
          <svg className="absolute overflow-visible w-full h-full pointer-events-none" style={{ left: '50%', top: '50%' }}>
            <defs>
              <linearGradient id="wave-edge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b5bdb" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#9c36b5" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="wave-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
              </linearGradient>
            </defs>

            {visibleEdges.map((edge) => {
              const src = nodesMap.get(edge.sourceId);
              const tgt = nodesMap.get(edge.targetId);
              if (!src || !tgt) return null;

              const dx = (tgt.currentX - src.currentX) * 0.5;
              const pathD = `M ${src.currentX} ${src.currentY} C ${src.currentX + dx} ${src.currentY}, ${tgt.currentX - dx} ${tgt.currentY}, ${tgt.currentX} ${tgt.currentY}`;

              const isHovered = hoveredNodeId === edge.targetId || hoveredNodeId === edge.sourceId;
              const isMatch = matchingNodeIds.has(edge.targetId) || matchingNodeIds.has(edge.sourceId);

              return (
                <path
                  key={edge.id}
                  d={pathD}
                  fill="none"
                  stroke={isHovered || isMatch ? 'url(#wave-highlight)' : 'url(#wave-edge)'}
                  strokeWidth={isHovered || isMatch ? 4 : 2}
                  strokeDasharray={isHovered ? '8 4' : 'none'}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* 노드 버블 레이어 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            {visibleNodes.map((node) => {
              const isExpanded = expandedIds.has(node.id);
              const isMatch = matchingNodeIds.has(node.id);
              const isHovered = hoveredNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(node);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    transform: `translate(${node.currentX}px, ${node.currentY}px)`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer select-none ${
                    node.type === 'ROOT'
                      ? 'w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-600 via-accent to-pink-600 border-4 border-white/70 shadow-2xl shadow-accent/60 flex flex-col items-center justify-center text-center p-4 z-40 animate-pulse-glow'
                      : node.type === 'CATEGORY'
                      ? 'w-52 rounded-3xl bg-slate-900/90 border-2 border-indigo-400/70 p-5 shadow-2xl shadow-indigo-950/60 backdrop-blur-2xl text-center z-30 hover:border-accent hover:scale-110'
                      : node.type === 'THEME'
                      ? 'w-48 rounded-2xl bg-slate-900/85 border border-purple-400/50 p-4 shadow-xl backdrop-blur-xl text-center z-20 hover:border-purple-400 hover:scale-110'
                      : 'w-44 rounded-2xl bg-slate-950/90 border border-emerald-400/50 p-3 shadow-lg backdrop-blur-lg text-center z-10 hover:border-emerald-400 hover:scale-110'
                  } ${isMatch ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-black scale-110 z-50 animate-bounce' : ''} ${
                    isHovered ? 'border-white scale-110 shadow-2xl z-40' : ''
                  }`}
                >
                  {/* ROOT */}
                  {node.type === 'ROOT' && (
                    <div className="space-y-1">
                      <span className="text-3xl font-black text-white tracking-tight">Lifipedia</span>
                      <p className="text-xs text-slate-200 font-bold">노드를 클릭해 우주를 탐험하세요</p>
                    </div>
                  )}

                  {/* CATEGORY & THEME */}
                  {(node.type === 'CATEGORY' || node.type === 'THEME') && (
                    <div className="space-y-1.5">
                      {node.category && (
                        <span className="chip bg-white/10 text-slate-300 text-[10px]">#{node.category}</span>
                      )}
                      <h4 className="text-base font-black text-white leading-tight">{node.name}</h4>
                      {node.followerCount !== undefined && (
                        <p className="text-xs text-slate-400 font-medium">👥 {node.followerCount}명 팔로우</p>
                      )}
                      {node.hasChildren && (
                        <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-center gap-1 text-xs text-accent font-black">
                          <span>{isExpanded ? '가지 접기 ▲' : '가지 펼치기 ▼'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ITEM */}
                  {node.type === 'ITEM' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="chip bg-emerald-500/20 text-emerald-300 text-[10px]">
                          {node.tier}
                        </span>
                        {node.score && <span className="text-xs font-black text-amber-400">{node.score.toFixed(1)}점</span>}
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

      {/* 우측 팝업 상세 Drawer */}
      <MindMapDrawer node={selectedDrawerNode} onClose={() => setSelectedDrawerNode(null)} />
    </div>
  );
}
