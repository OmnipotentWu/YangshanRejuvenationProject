"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { asset } from "../lib/assets";
import { SITE_COPY } from "../lib/site-copy";

interface PersonNode {
  id: string;
  title: string;
  codename: string | null;
  faction: string | null;
  avatar?: string | null;
}
interface FactionNode {
  id: string;
  title: string;
  slug: string;
  logo_path: string | null;
  slogan: string | null;
}
export interface BoardData {
  persons: PersonNode[];
  factions: FactionNode[];
  edges: { source: string; target: string; kind: string; note: string }[];
  membership: { person: string; factionSlug: string }[];
  kinds: string[];
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  kind: "person" | "faction";
  title: string;
  codename?: string | null;
  faction?: string | null;
  logo?: string | null;
  avatar?: string | null;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  kind: string;
  member?: boolean;
}

const MEMBER_KIND = "__member__";

// 7 种预置线型，按 effectiveKinds 声明顺序循环分配；
// kinds.json 新增类型无需改代码，自动获得下一种线型。
const LINE_STYLES: { dash: string | undefined; width: number }[] = [
  { dash: undefined, width: 1.4 },        // 实线
  { dash: "7 4", width: 1.4 },            // 长划
  { dash: "4 3", width: 1.4 },            // 划
  { dash: "8 3 2 3", width: 1.4 },        // 划-点
  { dash: "2 3", width: 1.6 },            // 点线
  { dash: "10 3 3 3 3 3", width: 1.4 },   // 长划-双点
  { dash: "1 3", width: 1.8 },            // 密点
];
const FALLBACK_STYLE = { dash: "6 3 2 3 2 3", width: 1.4 };

