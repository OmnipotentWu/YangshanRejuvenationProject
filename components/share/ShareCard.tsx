// 分享卡片渲染组件：仅在导出图片时由 export.ts 挂载到离屏容器（.sc-host）。
// 设计约束：纯 CSS、无滤镜 / 无 clip-path / 无文字描边，保证 DOM 截图还原度。
// 组件同时用于「测量」（一次渲染全部区块）与「出图」（按分页计划渲染每页）。

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkFirstLineIndent from "../../lib/remark-indent";
import { asset } from "../../lib/assets";
import { SIX_DIMS } from "../../lib/types";
import type { ShareBlock, SharePayload } from "../../lib/share-blocks";

// 与 MdView 相同的净化规则（允许首行缩进段落的 fi class）
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    p: [...((defaultSchema.attributes as any)?.p ?? []), ["className", "fi"]],
  },
};

// 图片加载完成后内联写入确定的显示尺寸：量高与出图都以该尺寸为准，
// 避免大图在离屏容器中的加载/解码时序影响排版，也保证 DOM 克隆时尺寸不丢失。
function SizedImg({ src, alt = "", className, maxW, maxH }: { src: string; alt?: string; className?: string; maxW: number; maxH: number }) {
  const ref = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const nw = el.naturalWidth;
      const nh = el.naturalHeight;
      if (!nw || !nh) return;
      const s = Math.min(1, maxW / nw, maxH / nh);
      const w = Math.round(nw * s * 10) / 10;
      const h = Math.round(nh * s * 10) / 10;
      setSize((p) => (p && Math.abs(p.w - w) < 0.5 && Math.abs(p.h - h) < 0.5 ? p : { w, h }));
    };
    if (el.complete && el.naturalWidth) apply();
    el.addEventListener("load", apply);
    return () => el.removeEventListener("load", apply);
  }, [src, maxW, maxH]);
  return <img ref={ref} src={src} alt={alt} className={className} style={size ? { width: size.w, height: size.h } : undefined} />;
}

function MdA({ href, children }: any) {
  return <a href={href ? asset(String(href)) : href}>{children}</a>;
}
function MdImg({ src, alt }: any) {
  return <SizedImg src={src ? asset(String(src)) : src} alt={alt || ""} maxW={928} maxH={880} />;
}

