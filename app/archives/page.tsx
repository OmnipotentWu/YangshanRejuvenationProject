"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { asset } from "../../lib/assets";
import { GRADES, SIX_DIMS, SPECIAL_MARKS, TYPE_META, TYPE_ORDER } from "../../lib/types";
import type { ArchiveType } from "../../lib/types";

interface Item {
  id: number;
  no: string;
  type: ArchiveType;
  title: string;
  codename: string | null;
  summary: string | null;
  updated: string;
  tags: string[];
  mark?: string;
  faction?: string;
  stats?: Record<string, string>;
}

const PAGE_SIZE = 12;

export default function ArchivesPage() {
  const [data, setData] = useState<{ archives: Item[]; tags: string[]; factions: { id: number; title: string; slug: string }[] } | null>(null);
  const [type, setType] = useState<ArchiveType | "all">("all");
  const [tag, setTag] = useState("");
  const [mark, setMark] = useState("");
  const [faction, setFaction] = useState("");
  const [dim, setDim] = useState("");
  const [grade, setGrade] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(asset("/data/archives-index.json"), { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ archives: [], tags: [], factions: [] }));
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("type");
    if (t && (TYPE_ORDER as string[]).includes(t)) setType(t as ArchiveType);
    const tg = p.get("tag");
    if (tg) setTag(tg);
    const mk = p.get("mark");
    if (mk) setMark(mk);
    const fc = p.get("faction");
    if (fc) setFaction(fc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.archives.filter((a) => {
      if (type !== "all" && a.type !== type) return false;
      if (tag && !a.tags.includes(tag)) return false;
      if (mark && (a.mark || "无") !== mark) return false;
      if (faction && (a.faction || "") !== faction) return false;
      if (dim && grade && (a.stats?.[dim] || "") !== grade) return false;
      return true;
    });
  }, [data, type, tag, mark, faction, dim, grade]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  if (!data) {
    return <div className="container" style={{ paddingTop: 40 }}><p className="muted">档案索引加载中…</p></div>;
  }

  return (
    <div className="container fade-in" style={{ paddingTop: 28, paddingBottom: 20 }}>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h2>档案库</h2>
        <span className="muted mono" style={{ fontSize: 12.5 }}>共 {filtered.length} 份在册档案</span>
      </div>

      <div className="tabs">
        <button type="button" className={`tab ${type === "all" ? "active" : ""}`} onClick={() => { setType("all"); resetPage(); }}>全部</button>
        {TYPE_ORDER.map((t) => (
          <button key={t} type="button" className={`tab ${type === t ? "active" : ""}`} onClick={() => { setType(t); resetPage(); }}>
            {TYPE_META[t].label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <label>
          标签{" "}
          <select value={tag} onChange={(e) => { setTag(e.target.value); resetPage(); }}>
            <option value="">全部</option>
            {data.tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        {type === "anomaly" || type === "all" ? (
          <label>
            特殊谬误标记{" "}
            <select value={mark} onChange={(e) => { setMark(e.target.value); resetPage(); }}>
              <option value="">全部</option>
              {SPECIAL_MARKS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        ) : null}
        {type === "person" || type === "all" ? (
          <>
            <label>
              所属势力{" "}
              <select value={faction} onChange={(e) => { setFaction(e.target.value); resetPage(); }}>
                <option value="">全部</option>
                {data.factions.map((f) => (
                  <option key={f.slug || f.id} value={f.slug}>{f.title}</option>
                ))}
              </select>
            </label>
            <label>
              六维评级{" "}
              <select value={dim} onChange={(e) => { setDim(e.target.value); resetPage(); }}>
                <option value="">维度</option>
                {SIX_DIMS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={grade} onChange={(e) => { setGrade(e.target.value); resetPage(); }} style={{ marginLeft: 4 }}>
                <option value="">评级</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        {(tag || mark || faction || dim || grade) ? (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => { setTag(""); setMark(""); setFaction(""); setDim(""); setGrade(""); resetPage(); }}
          >
            清除
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="muted" style={{ padding: "30px 0" }}>没有符合条件的档案。</p>
      ) : (
        <div className="card-grid">
          {rows.map((a) => (
            <div key={a.id} className="card fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="archive-no">{a.no}</span>
                <span className="badge badge-gold">{TYPE_META[a.type].label}</span>
              </div>
              <div className="card-title" style={{ marginTop: 6 }}>
                <Link href={`/archives/${a.id}/`}>{a.title}</Link>
                {a.codename ? <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>（{a.codename}）</span> : null}
              </div>
              {a.summary ? (
                <p className="muted" style={{ fontSize: 13.5, margin: "0 0 8px" }}>
                  {a.summary.length > 90 ? a.summary.slice(0, 90) + "…" : a.summary}
                </p>
              ) : null}
              <div className="mono muted" style={{ fontSize: 11.5 }}>更新于 {a.updated}</div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label="分页">
          {cur > 1 ? <button type="button" className="tab" onClick={() => setPage(cur - 1)}>上一页</button> : null}
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
            p === cur ? (
              <span key={p} className="cur">{p}</span>
            ) : (
              <button key={p} type="button" className="tab" onClick={() => setPage(p)}>{p}</button>
            )
          )}
          {cur < pages ? <button type="button" className="tab" onClick={() => setPage(cur + 1)}>下一页</button> : null}
        </nav>
      ) : null}
    </div>
  );
}
