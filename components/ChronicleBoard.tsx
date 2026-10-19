"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import MdView from "./MdView";
import { TYPE_META } from "../lib/types";
import type { ArchiveType } from "../lib/types";

export interface ChronicleItem {
  slug: string;
  period: string;
  subgroup: string;
  date_label: string;
  era_year: number | null;
  era_month: number | null;
  era_day: number | null;
  precision: string;
  related: { id: string; title: string; type: ArchiveType }[];
  body: string;
}

interface PeriodMeta { id: string; desc: string }

interface BandRow { kind: "year" | "month"; label: string; key: string }
interface EventRowData { kind: "event"; ev: ChronicleItem; label: string | null }
type Row = BandRow | EventRowData;

interface Group { subgroup: string; dated: boolean; rows: Row[] }
interface PeriodSec { period: PeriodMeta; groups: Group[] }

const DATED_SUBGROUPS = new Set(["灵帝年间", "万邦年间"]);
// 正文超过约两行才提供展开
const EXPAND_THRESHOLD = 75;

function eraNameOf(subgroup: string) {
  return subgroup === "灵帝年间" ? "灵帝" : "万邦";
}

// 向分组内追加一行；dated 分组自动插入年/月分组带，相邻同标签事件共享标签
function pushRow(g: Group & { curYear?: number | null; bandMonth?: number | null }, ev: ChronicleItem) {
  if (!g.dated || ev.era_year == null) {
    const prev = g.rows[g.rows.length - 1];
    const shared = prev && prev.kind === "event" && prev.ev.date_label === ev.date_label;
    g.rows.push({ kind: "event", ev, label: shared ? null : ev.date_label });
    if (g.dated) g.bandMonth = null;
    return;
  }
  if (ev.era_year !== g.curYear) {
    const era = eraNameOf(g.subgroup);
    const yLabel = ev.era_year === 1 ? `${era}元年` : `${era}${ev.era_year}年`;
    g.rows.push({ kind: "year", label: yLabel, key: `${g.subgroup}-y${ev.era_year}` });
    g.curYear = ev.era_year;
    g.bandMonth = null;
  }
  if (ev.precision === "日" || ev.precision === "月") {
    const mk = ev.era_month ?? 0;
    const freshBand = mk !== g.bandMonth;
    if (freshBand) {
      g.rows.push({ kind: "month", label: `${mk}月`, key: `${g.subgroup}-y${ev.era_year}-m${mk}` });
      g.bandMonth = mk;
    }
    // 日精度行显示「N日」；月精度行在刚发出的同名月带下用 〃 省重复
    const label = ev.precision === "日" ? `${ev.era_day}日` : freshBand ? null : `${mk}月`;
    g.rows.push({ kind: "event", ev, label });
  } else {
    // 年 / 年初 / 年末 / 春 / 夏 …：整标签展示，并打断月分组带；相邻同标签共享
    const prev = g.rows[g.rows.length - 1];
    const shared = prev && prev.kind === "event" && prev.ev.date_label === ev.date_label;
    g.rows.push({ kind: "event", ev, label: shared ? null : ev.date_label });
    g.bandMonth = null;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mq2 = window.matchMedia("(max-width: 860px)");
    const update = () => setReduced(mq.matches || mq2.matches);
    update();
    mq.addEventListener("change", update);
    mq2.addEventListener("change", update);
    return () => { mq.removeEventListener("change", update); mq2.removeEventListener("change", update); };
  }, []);
  return reduced;
}

