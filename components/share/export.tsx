// 导出编排：离屏渲染分享卡片 → 量高分页 → 逐页截图 → 下载 PNG / ZIP。
// 全程浏览器端完成；离屏容器挂载于 .sc-host（fixed, left:-10000px），结束后卸载。

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { toPng } from "html-to-image";
import * as echarts from "echarts";
import { SIX_DIMS } from "../../lib/types";
import type { SharePayload } from "../../lib/share-blocks";
import { ShareMeasure, SharePageView, type PageItem } from "./ShareCard";

// —— 与 globals.css 中 .sc-* 尺寸严格一致 ——
export const SC_PAGE_W = 1080;
export const SC_PAGE_H = 1350;
const SC_CONTENT_W = 928; // 1080 - 卡片边距28*2 - 内边距48*2
const SC_CONTENT_H = 1110; // 1350 - 卡片边距28*2 - 顶44 - 底140

export type SharePhase = "prep" | "render" | "capture";
export type ProgressFn = (phase: SharePhase, cur: number, total: number) => void;

const GRADE_VALUE: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

// 与详情页 RadarChart 同风格的六维雷达（字号放大适配 1080px 卡片；动画关闭保证截图稳定）
function radarOption(stats: Record<string, string>) {
  const values = SIX_DIMS.map((d) => GRADE_VALUE[stats?.[d] || ""] ?? 0);
  return {
    animation: false,
    radar: {
      indicator: SIX_DIMS.map((d) => ({ name: d, max: 5 })),
      radius: "64%",
      center: ["50%", "52%"],
      axisName: {
        color: "#cfccc2",
        fontSize: 22,
        fontFamily: '"Source Han Sans SC","Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
      },
      splitArea: {
        areaStyle: {
          color: ["rgba(194,155,64,0.02)", "rgba(194,155,64,0.05)", "rgba(194,155,64,0.02)", "rgba(194,155,64,0.05)", "rgba(194,155,64,0.09)"],
        },
      },
      splitLine: { lineStyle: { color: "rgba(242,242,240,0.14)" } },
      axisLine: { lineStyle: { color: "rgba(242,242,240,0.18)" } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            name: "工作能力评定",
            areaStyle: { color: "rgba(194,155,64,0.35)" },
            lineStyle: { color: "#C29B40", width: 3 },
            itemStyle: { color: "#C29B40" },
            symbol: "circle",
            symbolSize: 7,
            label: { show: false },
          },
        ],
      },
    ],
  };
}

// 离屏初始化 ECharts 雷达并导出为 PNG dataURL（2x 分辨率）
function captureRadar(stats: Record<string, string>): string | null {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:-10000px;top:0;width:620px;height:620px;";
  document.body.appendChild(el);
  try {
    const chart = echarts.init(el, undefined, { width: 620, height: 620 });
    chart.setOption(radarOption(stats));
    const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#1a1a18" });
    chart.dispose();
    return url;
  } catch {
    return null;
  } finally {
    el.remove();
  }
}

// 页脚二维码（指向档案页 URL；失败时无二维码，不影响导出）
async function makeQr(url: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(url, {
      margin: 0,
      width: 176,
      errorCorrectionLevel: "M",
      color: { dark: "#121211", light: "#f2f2f0" },
    });
  } catch {
    return null;
  }
}