// 与详情页 MdView 相同的 Markdown 渲染（字号/行高由 .sc-md 覆盖）
function ShareMd({ md }: { md: string }) {
  const processed = md.replace(/^>>[ \t]?/gm, "[[IND]] ");
  return (
    <div className="sc-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFirstLineIndent]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{ a: MdA, img: MdImg }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

// 分页计划中的一页条目：bi=区块序号；cont=是否续页；[from,to)=子段落区间
export interface PageItem {
  bi: number;
  cont: boolean;
  from: number;
  to: number;
}

// 块头：金色区块编号 + 字段名 + 细分隔线
function BlockHead({ code, label, cont }: { code?: number; label: string; cont: boolean }) {
  return (
    <div className="sc-bhead">
      {code != null ? <span className="sc-bcode">SEC-{String(code).padStart(2, "0")}</span> : null}
      <span className="sc-bname">{label}</span>
      {cont ? <span className="sc-cont">（续）</span> : null}
      <span className="sc-brule" aria-hidden="true" />
    </div>
  );
}

function RadarGradeStrip({ stats }: { stats: Record<string, string> }) {
  return (
    <div className="sc-grades">
      {SIX_DIMS.map((d) => (
        <span className="g" key={d}>
          {d}
          <b>{stats?.[d] || "—"}</b>
        </span>
      ))}
    </div>
  );
}

// 完整渲染一个区块（measure 模式与整页放下时使用；分页切片由外层 Slice 处理）
export function BlockContent({
  block,
  radarImg,
  cont,
}: {
  block: ShareBlock;
  radarImg?: string;
  cont: boolean;
}) {
  switch (block.kind) {
    case "avatar":
      return <SizedImg className="sc-avatar" src={block.src} alt="" maxW={380} maxH={460} />;
    case "info":
      return (
        <section className="sc-block" data-rblock>
          <div className="sc-info" data-rbody>
            {block.rows.map((r, i) => (
              <div className={`cell${r.k.length >= 8 ? " full" : ""}`} key={i}>
                <span className="k">{r.k}</span>
                <span className={`v${r.warn ? " warn" : ""}`}>{r.v}</span>
              </div>
            ))}
          </div>
        </section>
      );
    case "md":
      return (
        <section className="sc-block" data-rblock>
          <BlockHead code={block.sec} label={block.label} cont={cont} />
          <div className="sc-body">
            <ShareMd md={block.md} />
          </div>
        </section>
      );
    case "radar":
      return (
        <section className="sc-block sc-radar-block" data-rblock>
          <BlockHead label={block.label} cont={cont} />
          <div className="sc-radar-panel">
            <div className="sc-radar-legend">{block.legend}</div>
            {radarImg ? <img className="sc-radar-img" src={radarImg} alt={block.label} width={620} height={620} /> : null}
            <RadarGradeStrip stats={block.stats} />
          </div>
        </section>
      );
    case "gallery":
      return (
        <section className="sc-block" data-rblock>
          <BlockHead code={block.sec} label={block.label} cont={cont} />
          <div className="sc-figs" data-rbody>
            {block.images.map((im, i) => (
              <figure className="sc-fig" key={i}>
                <SizedImg src={im.src} alt={im.caption || ""} maxW={928} maxH={720} />
                {im.caption ? <figcaption>{im.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      );
  }
}

// 分页切片：挂载后把 [from,to) 以外的顶层子段落隐藏（display:none 不参与截图与布局）
export function Slice({ item, children }: { item: PageItem; children: React.ReactNode }) {
  const ref = (node: HTMLDivElement | null) => {
    if (!node) return;
    const body = (node.querySelector("[data-rbody]") || node.querySelector(".sc-md")) as HTMLElement | null;
    if (!body) return;
    Array.from(body.children).forEach((el, i) => {
      (el as HTMLElement).style.display = i >= item.from && i < item.to ? "" : "none";
    });
  };
  return <div ref={ref}>{children}</div>;
}

function ShareHeader({ payload }: { payload: SharePayload }) {
  const i = payload.archiveNo.lastIndexOf("-");
  const pre = i < 0 ? payload.archiveNo : payload.archiveNo.slice(0, i);
  const suf = i < 0 ? "" : payload.archiveNo.slice(i + 1);
  return (
    <header className="sc-head">
      <div className="sc-head-top">
        <div className="sc-no">
          <span>{pre}</span>
          {suf ? (
            <>
              <span className="sc-no-sep">-</span>
              <span className="sc-no-sfx">{suf}</span>
            </>
          ) : null}
        </div>
        <div className="sc-type">
          {payload.typePrefix} · {payload.typeLabel}
        </div>
      </div>
      <h1 className="sc-title">{payload.title}</h1>
      <div className="sc-head-meta">
        <span className="sc-meta-line">{payload.metaLine}</span>
        {payload.badges.map((b, i2) => (
          <span className="sc-chip danger" key={`b${i2}`}>
            {b}
          </span>
        ))}
        {payload.tags.map((t, i2) => (
          <span className="sc-chip" key={`t${i2}`}>
            # {t}
          </span>
        ))}
      </div>
      <div className="sc-head-rule" aria-hidden="true" />
    </header>
  );
}

function ShareFooter({ pageNo, total, qr }: { pageNo: number; total: number; qr: string | null }) {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <footer className="sc-foot">
      <span className="sc-site">仰山档案 · 仰山市档案与公共安全部</span>
      <span className="sc-right">
        {qr ? <img className="sc-qr" src={qr} alt="" width={84} height={84} /> : null}
        <span className="sc-page-no">
          {p(pageNo)} / {p(total)}
        </span>
      </span>
    </footer>
  );
}

// 一页 1080×1350 成品（出图模式）
export function SharePageView({
  payload,
  radarImgs,
  items,
  pageNo,
  total,
  qr,
}: {
  payload: SharePayload;
  radarImgs: Map<number, string>;
  items: PageItem[];
  pageNo: number;
  total: number;
  qr: string | null;
}) {
  return (
    <div className="sc-page">
      <div className="sc-card">
        <div className="sc-pad">
          {pageNo === 1 ? <ShareHeader payload={payload} /> : null}
          {items.map((it, k) =>
            it.from === 0 && (it.to === Infinity || it.to >= childCount(payload.blocks[it.bi])) ? (
              <BlockContent key={k} block={payload.blocks[it.bi]} radarImg={radarImgs.get(it.bi)} cont={it.cont} />
            ) : (
              <Slice key={k} item={it}>
                <BlockContent block={payload.blocks[it.bi]} radarImg={radarImgs.get(it.bi)} cont={it.cont} />
              </Slice>
            )
          )}
        </div>
        <ShareFooter pageNo={pageNo} total={total} qr={qr} />
      </div>
    </div>
  );
}

function childCount(b: ShareBlock): number {
  if (b.kind === "info") return b.rows.length;
  if (b.kind === "gallery") return b.images.length;
  if (b.kind === "md") return Number.MAX_SAFE_INTEGER; // md 子段落实测确定，整页渲染走 Slice 之外的快路径仅当 to===Infinity
  return 0;
}

// 测量模式：把页头与全部区块按 928px 内容栏宽度渲染一次，供量高
export function ShareMeasure({
  payload,
  radarImgs,
}: {
  payload: SharePayload;
  radarImgs: Map<number, string>;
}) {
  return (
    <div className="sc-measure">
      <div className="sc-measure-col">
        <div data-mh="head">
          <ShareHeader payload={payload} />
        </div>
        {payload.blocks.map((b, i) => (
          <div data-mblock={i} key={i}>
            <BlockContent block={b} radarImg={radarImgs.get(i)} cont={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
