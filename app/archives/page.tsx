"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { asset } from "../../lib/assets";
import { GRADES, SIX_DIMS, SPECIAL_MARKS, TYPE_META, TYPE_ORDER } from "../../lib/types";
import type { ArchiveType } from "../../lib/types";
import { SITE_COPY } from "../../lib/site-copy";
import { fmtDate } from "../../lib/format";

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
const cp = SITE_COPY.archives;

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
    return <div className="container" style={{ paddingTop: 40 }}><div className="list-empty">{cp.loading}</div></div>;
  }

  return (
    <div className="container fade-in" style={{ paddingTop: 28, paddingBottom: 20 }}>
      <div className="eyebrow">{cp.eyebrow}</div>
      <div className="page-head">
        <h1>{cp.title}</h1>
        <div className="ph-count">{cp.count(filtered.length)}</div>
      </div>

      <div className="tabs">
        <button type="button" className={`tab ${type === "all" ? "active" : ""}`} onClick={() => { setType("all"); resetPage(); }}>{cp.tabAll}</button>
        {TYPE_ORDER.map((t) => (
          <button key={t} type="button" className={`tab ${type === t ? "active" : ""}`} onClick={() => { setType(t); resetPage(); }}>
            {TYPE_META[t].label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <label className="fb-item">
          <span className="fb-label">{cp.filterTag}</span>
          <select value={tag} onChange={(e) => { setTag(e.target.value); resetPage(); }}>
            <option value="">{cp.filterAll}</option>
            {data.tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        {type === "anomaly" || type === "all" ? (
          <label className="fb-item">
            <span className="fb-label">{cp.filterMark}</span>
            <select value={mark} onChange={(e) => { setMark(e.target.value); resetPage(); }}>
              <option value="">{cp.filterAll}</option>
              {SPECIAL_MARKS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        ) : null}
        {type === "person" || type === "all" ? (
          <label className="fb-item">
            <span className="fb-label">{cp.filterFaction}</span>
            <select value={faction} onChange={(e) => { setFaction(e.target.value); resetPage(); }}>
              <option value="">{cp.filterAll}</option>
              {data.factions.map((f) => (
                <option key={f.slug || f.id} value={f.slug}>{f.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {type === "person" || type === "all" ? (
          <label className="fb-item">
            <span className="fb-label">{cp.filterStat}</span>
            <select value={dim} onChange={(e) => { setDim(e.target.value); resetPage(); }}>
              <option value="">{cp.filterDim}</option>
              {SIX_DIMS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={grade} onChange={(e) => { setGrade(e.target.value); resetPage(); }}>
              <option value="">{cp.filterGrade}</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        ) : null}
        {(tag || mark || faction || dim || grade) ? (
          <button
            type="button"
            className="fb-clear"
            onClick={() => { setTag(""); setMark(""); setFaction(""); setDim(""); setGrade(""); resetPage(); }}
          >
            {cp.filterClear}
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="list-empty">{cp.empty}</div>
      ) : (
        <div className="intel-list">
          {rows.map((a) => (
            <Link key={a.id} href={`/archives/${a.id}/`} className={`intel-row ${a.summary ? "has-summary" : ""}`}>
              <span className="ir-type">{TYPE_META[a.type].label}</span>
              <span className="ir-date">{fmtDate(a.updated)}</span>
              <span className="ir-title">
                <span className="ir-code">{a.no}</span>
                {a.title}
              </span>
              <span className="ir-arrow" aria-hidden="true">▸</span>
              {a.summary ? (
                <span className="ir-summary">{a.summary.length > 90 ? a.summary.slice(0, 90) + "…" : a.summary}</span>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label={cp.pagerAria}>
          {cur > 1 ? <a onClick={() => setPage(cur - 1)}>{cp.pagePrev}</a> : null}
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
            p === cur ? (
              <span key={p} className="cur">{p}</span>
            ) : (
              <a key={p} onClick={() => setPage(p)}>{p}</a>
            )
          )}
          {cur < pages ? <a onClick={() => setPage(cur + 1)}>{cp.pageNext}</a> : null}
        </nav>
      ) : null}
    </div>
  );
}