export default function ChronicleBoard({ events, periods }: { events: ChronicleItem[]; periods: PeriodMeta[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const grouped = useMemo(() => {
    const q = query.trim();
    const vis = q
      ? events.filter((e) => e.body.includes(q) || e.date_label.includes(q) || e.subgroup.includes(q))
      : events;
    const list: PeriodSec[] = periods.map((p) => ({ period: p, groups: [] }));
    const byPeriod = new Map(list.map((o) => [o.period.id, o]));
    for (const ev of vis) {
      const po = byPeriod.get(ev.period);
      if (!po) continue;
      let g = po.groups[po.groups.length - 1] as (Group & { curYear?: number | null; bandMonth?: number | null }) | undefined;
      if (!g || g.subgroup !== ev.subgroup) {
        g = { subgroup: ev.subgroup, dated: DATED_SUBGROUPS.has(ev.subgroup), rows: [], curYear: null, bandMonth: null };
        po.groups.push(g);
      }
      pushRow(g, ev);
    }
    return { list, visibleCount: vis.length };
  }, [events, query, periods]);

  // 滚动进入视口：轻微淡入上浮（200ms），同屏多条同时触发，不排队
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal]");
    if (reduced || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.remove("pre", "in"));
      return;
    }
    els.forEach((el) => el.classList.add("pre"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }
      },
      { threshold: 0.04, rootMargin: "0px 0px -3% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [grouped, reduced]);

  // 时间轴竖线"描绘"：金线随滚动极轻微生长
  useLayoutEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    if (!root) return;
    const lists = Array.from(root.querySelectorAll<HTMLElement>(".chron-list"));
    if (!lists.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of lists) {
        const fill = el.querySelector<HTMLElement>(".chron-line-gold");
        if (!fill) continue;
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height));
        fill.style.height = `${(p * 100).toFixed(2)}%`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [grouped, reduced]);

  function jump(i: number) {
    const el = document.getElementById(`chron-period-${i}`);
    if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  return (
    <div ref={rootRef}>
      <div className="chron-controls" data-pagefind-ignore>
        <div className="chron-jump">
          {periods.map((p, i) => (
            <button key={p.id} type="button" className="tab" onClick={() => jump(i)}>
              {p.id}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="chron-filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="过滤事件文本…"
          aria-label="过滤事件文本"
        />
        <span className="chron-count mono">
          {grouped.visibleCount} / {events.length}
        </span>
      </div>

      {grouped.visibleCount === 0 ? (
        <p className="muted" style={{ padding: "30px 0" }}>没有符合过滤条件的事件。</p>
      ) : (
        grouped.list.map((p, i) => (
          <section key={p.period.id} id={`chron-period-${i}`} className="chron-period">
            <header className="chron-period-head" data-reveal="head">
              <h2>{p.period.id}</h2>
              <p>{p.period.desc}</p>
            </header>
            {p.groups.map((g) =>
              g.rows.length === 0 ? null : (
                <div className="chron-group" key={g.subgroup}>
                  {g.subgroup === "万邦年间" ? null : (
                    <h3 className="chron-subhead">{g.subgroup}</h3>
                  )}
                  <div className="chron-list">
                    <div className="chron-line-gold" aria-hidden />
                    {g.rows.map((r) =>
                      r.kind === "event" ? (
                        <EventRow key={r.ev.slug} r={r} open={expanded.has(r.ev.slug)} onToggle={toggle} dated={g.dated} />
                      ) : (
                        <div key={r.key} className={`chron-band chron-band-${r.kind}`}>
                          {r.label}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </section>
        ))
      )}
    </div>
  );
}

function EventRow({ r, open, onToggle, dated }: { r: EventRowData; open: boolean; onToggle: (slug: string) => void; dated: boolean }) {
  const ev = r.ev;
  const expandable = ev.body.replace(/\s/g, "").length > EXPAND_THRESHOLD;
  return (
    <article className={`chron-row${dated ? "" : " chron-row-nolabel"}`} id={ev.slug} data-reveal>
      <span className="chron-dot" aria-hidden />
      {dated ? (
        <div className="chron-label mono">
          {r.label == null ? <span className="chron-ditto">〃</span> : r.label}
        </div>
      ) : null}
      <div className="chron-main">
        <div className={`chron-text${expandable && !open ? " clamp" : ""}`}>
          <MdView>{ev.body}</MdView>
        </div>
        {expandable ? (
          <button type="button" className="chron-more" onClick={() => onToggle(ev.slug)}>
            {open ? "收起 ▴" : "详情 ▾"}
          </button>
        ) : null}
        <div className="chron-rowfoot">
          {ev.related.length ? (
            <span className="chron-chips">
              {ev.related.map((x) => (
                <Link key={x.id} href={`/archives/${x.id}/`} className="chron-chip">
                  <span className="chip-type">{TYPE_META[x.type].label}</span>
                  {x.title}
                </Link>
              ))}
            </span>
          ) : null}
          <a className="chron-anchor" href={`#${ev.slug}`} title="定位链接" aria-label="事件定位链接">
            ¶
          </a>
        </div>
      </div>
    </article>
  );
}
