import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildGraph,
  clusterColor,
  CLUSTER_LABEL,
  relatedFor,
  setPrograms,
  type GraphEdge,
  type GraphNode,
  type Program,
} from '../lib/related';
import { api } from '../api/queries';

const K = 8;

// ---------------------------------------------------------------------------
// Force simulation — no external library
// ---------------------------------------------------------------------------
type Vec2 = { x: number; y: number };

function runSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  onTick: (positions: Vec2[]) => void,
  onDone: (positions: Vec2[]) => void
) {
  const n = nodes.length;
  const pos: Vec2[] = nodes.map(() => ({
    x: width / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.55,
    y: height / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.55,
  }));
  const vel: Vec2[] = nodes.map(() => ({ x: 0, y: 0 }));

  const idToIdx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const adjMap = new Map<string, { target: number; score: number }[]>();
  for (const e of edges) {
    const si = idToIdx.get(e.source);
    const ti = idToIdx.get(e.target);
    if (si == null || ti == null) continue;
    if (!adjMap.has(e.source)) adjMap.set(e.source, []);
    if (!adjMap.has(e.target)) adjMap.set(e.target, []);
    adjMap.get(e.source)!.push({ target: ti, score: e.score });
    adjMap.get(e.target)!.push({ target: si, score: e.score });
  }

  const REPEL    = 4200;
  const SPRING_K = 0.035;
  const REST_LEN = 140;
  const CENTER_G = 0.007;
  const DAMP     = 0.8;

  let alpha = 1.0;
  let frame = 0;
  let rafId: number;

  function tick() {
    alpha *= 0.991;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < n; i++) {
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist2 = dx * dx + dy * dy + 1;
        const dist  = Math.sqrt(dist2);
        const str   = REPEL / dist2;
        fx += (dx / dist) * str;
        fy += (dy / dist) * str;
      }

      const nbrs = adjMap.get(nodes[i].id) ?? [];
      for (const { target: j, score } of nbrs) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const stretch = dist - REST_LEN * (1 - score * 0.35);
        fx += (dx / dist) * SPRING_K * stretch;
        fy += (dy / dist) * SPRING_K * stretch;
      }

      fx += (cx - pos[i].x) * CENTER_G;
      fy += (cy - pos[i].y) * CENTER_G;

      vel[i].x = (vel[i].x + fx * alpha) * DAMP;
      vel[i].y = (vel[i].y + fy * alpha) * DAMP;
      pos[i].x = Math.max(24, Math.min(width - 24, pos[i].x + vel[i].x));
      pos[i].y = Math.max(24, Math.min(height - 24, pos[i].y + vel[i].y));
    }

    frame++;
    if (frame % 4 === 0) onTick([...pos.map(p => ({ ...p }))]);

    if (alpha > 0.012 && frame < 700) {
      rafId = requestAnimationFrame(tick);
    } else {
      onDone([...pos.map(p => ({ ...p }))]);
    }
  }

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------
const NODE_R     = 9;
const NODE_R_SEL = 14;
const NODE_R_HOV = 12;

