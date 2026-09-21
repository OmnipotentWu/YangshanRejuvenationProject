"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { asset } from "../lib/assets";

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
  angle: number;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  kind: string;
  member?: boolean;
}

const FACTION_COLORS: Record<string, string> = {
  yrp: "#C29B40",
  zhaohe: "#4A6B8A",
  sangyu: "#7A5C8C",
  fengrui: "#8C3B2E",
  minxin: "#4A5D4E",
  chenshan: "#8A6B3B",
};
const FALLBACK_COLORS = ["#C29B40", "#4A6B8A", "#7A5C8C", "#8C3B2E", "#4A5D4E", "#8A6B3B", "#5E6E7B"];
const MEMBER_KIND = "__member__";

function hashN(n: string | number) {
  const s = String(n);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function angleOf(id: string | number) {
  return (hashN(id) % 9) - 4; // 固定伪随机角度，≤4°
}

export default function NetworkBoard({ data, local = false }: { data: BoardData; local?: boolean }) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [mode, setMode] = useState<"person" | "mixed">("person");
  const [colorFaction, setColorFaction] = useState(true);
  const [activeKinds, setActiveKinds] = useState<Set<string>>(new Set(data.kinds));
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const dragMoved = useRef(false);

  const nodes = useMemo<SimNode[]>(() => {
    const base: SimNode[] = data.persons.map((p) => ({
      id: p.id,
      kind: "person",
      title: p.title,
      codename: p.codename,
      faction: p.faction,
      avatar: p.avatar,
      angle: angleOf(p.id),
    }));
    if (mode === "mixed") {
      for (const f of data.factions) {
        base.push({ id: f.id, kind: "faction", title: f.title, logo: f.logo_path, faction: f.slug, angle: angleOf(`${f.id}-f`) });
      }
    }
    return base;
  }, [data, mode]);

  const links = useMemo<SimLink[]>(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const ls: SimLink[] = [];
    for (const e of data.edges) {
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
        ls.push({ source: e.source, target: e.target, kind: e.kind });
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

  // 邻接表（hover 高亮用）
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

  const searchHits = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return new Set(nodes.filter((n) => n.title.includes(q) || (n.codename || "").includes(q)).map((n) => n.id));
  }, [nodes, query]);

  useEffect(() => {
    const board = boardRef.current;
    const world = worldRef.current;
    if (!board || !world) return;

    // 初始视图：世界原点对准板面中心
    const initial = d3.zoomIdentity.translate(board.clientWidth / 2, board.clientHeight / 2);
    setTransform(initial);

    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id).distance(local ? 110 : 150).strength(0.8)
      )
      .force("charge", d3.forceManyBody().strength(local ? -320 : -480))
      .force("collide", d3.forceCollide(local ? 62 : 84))
      .force("x", d3.forceX(0).strength(0.05))
      .force("y", d3.forceY(0).strength(0.07))
      .on("tick", () => setTick((t) => t + 1));

    // 初始环形分布
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      if (n.x === undefined) n.x = Math.cos(a) * 160;
      if (n.y === undefined) n.y = Math.sin(a) * 160;
    });

    const zoom = d3
      .zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.35, 2.6])
      .on("zoom", (ev) => setTransform(ev.transform));
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
        // 将屏幕坐标换算回世界坐标
        const pt = transform.invert([ev.x, ev.y] as [number, number]);
        d.fx = pt[0]; d.fy = pt[1];
      })
      .on("end", (ev, d) => {
        if (!ev.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    const sel = d3.select(world).selectAll<HTMLDivElement, SimNode>("div.polaroid");
    sel.datum((d, i) => nodes[i] || d);
    sel.call(dragBehavior as any);

    return () => {
      sim.stop();
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

  const visibleLinks = links.filter((l) => l.member || activeKinds.has(l.kind));
  const factionColorOf = (n: SimNode) => {
    if (!colorFaction || !n.faction) return "var(--gold)";
    return FACTION_COLORS[n.faction] || FALLBACK_COLORS[hashN(n.id) % FALLBACK_COLORS.length];
  };

  function edgePath(l: SimLink, i: number): string {
    const s = l.source as SimNode, t = l.target as SimNode;
    const mx = (s.x! + t.x!) / 2, my = (s.y! + t.y!) / 2;
    const dx = t.x! - s.x!, dy = t.y! - s.y!;
    const len = Math.hypot(dx, dy) || 1;
    const off = (hashN(i) % 44) - 22 || 18;
    const cx = mx - (dy / len) * off, cy = my + (dx / len) * off;
    return `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
  }

  const litIds = hover !== null ? adjacency.get(hover) : null;

  return (
    <div>
      {!local ? (
        <div className="board-tools">
          <button type="button" className={`toggle-btn ${mode === "person" ? "on" : ""}`} onClick={() => setMode("person")}>
            仅人员
          </button>
          <button type="button" className={`toggle-btn ${mode === "mixed" ? "on" : ""}`} onClick={() => setMode("mixed")}>
            人员 + 势力
          </button>
          <button type="button" className={`toggle-btn ${colorFaction ? "on" : ""}`} onClick={() => setColorFaction(!colorFaction)}>
            按势力着色
          </button>
          <span style={{ width: 8 }} />
          {data.kinds.map((k) => (
            <button key={k} type="button" className={`clue-tag ${activeKinds.has(k) ? "on" : ""}`} onClick={() => toggleKind(k)}>
              {k}
            </button>
          ))}
          <span className="spacer" />
          <input type="text" placeholder="查找线索（姓名 / 代称）" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>
          以该个体为中心的局部关系线索板 · 拖拽可移动卡片 · 点击卡片调阅档案
        </p>
      )}
      <div className={`board-wrap ${local ? "local-wrap" : ""}`}>
        <div className={`board ${local ? "local-board" : ""}`} ref={boardRef}>
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
            <svg className="board-svg">
              <g>
                {visibleLinks.map((l, i) => {
                  const s = l.source as SimNode, t = l.target as SimNode;
                  const isLit = hover !== null && (s.id === hover || t.id === hover);
                  const isDim = hover !== null && !isLit && !l.member;
                  const midPath = edgePath(l, i);
                  const parts = midPath.split(" ");
                  const cx = parseFloat(parts[4]), cy = parseFloat(parts[5]);
                  const labelX = (parseFloat(parts[1]) + parseFloat(parts[6])) / 2 * 0.5 + cx * 0.5;
                  const labelY = (parseFloat(parts[2]) + parseFloat(parts[7])) / 2 * 0.5 + cy * 0.5;
                  return (
                    <g key={i}>
                      <path
                        className={`thread ${isLit ? "lit" : ""} ${isDim ? "dim" : ""}`}
                        d={midPath}
                        strokeDasharray={l.member ? "4 4" : undefined}
                        stroke={l.member ? "#C29B40" : undefined}
                        strokeWidth={l.member ? 1.4 : undefined}
                      />
                      {!l.member ? (
                        <g className={`thread-label ${isDim ? "dim" : ""}`} transform={`translate(${labelX}, ${labelY})`}>
                          <rect x={-l.kind.length * 5.6 - 6} y={-9} width={l.kind.length * 11.2 + 12} height={18} rx={2} />
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
              return (
                <div
                  key={n.id}
                  className={`polaroid ${n.kind === "faction" ? "faction-node" : ""} ${dimmed ? "dimmed" : ""}`}
                  style={{
                    left: n.x ?? 0,
                    top: n.y ?? 0,
                    transform: `translate(-50%, -50%) rotate(${n.angle}deg) ${hit ? "scale(1.1)" : ""} ${n.id === hover ? "scale(1.06)" : ""}`,
                    zIndex: n.id === hover ? 20 : hit ? 15 : 1,
                    outline: hit ? "2px solid var(--gold)" : undefined,
                  }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => nodeClick(n.id)}
                >
                  <span className="pin" style={colorFaction && n.faction ? { background: `radial-gradient(circle at 35% 30%, #fff5, ${factionColorOf(n)} 55%, #26241F 130%)` } : undefined} />
                  <div className="photo">
                    {n.kind === "faction" && n.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset(n.logo)} alt={n.title} />
                    ) : n.kind === "person" && n.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="avatar-fill" src={asset(n.avatar)} alt={n.title} />
                    ) : (
                      <>
                        <svg className="silhouette" viewBox="0 0 64 80" aria-hidden>
                          <ellipse cx="32" cy="22" rx="14" ry="15" fill="#C9B98A" opacity="0.55" />
                          <path d="M10 78 C12 52 24 46 32 46 C40 46 52 52 54 78 Z" fill="#C9B98A" opacity="0.55" />
                        </svg>
                        {n.codename ? <span className="codename">{n.codename}</span> : null}
                      </>
                    )}
                  </div>
                  <div className="p-name">{n.title}</div>
                  {n.kind === "person" ? (
                    <div className="p-faction">
                      {n.faction ? (data.factions.find((f) => f.slug === n.faction)?.title ?? "") : "未登记势力"}
                    </div>
                  ) : (
                    <div className="p-faction">势力</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <span style={{ display: "none" }}>{tick}</span>
    </div>
  );
}
