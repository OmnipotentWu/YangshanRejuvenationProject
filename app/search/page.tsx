"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { asset } from "../../lib/assets";
import { TYPE_META, TYPE_ORDER } from "../../lib/types";
import type { ArchiveType } from "../../lib/types";

interface Hit {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Partial<Record<ArchiveType, Hit[]>>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const pfRef = useRef<any>(null);
  const timer = useRef<any>(null);

  async function ensurePagefind() {
    if (!pfRef.current) {
      pfRef.current = await import(/* webpackIgnore: true */ asset("/pagefind/pagefind.js"));
    }
    return pfRef.current;
  }

  async function run(query: string) {
    const queryStr = query.trim();
    if (!queryStr) {
      setGroups({});
      setTotal(0);
      setStarted(false);
      return;
    }
    setLoading(true);
    try {
      const pagefind = await ensurePagefind();
      const res = await pagefind.search(queryStr);
      const hits: Hit[] = [];
      for (const r of res.results.slice(0, 60)) {
        const d = await r.data();
        if (d.meta?.archive_type) hits.push(d);
      }
      const g: Partial<Record<ArchiveType, Hit[]>> = {};
      for (const h of hits) {
        const t = h.meta.archive_type as ArchiveType;
        (g[t] ||= []).push(h);
      }
      setGroups(g);
      setTotal(hits.length);
      setStarted(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") || "";
    setQ(initial);
    if (initial) run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(v), 250);
  }

  return (
    <div className="container fade-in" style={{ paddingTop: 28, maxWidth: 860 }}>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h2>档案检索</h2>
      </div>
      <form
        className="filter-bar"
        style={{ padding: "14px 16px" }}
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <input
          type="text"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入标题、识别代称或正文关键词…"
          style={{ flex: 1, minWidth: 240, padding: "7px 12px", fontSize: 15 }}
        />
        <button type="submit" className="btn btn-gold">检索</button>
      </form>

      {loading ? <p className="muted" style={{ fontSize: 13.5 }}>检索中…</p> : null}
      {!loading && started && total === 0 ? (
        <p className="muted" style={{ padding: "24px 0" }}>未检索到与「{q}」相关的档案。</p>
      ) : null}
      {!loading && started && total > 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>共命中 {total} 份档案：</p>
      ) : null}
      {!started && !loading ? (
        <p className="muted">输入关键词以检索全部档案（标题 / 识别代称 / 正文全文）。</p>
      ) : null}

      {TYPE_ORDER.map((t) =>
        groups[t]?.length ? (
          <div key={t} className="result-group">
            <h3>
              {TYPE_META[t].label} <span className="muted mono" style={{ fontSize: 12 }}>{groups[t]!.length}</span>
            </h3>
            {groups[t]!.map((h, i) => (
              <div key={i} className="archive-row" style={{ alignItems: "baseline" }}>
                <span className="archive-no">{h.meta.no || ""}</span>
                <span style={{ flex: 1, minWidth: 220 }}>
                  <a href={asset(h.url)} style={{ fontWeight: 600, fontSize: 15.5, color: "var(--ink)" }}>
                    {h.meta.title || h.url}
                  </a>
                  <span
                    className="muted"
                    style={{ display: "block", fontSize: 12.5 }}
                    dangerouslySetInnerHTML={{ __html: hitExcerpt(h) }}
                  />
                </span>
              </div>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}

function hitExcerpt(hit: Hit): string {
  const ex = hit.excerpt || "";
  return ex.length > 160 ? ex.slice(0, 160) + "…" : ex;
}