function hashN(n: string | number) {
  const s = String(n);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export default function NetworkBoard({ data, local = false }: { data: BoardData; local?: boolean }) {
  const router = useRouter();
  const nc = SITE_COPY.network;
  const boardRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const [tick, setTick] = useState(0);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [mode, setMode] = useState<"person" | "mixed">("person");
  // 默认全部类型可见：含 kinds.json 声明与边数据里实际出现的类型
  const [activeKinds, setActiveKinds] = useState<Set<string>>(() => new Set([...data.kinds.filter(Boolean), ...data.edges.map((e) => (e.kind || "").trim()).filter(Boolean)]));
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const dragMoved = useRef(false);

  // 有效关系类型 = kinds.json 声明 ∪ 边数据实际出现（声明序优先）
  const effectiveKinds = useMemo(() => {
    const declared = data.kinds.filter(Boolean);
    const seen = new Set(declared);
    const extras: string[] = [];
    for (const e of data.edges) {
      const k = (e.kind || "").trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        extras.push(k);
      }
    }
    return [...declared, ...extras];
  }, [data]);
  const kindIndex = useMemo(() => new Map(effectiveKinds.map((k, i) => [k, i])), [effectiveKinds]);
  const styleOf = (kind: string) => {
    const i = kindIndex.get(kind);
    return i === undefined ? FALLBACK_STYLE : LINE_STYLES[i % LINE_STYLES.length];
  };

  const nodes = useMemo<SimNode[]>(() => {
    const base: SimNode[] = data.persons.map((p) => ({
      id: p.id,
      kind: "person",
      title: p.title,
      codename: p.codename,
      faction: p.faction,
      avatar: p.avatar,
    }));
    if (mode === "mixed") {
      for (const f of data.factions) {
        base.push({ id: f.id, kind: "faction", title: f.title, logo: f.logo_path, faction: f.slug });
      }
    }
    return base;
  }, [data, mode]);

  const links = useMemo<SimLink[]>(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const ls: SimLink[] = [];
    for (const e of data.edges) {
      // 防御：自环不产生无效布局；悬空端点数据层已过滤，这里再兜底
      if (e.source === e.target) continue;
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
        ls.push({ source: e.source, target: e.target, kind: (e.kind || "").trim() });
      }
    }
    if (mode === "mixed") {
      const slugToId = new Map(data.factions.map((f) => [f.slug, f.id]));
      for (const m of data.membership) {
        const fid = slugToId.get(m.factionSlug);
        if (fid && nodeIds.has(m.person) && nodeIds.has(fid)) {
          ls.push({ source: m.person, target: fid, kind: MEMBER_KIND, member: true });
        }
      }
    }
    return ls;
  }, [data, nodes, mode]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const factionBySlug = useMemo(() => new Map(data.factions.map((f) => [f.slug, f])), [data.factions]);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of links) {
      const s = l.source as SimNode, t = l.target as SimNode;
      if (!m.has(s.id)) m.set(s.id, new Set());
      if (!m.has(t.id)) m.set(t.id, new Set());
      m.get(s.id)!.add(t.id);
      m.get(t.id)!.add(s.id);
    }
    return m;
  }, [links]);

  const kindCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of links) {
      if (l.member || !l.kind) continue;
      m.set(l.kind, (m.get(l.kind) || 0) + 1);
    }
    return m;
  }, [links]);

  const searchHits = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return new Set(nodes.filter((n) => n.title.includes(q) || (n.codename || "").includes(q)).map((n) => n.id));
  }, [nodes, query]);

  useEffect(() => {
    const board = boardRef.current;
    const world = worldRef.current;
    if (!board || !world) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const initial = d3.zoomIdentity.translate(board.clientWidth / 2, board.clientHeight / 2);
    transformRef.current = initial;
    setTransform(initial);

    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id).distance(local ? 110 : 150).strength(0.8)
      )
      .force("charge", d3.forceManyBody().strength(local ? -320 : -480))
      .force("collide", d3.forceCollide(local ? 62 : 84))
      .force("x", d3.forceX(0).strength(0.12))
      .force("y", d3.forceY(0).strength(0.14));;

    if (reduced) {
      // 降级：同步预演算后直接静态渲染，不持续驱动
      nodes.forEach((n, i) => {
        const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
        if (n.x === undefined) n.x = Math.cos(a) * 160;
        if (n.y === undefined) n.y = Math.sin(a) * 160;
      });
      for (let i = 0; i < 250; i++) sim.tick();
      setTick((t) => t + 1);
    } else {
      nodes.forEach((n, i) => {
        const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
        if (n.x === undefined) n.x = Math.cos(a) * 160;
        if (n.y === undefined) n.y = Math.sin(a) * 160;
      });
      sim.on("tick", () => setTick((t) => t + 1));
    }

    const zoom = d3
      .zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.35, 2.6])
      .on("zoom", (ev) => {
        transformRef.current = ev.transform;
        setTransform(ev.transform);
      });
    zoomRef.current = zoom;
    d3.select(board).call(zoom as any);
    d3.select(board).call(zoom.transform as any, initial);

    const dragBehavior = d3
      .drag<HTMLDivElement, SimNode>()
      .on("start", (ev, d) => {
        dragMoved.current = false;
        if (!ev.active) sim.alphaTarget(0.25).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (ev, d) => {
        dragMoved.current = true;
        const pt = transformRef.current.invert([ev.x, ev.y] as [number, number]);
        d.fx = pt[0]; d.fy = pt[1];
      })
      .on("end", (ev, d) => {
        if (!ev.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    const sel = d3.select(world).selectAll<HTMLDivElement, SimNode>("div.tac-node");
    sel.datum((d, i) => nodes[i] || d);
    sel.call(dragBehavior as any);

    return () => {
      sim.stop();
      zoomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, local]);

  function nodeClick(id: string) {
    if (dragMoved.current) return;
    router.push(`/archives/${id}`);
  }

  function toggleKind(k: string) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  function zoomBy(factor: number) {
    const board = boardRef.current;
    const zoom = zoomRef.current;
    if (!board || !zoom) return;
    d3.select(board).transition().duration(180).call(zoom.scaleBy as any, factor);
  }
  function zoomReset() {
    const board = boardRef.current;
    const zoom = zoomRef.current;
    if (!board || !zoom) return;
    const initial = d3.zoomIdentity.translate(board.clientWidth / 2, board.clientHeight / 2);
    d3.select(board).transition().duration(200).call(zoom.transform as any, initial);
  }

  const visibleLinks = links.filter((l) => l.member || (l.kind && activeKinds.has(l.kind)));
  const renderedCount = visibleLinks.filter((l) => !l.member).length;
  const activeKindCount = effectiveKinds.filter((k) => (kindCounts.get(k) || 0) > 0).length;

  function edgePath(l: SimLink, i: number): string {
    const s = l.source as SimNode, t = l.target as SimNode;
    const mx = (s.x! + t.x!) / 2, my = (s.y! + t.y!) / 2;
    const dx = t.x! - s.x!, dy = t.y! - s.y!;
    const len = Math.hypot(dx, dy) || 1;
    const off = (hashN(i) % 44) - 22 || 18;
    const cx = mx - (dy / len) * off, cy = my + (dx / len) * off;
    return `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
  }
  // 二次贝塞尔 t=0.5 处的中点（标签定位）
  function edgeMid(l: SimLink, i: number): { x: number; y: number } {
    const s = l.source as SimNode, t = l.target as SimNode;
    const parts = edgePath(l, i).split(" ");
    const x0 = parseFloat(parts[1]), y0 = parseFloat(parts[2]);
    const cx = parseFloat(parts[4]), cy = parseFloat(parts[5]);
    const x1 = parseFloat(parts[6]), y1 = parseFloat(parts[7]);
    return { x: 0.25 * x0 + 0.5 * cx + 0.25 * x1, y: 0.25 * y0 + 0.5 * cy + 0.25 * y1 };
  }

  const litIds = hover !== null ? adjacency.get(hover) : null;
  const hoverNode = hover ? nodeById.get(hover) : undefined;
  const hoverRels = hover
    ? visibleLinks
        .filter((l) => {
          const s = l.source as SimNode, t = l.target as SimNode;
          return s.id === hover || t.id === hover;
        })
        .slice(0, 6)
    : [];

  return (
    <div>
      {!local ? (
        <div className="board-tools">
          <span className="bt-group" role="group" aria-label="显示模式">
            <button type="button" className={mode === "person" ? "on" : ""} onClick={() => setMode("person")}>
              {nc.modePersons}
            </button>
            <button type="button" className={mode === "mixed" ? "on" : ""} onClick={() => setMode("mixed")}>
              {nc.modeAll}
            </button>
          </span>
          <span className="bt-group" role="group" aria-label="关系类型筛选">
            {effectiveKinds.map((k) => (
              <button key={k} type="button" className={activeKinds.has(k) ? "on" : ""} onClick={() => toggleKind(k)}>
                {k}
              </button>
            ))}
          </span>
          <input
            type="text"
            placeholder={nc.searchPlaceholder}
            aria-label={nc.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="spacer" />
          <span className="board-strip">{nc.boardStrip(nodes.filter((n) => n.kind === "person").length, renderedCount, activeKindCount)}</span>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>{nc.localHint}</p>
      )}

      <div className="tac-wrap">
        <div className={`tac-board ${local ? "local-board" : ""}`} ref={boardRef}>
          <span className="tac-frame" aria-hidden="true"><span className="tf-b" /></span>
          <div
            ref={worldRef}
            className="world"
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "0 0",
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
            }}
          >
            <svg className="tac-board-svg" role="img" aria-label={nc.boardStrip(nodes.length, renderedCount, activeKindCount)}>
              <g>
                {visibleLinks.map((l, i) => {
                  const s = l.source as SimNode, t = l.target as SimNode;
                  const isLit = hover !== null && (s.id === hover || t.id === hover);
                  const isDim = hover !== null && !isLit && !l.member;
                  const st = l.member ? { dash: "4 4", width: 1.2 } : styleOf(l.kind);
                  const mid = edgeMid(l, i);
                  return (
                    <g key={i}>
                      <path
                        className={`thread ${isLit ? "lit" : ""} ${isDim ? "dim" : ""}`}
                        d={edgePath(l, i)}
                        strokeDasharray={st.dash}
                        strokeWidth={st.width}
                      />
                      {!l.member && l.kind ? (
                        <g className={`thread-label ${isDim ? "dim" : ""} ${isLit ? "lit" : ""}`} transform={`translate(${mid.x}, ${mid.y})`}>
                          <rect x={-l.kind.length * 5.6 - 6} y={-8} width={l.kind.length * 11.2 + 12} height={16} />
                          <text textAnchor="middle" dy={3.5}>{l.kind}</text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>
            {nodes.map((n) => {
              const dimmed = hover !== null && n.id !== hover && !litIds?.has(n.id);
              const hit = searchHits?.has(n.id);
              const f = n.faction ? factionBySlug.get(n.faction) : undefined;
              return (
                <div
                  key={n.id}
                  className={`tac-node ${n.kind === "faction" ? "faction-node" : ""} ${dimmed ? "dimmed" : ""} ${n.id === hover ? "lit" : ""}`}
                  style={{
                    left: n.x ?? 0,
                    top: n.y ?? 0,
                    zIndex: n.id === hover ? 20 : hit ? 15 : 1,
                    outline: hit ? "2px solid var(--gold)" : undefined,
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={`${n.title} ${n.id}`}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(n.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => nodeClick(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nodeClick(n.id);
                    }
                  }}
                >
                  <div className="tn-no">
                    <span>{n.kind === "faction" ? "YS-F" : n.id}</span>
                    <span>{n.kind === "faction" ? "FACTION" : ""}</span>
                  </div>
                  <div className="tn-photo">
                    {n.kind === "faction" && n.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="fn-logo" src={asset(n.logo)} alt={n.title} />
                    ) : n.kind === "person" && n.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset(n.avatar)} alt={n.title} />
                    ) : (
                      <>
                        <svg className="silhouette" viewBox="0 0 64 80" aria-hidden="true">
                          <ellipse cx="32" cy="22" rx="14" ry="15" fill="rgba(194,155,64,0.45)" />
                          <path d="M10 78 C12 52 24 46 32 46 C40 46 52 52 54 78 Z" fill="rgba(194,155,64,0.45)" />
                        </svg>
                        {n.codename ? <span className="codename">{n.codename}</span> : null}
                      </>
                    )}
                  </div>
                  <div className="tn-name">{n.title}</div>
                  {n.kind === "person" ? (
                    <div className="tn-faction">
                      {f?.logo_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset(f.logo_path)} alt="" aria-hidden="true" />
                      ) : null}
                      <span className="mono">{n.faction ? (f?.title ?? n.faction) : nc.noFaction}</span>
                    </div>
                  ) : (
                    <div className="tn-faction"><span className="mono">{nc.archiveNo(n.id)}</span></div>
                  )}
                </div>
              );
            })}
          </div>

          {hoverNode && hoverNode.x !== undefined && hoverNode.y !== undefined ? (
            <div
              className="tac-tooltip"
              style={{
                left: Math.min(Math.max(transform.x + hoverNode.x * transform.k + 74, 12), Math.max((boardRef.current?.clientWidth || 400) - 236, 12)),
                top: Math.min(Math.max(transform.y + hoverNode.y * transform.k - 40, 12), Math.max((boardRef.current?.clientHeight || 400) - 160, 12)),
              }}
            >
              <div className="tt-no">{hoverNode.id}</div>
              <div className="tt-name">{hoverNode.title}</div>
              <div className="tt-meta">
                {hoverNode.kind === "person"
                  ? `${hoverNode.faction ? (factionBySlug.get(hoverNode.faction)?.title ?? hoverNode.faction) : nc.noFaction} · ${nc.archiveNo(String((adjacency.get(hoverNode.id)?.size || 0)))} REL`
                  : "FACTION"}
              </div>
              {hoverRels.length ? (
                <div className="tt-rel">
                  {hoverRels.map((l, i) => {
                    const s = l.source as SimNode, t = l.target as SimNode;
                    const other = s.id === hoverNode.id ? t : s;
                    const note = (l as any).note as string | undefined;
                    return (
                      <div key={i}>
                        <span className="mono">{l.member ? "MEMBER" : l.kind || "—"}</span> {other.title}
                        {note ? ` — ${note.length > 42 ? note.slice(0, 42) + "…" : note}` : ""}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="zoom-ctl">
            <button type="button" onClick={() => zoomBy(1.35)} aria-label={nc.zoomIn} title={nc.zoomIn}>+</button>
            <button type="button" onClick={() => zoomBy(1 / 1.35)} aria-label={nc.zoomOut} title={nc.zoomOut}>−</button>
            <button type="button" onClick={zoomReset} aria-label={nc.zoomReset} title={nc.zoomReset}>⟲</button>
          </div>
        </div>
      </div>

      {!local ? (
        <div className="tac-legend">
          <div className="tl-head">{nc.legendTitle}</div>
          {effectiveKinds.map((k) => {
            const c = kindCounts.get(k) || 0;
            const st = styleOf(k);
            return (
              <div
                key={k}
                className={`tl-row ${c === 0 ? "off" : ""}`}
                onClick={() => toggleKind(k)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleKind(k);
                  }
                }}
              >
                <span className="tl-swatch">
                  <svg width="88" height="12" aria-hidden="true">
                    <line x1="0" y1="6" x2="84" y2="6" stroke="rgba(194,155,64,0.75)" strokeWidth={st.width} strokeDasharray={st.dash} />
                  </svg>
                  <i />
                </span>
                <span className="tl-name">{k}</span>
                <span className="tl-count">{String(c).padStart(2, "0")}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      <span style={{ display: "none" }}>{tick}</span>
    </div>
  );
}