function drawGraph(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Vec2[],
  idToIdx: Map<string, number>,
  selectedId: string | null,
  hoveredId: string | null
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0c1a0e';
  ctx.fillRect(0, 0, W, H);

  // Edges
  for (const e of edges) {
    const si = idToIdx.get(e.source);
    const ti = idToIdx.get(e.target);
    if (si == null || ti == null) continue;
    const sp = positions[si];
    const tp = positions[ti];
    if (!sp || !tp) continue;

    const hi = e.source === selectedId || e.target === selectedId ||
               e.source === hoveredId  || e.target === hoveredId;

    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(tp.x, tp.y);
    if (hi) {
      ctx.strokeStyle = `rgba(180,83,9,${0.25 + e.score * 0.45})`;
      ctx.lineWidth = 1.2 + e.score * 1.6;
    } else {
      ctx.strokeStyle = `rgba(250,250,245,${0.025 + e.score * 0.055})`;
      ctx.lineWidth = 0.5 + e.score * 0.7;
    }
    ctx.stroke();
  }

  const specials = new Set([selectedId, hoveredId].filter(Boolean));

  function drawNode(node: GraphNode, i: number) {
    const p = positions[i];
    if (!p) return;
    const isSel = node.id === selectedId;
    const isHov = node.id === hoveredId;
    const r     = isSel ? NODE_R_SEL : isHov ? NODE_R_HOV : NODE_R;
    const color = clusterColor(node.cluster);

    if (isSel) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,83,9,0.18)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = isSel ? '#b45309' : isHov ? 'rgba(250,250,245,0.7)' : 'rgba(250,250,245,0.2)';
    ctx.lineWidth = isSel ? 2.5 : 1;
    ctx.stroke();

    if (isSel || isHov) {
      const label = node.label.length > 26 ? node.label.slice(0, 24) + '…' : node.label;
      ctx.font      = '600 11px Inter, sans-serif';
      ctx.fillStyle = isSel ? '#f7be55' : '#fafaf5';
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, p.y + r + 14);
      ctx.font      = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(250,250,245,0.45)';
      ctx.fillText(node.degree, p.x, p.y + r + 26);
    }
  }

  nodes.forEach((nd, i) => { if (!specials.has(nd.id)) drawNode(nd, i); });
  nodes.forEach((nd, i) => { if (specials.has(nd.id))  drawNode(nd, i); });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function RelatedPage() {
  const navigate = useNavigate();
  const [programs, setPrograms_] = useState<Program[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getPrograms().then((data: { programs: Program[] }) => {
      setPrograms(data.programs);
      setPrograms_(data.programs);
      setLoaded(true);
    }).catch(() => {});
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef    = useRef<Vec2[]>([]);
  const [positions, setPositions] = useState<Vec2[]>([]);
  const [simDone, setSimDone]     = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [transform, setTransform]   = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const rafRef   = useRef<number>(0);

  const { nodes, edges } = useMemo(
    () => (loaded ? buildGraph() : { nodes: [], edges: [] }),
    [loaded]
  );
  const idToIdx = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);

  const [size, setSize] = useState({ w: 900, h: 680 });
  useEffect(() => {
    function measure() {
      const el = canvasRef.current?.parentElement;
      if (el) setSize({ w: el.clientWidth, h: Math.min(el.clientWidth * 0.72, 680) });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!loaded || size.w < 100 || nodes.length === 0) return;
    setSimDone(false);
    const cleanup = runSimulation(
      nodes, edges, size.w, size.h,
      (pos) => { posRef.current = pos; setPositions([...pos]); },
      (pos) => { posRef.current = pos; setPositions([...pos]); setSimDone(true); }
    );
    return cleanup;
  }, [loaded, nodes, edges, size.w, size.h]);

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || posRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width  = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);

    cancelAnimationFrame(rafRef.current);

    function frame() {
      if (!ctx) return;
      const logW = canvas!.width / dpr;
      const logH = canvas!.height / dpr;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0c1a0e';
      ctx.fillRect(0, 0, logW, logH);
      ctx.translate(transform.x + logW / 2, transform.y + logH / 2);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(-logW / 2, -logH / 2);
      drawGraph(ctx, nodes, edges, posRef.current, idToIdx, selectedId, hoveredId);
      ctx.restore();

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [positions, selectedId, hoveredId, transform, size, nodes, edges, idToIdx, dpr]);

  const toCanvas = useCallback((clientX: number, clientY: number, canvas: HTMLCanvasElement): Vec2 => {
    const rect = canvas.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    const cx = size.w / 2;
    const cy = size.h / 2;
    return {
      x: (lx - cx - transform.x) / transform.scale + cx,
      y: (ly - cy - transform.y) / transform.scale + cy,
    };
  }, [size, transform]);

  const nearestNode = useCallback((cx: number, cy: number): GraphNode | null => {
    let best: GraphNode | null = null;
    let bestDist = 26;
    posRef.current.forEach((p, i) => {
      if (!p) return;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bestDist) { bestDist = d; best = nodes[i]; }
    });
    return best;
  }, [nodes]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging.current) {
      const dx = e.clientX - dragging.current.startX;
      const dy = e.clientY - dragging.current.startY;
      setTransform(t => ({ ...t, x: dragging.current!.tx + dx, y: dragging.current!.ty + dy }));
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = toCanvas(e.clientX, e.clientY, canvas);
    const node = nearestNode(x, y);
    setHoveredId(node?.id ?? null);
    canvas.style.cursor = node ? 'pointer' : 'grab';
  }, [toCanvas, nearestNode]);

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    dragging.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y };
  }

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const moved = dragging.current
      ? Math.hypot(e.clientX - dragging.current.startX, e.clientY - dragging.current.startY) > 4
      : false;
    dragging.current = null;
    if (!moved) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = toCanvas(e.clientX, e.clientY, canvas);
      const node = nearestNode(x, y);
      setSelectedId(node?.id ?? null);
    }
  }, [toCanvas, nearestNode]);

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform(t => ({ ...t, scale: Math.max(0.3, Math.min(5, t.scale * factor)) }));
  }

  const selectedProgram   = selectedId ? programs.find(p => p.id === selectedId) : null;
  const selectedNeighbors = selectedId ? relatedFor(selectedId) : [];

  const clusterLegend = useMemo(() => {
    const seen = new Set<string>();
    const pairs: { cluster: string; label: string; color: string }[] = [];
    for (const { cluster } of nodes) {
      if (!seen.has(cluster)) {
        seen.add(cluster);
        pairs.push({ cluster, label: CLUSTER_LABEL[cluster] ?? cluster, color: clusterColor(cluster) });
      }
    }
    return pairs;
  }, [nodes]);

  return (
    <div className="mx-auto max-w-full px-0">
      {/* Header */}
      <section className="border-b border-[var(--hairline)] px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">Academic Programs, Cascade University</div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-strong)] tracking-tight">
              Related Program Network
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)] font-body-serif">
              {nodes.length} programs, {edges.length} similarity edges.{' '}
              {loaded ? (simDone ? 'Settled.' : 'Settling…') : 'Loading…'}
            </p>
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)] text-right max-w-xs">
            Drag to pan, scroll to zoom, click any node
          </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative" style={{ background: '#0c1a0e', minHeight: `${size.h}px` }}>
          <canvas
            ref={canvasRef}
            onMouseMove={onMouseMove}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { setHoveredId(null); dragging.current = null; }}
            onWheel={onWheel}
            style={{ display: 'block', cursor: 'grab', userSelect: 'none' }}
          />
          {(!loaded || !simDone) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="mono text-[11px] uppercase tracking-[0.3em] text-white/30 animate-pulse">
                {loaded ? 'Calculating similarity graph…' : 'Loading program catalog…'}
              </p>
            </div>
          )}
          {/* Cluster legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-x-3 gap-y-1 max-w-sm">
            {clusterLegend.map(({ cluster, label, color }) => (
              <span key={cluster} className="flex items-center gap-1">
                <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
                <span className="mono text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <aside
          className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[var(--hairline)] flex-none overflow-y-auto bg-[var(--paper)]"
          style={{ maxHeight: `${size.h + 80}px` }}
        >
          {selectedProgram ? (
            <div className="p-5">
              {/* Program header */}
              <div className="mb-1">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
                  style={{ background: clusterColor(selectedProgram.discipline_cluster) }}
                />
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] font-semibold">
                  {selectedProgram.school}
                </span>
              </div>
              <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] leading-tight mt-1">
                {selectedProgram.name}
              </h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="status-pill neutral">{selectedProgram.degree}</span>
                <span className="status-pill neutral">{selectedProgram.enrollment_band} enrollment</span>
                <span className={`status-pill ${selectedProgram.persistence_tier === 'high' ? 'good' : selectedProgram.persistence_tier === 'low' ? 'garnet' : 'amber'}`}>
                  {selectedProgram.persistence_tier} persistence
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-muted)] leading-relaxed font-body-serif">
                {selectedProgram.description}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[var(--paper-deep)] rounded-sm px-3 py-2">
                  <div className="text-[var(--ink-soft)] uppercase tracking-wider text-[9px] font-semibold">Enrollment</div>
                  <div className="font-serif font-semibold text-[var(--ink-strong)] mt-0.5 tabular">
                    {selectedProgram.enrollment.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[var(--paper-deep)] rounded-sm px-3 py-2">
                  <div className="text-[var(--ink-soft)] uppercase tracking-wider text-[9px] font-semibold">Retention</div>
                  <div className="font-serif font-semibold text-[var(--ink-strong)] mt-0.5 tabular">
                    {selectedProgram.retention_pct.toFixed(1)}%
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/programs/${selectedProgram.id}`)}
                className="mt-4 inline-block mono text-[9px] uppercase tracking-[0.25em] text-[var(--bronze)] border border-[var(--bronze)]/40 px-3 py-1.5 hover:bg-[var(--bronze)] hover:text-white transition-colors rounded-sm"
              >
                View program details →
              </button>

              {/* Neighbors */}
              <div className="mt-6 border-t border-[var(--hairline)] pt-4">
                <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--ink-soft)] font-semibold">Related programs</p>
                <ol className="mt-2 space-y-1">
                  {selectedNeighbors.map(nb => (
                    <li key={nb.id}>
                      <button
                        onClick={() => setSelectedId(nb.id)}
                        className="w-full text-left px-2 py-1.5 border-l-2 border-[var(--hairline)] hover:border-[var(--bronze)] hover:bg-[var(--paper-deep)]/60 transition-colors"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-none"
                            style={{ background: clusterColor(nb.program.discipline_cluster) }}
                          />
                          <span className="font-serif text-sm text-[var(--ink-strong)] truncate flex-1">{nb.program.name}</span>
                          <span className="mono text-[9px] text-[var(--bronze)] flex-none">{Math.round(nb.score * 100)}%</span>
                        </div>
                        <p className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-soft)] truncate mt-0.5 pl-4">
                          {nb.program.school} — {nb.program.degree}
                        </p>
                        <p className="text-[10px] text-[var(--ink-muted)] truncate mt-0.5 pl-4">{nb.why}</p>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Similarity note */}
              <div className="mt-6 border-t border-[var(--hairline)] pt-4">
                <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  Graph built from{' '}
                  <span className="mono text-[var(--bronze)]">EMBED_TEXT_768</span>{' '}
                  weighted feature similarity — discipline cluster, school, degree level, and
                  persistence profile. Top-{K} neighbors per program, undirected union.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink-soft)] font-semibold">
                Click any node to explore
              </p>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed font-body-serif">
                Every academic program is a node. Edges connect the most similar
                programs by discipline cluster, college, degree level, and persistence
                profile. Clusters form naturally — engineering and computing together,
                humanities in their own corner, health sciences bridging life sciences.
              </p>
              <p className="mono text-[9px] uppercase tracking-[0.25em] text-[var(--ink-soft)] mt-2">
                {nodes.length} programs, {edges.length} similarity edges
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
