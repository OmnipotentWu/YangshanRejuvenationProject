"use client";

import { useState } from "react";
import { asset } from "../lib/assets";

export default function Gallery({ items }: { items: { src: string; caption?: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <>
      <h2 style={{ marginTop: 30, fontSize: 19 }}>图档</h2>
      <div className="gallery-grid">
        {items.map((g, i) => (
          <figure key={g.src} className="gal-card" onClick={() => setOpen(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(g.src)} alt={g.caption || "图档"} />
            {g.caption ? <figcaption>{g.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      {open !== null && items[open] ? (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <button type="button" className="lb-close" aria-label="关闭">×</button>
          {open > 0 ? (
            <button type="button" className="lb-nav lb-prev" aria-label="上一张" onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }}>‹</button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(items[open].src)} alt={items[open].caption || "图档"} onClick={(e) => e.stopPropagation()} />
          {items[open].caption ? <div className="lb-caption">{items[open].caption}</div> : null}
          {open < items.length - 1 ? (
            <button type="button" className="lb-nav lb-next" aria-label="下一张" onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }}>›</button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
