"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { asset } from "../../lib/assets";
import { SITE_COPY } from "../../lib/site-copy";
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
      <header className="page-head">
        <div className="eyebrow">{SITE_COPY.search.eyebrow}</div>
        <h1>{SITE_COPY.search.title}</h1>
      </header>
      <form
        className="search-box"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <input
          type="text"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder={SITE_COPY.search.placeholder}
        />
        <button type="submit">{SITE_COPY.search.button}</button>
      </form>

      {loading ? <p className="muted" style={{ fontSize: 13.5 }}>{SITE_COPY.search.searching}</p> : null}
      {!loading && started && total === 0 ? (
        <p className="muted" style={{ padding: "24px 0" }}>{SITE_COPY.search.empty(q)}</p>
      ) : null}
      {!loading && started && total > 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>{SITE_COPY.search.hitCount(total)}</p>
      ) : null}
      {!started && !loading ? (
        <p className="search-hint">{SITE_COPY.search.hint}</p>
      ) : null}

      {TYPE_ORDER.map((t) =>
        groups[t]?.length ? (
          <div key={t} className="result-group">
            <h3>
              {TYPE_META[t].label}{" "}
              <span className="muted mono" style={{ fontSize: 12 }}>{groups[t]!.length}</span>
            </h3>
            {groups[t]!.map((h, i) => (
              <div key={i} className="result-item">
                <a className="ri-title" href={asset(h.url)}>
                  {h.meta.title || h.url}
                </a>
                <div
                  className="ri-excerpt"
                  dangerouslySetInnerHTML={{ __html: hitExcerpt(h) }}
                />
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