function pageUrlOf(id: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${location.origin}${base}/archives/${id}/`;
}

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const nextTick = async () => {
  await raf();
  await raf();
};

// 把单张图片转为 dataURL：超时/失败返回 null；超过 maxDim 的图等比降采样，
// 既减小截图时的序列化与栅格化负担，也避免 html-to-image 内部再发网络请求卡死。
async function fetchImageAsDataUrl(src: string, maxDim = 1600): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    const res = await fetch(src, { signal: ctl.signal, cache: "force-cache" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    try {
      const bmp = await createImageBitmap(blob);
      if (Math.max(bmp.width, bmp.height) <= maxDim) {
        const raw = await blobToDataUrl(blob);
        bmp.close();
        return raw;
      }
      const s = maxDim / Math.max(bmp.width, bmp.height);
      const cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * s);
      cv.height = Math.round(bmp.height * s);
      cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
      bmp.close();
      return cv.toDataURL(blob.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.92);
    } catch {
      return await blobToDataUrl(blob);
    }
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("read fail"));
    fr.readAsDataURL(blob);
  });
}

// 截图前预内联：页面中所有外链 img 换成 dataURL（同 URL 只取一次），
// 保证 toPng 克隆时零网络请求；取不到的图移除，优先保证导出完成。
async function inlinePageImages(pagesHost: HTMLElement) {
  const cache = new Map<string, Promise<string | null>>();
  const imgs = Array.from(pagesHost.querySelectorAll("img")) as HTMLImageElement[];
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      if (!cache.has(src)) cache.set(src, fetchImageAsDataUrl(src));
      const dataUrl = await cache.get(src)!;
      if (dataUrl) img.src = dataUrl;
      else img.remove();
    })
  );
}

// 等待容器内图片加载（单图超时后继续，避免大图/慢请求卡死导出）
async function waitForImages(root: HTMLElement, timeoutMs = 15000) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      const i = img as HTMLImageElement;
      if (i.complete) return Promise.resolve();
      return Promise.race([
        new Promise<void>((res) => {
          i.addEventListener("load", () => res(), { once: true });
          i.addEventListener("error", () => res(), { once: true });
        }),
        new Promise<void>((res) => setTimeout(res, timeoutMs)),
      ]);
    })
  );
  // 图片 onLoad 内联尺寸后会触发一次重渲染，等布局稳定
  await raf();
  await raf();
}

function outerH(el: Element): number {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
}

interface MeasuredBlock {
  outer: number; // 整块外高（含 marginBottom）
  head: number; // 块头外高（含 marginBottom）
  atomic: boolean; // 不可在段落间切分（头像 / 雷达）
  children: { outer: number }[]; // 各子段落外高（含 marginBottom）
}

function bodyOf(wrapper: Element): HTMLElement | null {
  const scope = wrapper.querySelector("[data-rblock]") || wrapper;
  return (scope.querySelector("[data-rbody]") || scope.querySelector(".sc-md")) as HTMLElement | null;
}

// 量高：页头 + 全部区块（测量容器按最终内容栏宽 928px 渲染，量高结果可直接用于排版）
function measureAll(host: HTMLElement, payload: SharePayload): { headerOuter: number; blocks: MeasuredBlock[] } {
  const headerOuter = outerH(host.querySelector("[data-mh]") as Element);
  const blocks: MeasuredBlock[] = payload.blocks.map((b, i) => {
    const w = host.querySelector(`[data-mblock="${i}"]`) as Element;
    const atomic = b.kind === "avatar" || b.kind === "radar";
    const headEl = w.querySelector(".sc-bhead");
    const body = atomic ? null : bodyOf(w);
    const children = body ? Array.from(body.children).map((c) => ({ outer: outerH(c) })) : [];
    return {
      outer: outerH(w),
      head: headEl ? outerH(headEl) : 0,
      atomic,
      children,
    };
  });
  return { headerOuter, blocks };
}

// 分页：优先字段区块边界，区块超高时按段落边界切（禁止行内切断——切分只发生在子段落之间）
function paginate(blocks: MeasuredBlock[], firstCap: number, cap: number): PageItem[][] {
  const EPS = 0.5;
  const pages: PageItem[][] = [];
  let cur: PageItem[] = [];
  let space = firstCap;
  let bi = 0;
  let from = 0;
  let cont = false;

  const flush = () => {
    if (cur.length) pages.push(cur);
    cur = [];
  };
  const newPage = () => {
    flush();
    space = cap;
  };

  while (bi < blocks.length) {
    const b = blocks[bi];
    const n = b.children.length;

    if (b.atomic) {
      if (b.outer <= space + EPS) {
        cur.push({ bi, cont, from: 0, to: 0 });
        space -= b.outer;
        bi++;
        cont = false;
        if (space <= EPS) newPage();
      } else {
        newPage();
        if (b.outer > cap) {
          // 超出整页的原子块也只能独占一页（极端情况，允许微溢出）
          cur.push({ bi, cont, from: 0, to: 0 });
          bi++;
          cont = false;
        }
      }
      continue;
    }

    if (from === 0) {
      if (b.outer <= space + EPS) {
        cur.push({ bi, cont: false, from: 0, to: n });
        space -= b.outer;
        bi++;
        cont = false;
        if (space <= EPS) newPage();
        continue;
      }
      if (b.outer <= cap + EPS) {
        // 整块能放进新页 → 在区块边界处切页
        newPage();
        continue;
      }
      // 区块高过整页 → 落入段落级切分
    }

    let i = from;
    let acc = b.head;
    while (i < n && acc + b.children[i].outer <= space + EPS) {
      acc += b.children[i].outer;
      i++;
    }
    if (i > from) {
      cur.push({ bi, cont, from, to: i });
      space -= acc;
      const done = i >= n;
      if (done) {
        bi++;
        from = 0;
        cont = false;
      } else {
        from = i;
        cont = true;
      }
      if (space <= EPS) newPage();
      continue;
    }

    if (space < cap - EPS) {
      // 剩余空间连一个段落都放不下 → 新页
      newPage();
      continue;
    }
    // 新页上单段落仍超高（含块头）→ 强制独占一页，保证前进
    cur.push({ bi, cont, from, to: from + 1 });
    from++;
    if (from >= n) {
      bi++;
      from = 0;
      cont = false;
    } else {
      cont = true;
    }
    newPage();
  }
  flush();
  if (!pages.length) pages.push([]);
  return pages;
}

function maxPadOverflow(pagesHost: HTMLElement): number {
  let max = 0;
  pagesHost.querySelectorAll(".sc-pad").forEach((pad) => {
    const el = pad as HTMLElement;
    max = Math.max(max, el.scrollHeight - el.clientHeight);
  });
  return max;
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim() || "archive";

async function downloadAll(payload: SharePayload, dataUrls: string[]) {
  const base = `${safeName(payload.archiveNo)}_${safeName(payload.title)}`;
  const fname = (i: number) => `${base}_${String(i + 1).padStart(2, "0")}.png`;
  if (dataUrls.length === 1) {
    triggerDownload(dataUrls[0], fname(0));
    return;
  }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  dataUrls.forEach((u, i) => zip.file(fname(i), u.slice(u.indexOf(",") + 1), { base64: true }));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${base}.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// 主流程
export async function runShareExport(payload: SharePayload, onProgress?: ProgressFn): Promise<number> {
  const host = document.createElement("div");
  host.className = "sc-host";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);

  try {
    onProgress?.("prep", 0, 1);
    // 1) 六维雷达 → PNG
    const radarImgs = new Map<number, string>();
    payload.blocks.forEach((b, i) => {
      if (b.kind === "radar") {
        const url = captureRadar(b.stats);
        if (url) radarImgs.set(i, url);
      }
    });
    // 2) 页脚二维码
    const qr = await makeQr(pageUrlOf(payload.id));
    await document.fonts.ready;

    // 3) 离屏测量：整份内容按 928px 内容栏渲染一次并量高
    const measureMount = document.createElement("div");
    host.appendChild(measureMount);
    const measureRoot = createRoot(measureMount);
    flushSync(() => {
      measureRoot.render(<ShareMeasure payload={payload} radarImgs={radarImgs} />);
    });
    await nextTick();
    await waitForImages(measureMount);
    await document.fonts.ready;
    const measured = measureAll(measureMount, payload);

    // 4) 分页 → 渲染 → 溢出自检（溢出则收紧容量重排；最后一次渲染保留挂载，截图永远发生在已挂载 DOM 上）
    let cap = SC_CONTENT_H;
    let plan: PageItem[][] = [];
    let pagesRoot: Root | null = null;
    let pagesMount: HTMLElement | null = null;
    let pageEls: HTMLElement[] = [];
    flushSync(() => measureRoot.unmount());
    measureMount.remove();

    for (let attempt = 0; attempt < 4; attempt++) {
      onProgress?.("render", attempt + 1, 4);
      const capFirst = SC_CONTENT_H - measured.headerOuter;
      plan = paginate(measured.blocks, capFirst, cap);
      pagesMount = document.createElement("div");
      host.appendChild(pagesMount);
      pagesRoot = createRoot(pagesMount);
      flushSync(() => {
        pagesRoot!.render(
          <>
            {plan.map((items, pi) => (
              <SharePageView
                key={pi}
                payload={payload}
                radarImgs={radarImgs}
                items={items}
                pageNo={pi + 1}
                total={plan.length}
                qr={qr}
              />
            ))}
          </>
        );
      });
      await nextTick();
      await waitForImages(pagesMount);
      await document.fonts.ready;
      pageEls = Array.from(pagesMount.querySelectorAll(".sc-page")) as HTMLElement[];
      const overflow = maxPadOverflow(pagesMount);
      if (overflow <= 1 || attempt === 3) break;
      flushSync(() => pagesRoot!.unmount());
      pagesRoot = null;
      pagesMount.remove();
      pagesMount = null;
      cap -= overflow + 12;
    }

    // 保底：截图目标必须是已挂载节点，否则重新渲染一次
    if (!pageEls.length || !pageEls[0].isConnected) {
      const capFirst = SC_CONTENT_H - measured.headerOuter;
      plan = paginate(measured.blocks, capFirst, cap);
      pagesMount = document.createElement("div");
      host.appendChild(pagesMount);
      pagesRoot = createRoot(pagesMount);
      flushSync(() => {
        pagesRoot!.render(
          <>
            {plan.map((items, pi) => (
              <SharePageView key={pi} payload={payload} radarImgs={radarImgs} items={items} pageNo={pi + 1} total={plan.length} qr={qr} />
            ))}
          </>
        );
      });
      await nextTick();
      await waitForImages(pagesMount);
      await document.fonts.ready;
      pageEls = Array.from(pagesMount.querySelectorAll(".sc-page")) as HTMLElement[];
    }

    // 5) 截图前准备：图片全部预内联为 dataURL，toPng 内部零网络请求，杜绝请求挂起卡死
    onProgress?.("prep", 0, 1);
    if (!pagesMount) throw new Error("render failed");
    await waitForImages(pagesMount);
    await inlinePageImages(pagesMount);
    await document.fonts.ready;

    // 6) 逐页截图（单页超时 60s，防止极端情况下卡死）
    const dataUrls: string[] = [];
    for (let i = 0; i < pageEls.length; i++) {
      onProgress?.("capture", i + 1, pageEls.length);
      const url = await Promise.race([
        toPng(pageEls[i], {
          width: SC_PAGE_W,
          height: SC_PAGE_H,
          pixelRatio: 1,
          backgroundColor: "#121211",
          skipFonts: true,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("toPng timeout")), 60000)),
      ]);
      dataUrls.push(url);
      await raf();
    }

    // 7) 卸载离屏容器并下载
    if (pagesRoot) flushSync(() => pagesRoot!.unmount());
    pagesMount?.remove();
    await downloadAll(payload, dataUrls);
    return dataUrls.length;
  } finally {
    host.remove();
  }
}
