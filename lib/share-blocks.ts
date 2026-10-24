// 分享卡片（导出图片）的内容区块构建。
// 仅在服务端（档案详情页）调用：把档案已填字段按 CMS 字段顺序整理为
// 可序列化的区块列表，交由客户端 ShareExportButton 离屏渲染并截图。
// 字段取舍与顺序严格沿用档案详情页（app/archives/[id]/page.tsx）的现有逻辑：
// 未填写字段整块不出现。

import { asset } from "./assets";
import { fmtDate } from "./format";
import { linkifyMarkdown, type LinkRef } from "./queries";
import { SITE_COPY } from "./site-copy";
import { TYPE_META, type Archive, type ArchiveMeta } from "./types";

export type ShareBlock =
  | { kind: "avatar"; src: string }
  | { kind: "info"; rows: { k: string; v: string; warn?: boolean }[] }
  | { kind: "md"; sec: number; label: string; md: string }
  | { kind: "radar"; label: string; legend: string; stats: Record<string, string> }
  | { kind: "gallery"; sec: number; label: string; images: { src: string; caption?: string }[] };

export interface SharePayload {
  id: string;
  type: "person" | "anomaly";
  archiveNo: string; // 完整档号 YS-P-008
  typePrefix: string; // YS-P
  typeLabel: string; // 个体备案
  title: string;
  metaLine: string; // 录入：… ｜ 更新于 …
  badges: string[]; // 特殊谬误标记等警示徽标
  tags: string[];
  blocks: ShareBlock[];
}

// 与详情页 toMd 一致：无空行的换行统一为段落间隔
function toMd(text: string): string {
  if (!text) return "";
  if (text.includes("\n\n")) return text;
  return text.split("\n").map((s) => s.trim()).filter(Boolean).join("\n\n");
}

export function buildSharePayload(
  row: Archive & { author_name?: string | null },
  meta: ArchiveMeta,
  refs: LinkRef[],
  factions: { slug: string; title: string }[]
): SharePayload {
  const dc = SITE_COPY.detail;
  const tm = TYPE_META[row.type as keyof typeof TYPE_META];
  let sec = 0;
  const nextSec = () => ++sec;

  const mdBlock = (label: string, text: string | undefined): ShareBlock | null => {
    if (!text || !text.trim()) return null;
    return { kind: "md", sec: nextSec(), label, md: linkifyMarkdown(toMd(text), refs, row.id) };
  };

  const blocks: ShareBlock[] = [];

  if (row.type === "anomaly") {
    blocks.push(
      ...[
        mdBlock(dc.secDesc, meta.desc),
        mdBlock(dc.secDanger, meta.danger),
        mdBlock(dc.secUtilization, meta.utilization),
        mdBlock(dc.secReversibility, meta.reversibility),
        mdBlock(dc.secOrigin, meta.origin),
        mdBlock(dc.secDisposal, meta.disposal),
        mdBlock(dc.secReport, meta.report),
        mdBlock(dc.secPostscript, row.body_md),
      ].filter((b): b is ShareBlock => !!b)
    );
  } else if (row.type === "person") {
    if (meta.avatar) blocks.push({ kind: "avatar", src: asset(meta.avatar) });

    const rows: { k: string; v: string; warn?: boolean }[] = [{ k: dc.infoName, v: row.title }];
    if (row.codename) rows.push({ k: dc.codename, v: row.codename });
    if (meta.gender) rows.push({ k: dc.infoGender, v: meta.gender });
    if (meta.age) rows.push({ k: dc.infoAge, v: meta.age });
    if (meta.unit) rows.push({ k: dc.infoUnit, v: meta.unit });
    if (meta.race) rows.push({ k: dc.infoRace, v: meta.race });
    if (meta.faction) {
      const f = factions.find((x) => x.slug === meta.faction);
      rows.push(f ? { k: dc.infoFaction, v: f.title } : { k: dc.infoFaction, v: dc.factionMissing(meta.faction), warn: true });
    }
    if (rows.length) blocks.push({ kind: "info", rows });

    blocks.push(
      ...[
        mdBlock(dc.secBackground, meta.background),
        mdBlock(dc.secAppearance, meta.appearance),
        mdBlock(dc.secAnomalyEffect, meta.anomalyEffect),
        mdBlock(dc.secHoldings, meta.holdings),
      ].filter((b): b is ShareBlock => !!b)
    );

    if (meta.stats && Object.values(meta.stats).some(Boolean)) {
      blocks.push({ kind: "radar", label: dc.statsTitle, legend: dc.statsLegend, stats: meta.stats });
    }

    const images = (meta.gallery || []).filter((g) => g && g.src);
    if (images.length) {
      blocks.push({
        kind: "gallery",
        sec: nextSec(),
        label: dc.galleryTitle,
        images: images.map((g) => ({ src: asset(g.src), caption: g.caption })),
      });
    }
  }

  const badges: string[] = [];
  if (row.type === "anomaly" && meta.specialMark && meta.specialMark !== "无") {
    badges.push(dc.markBadge(meta.specialMark));
  }

  return {
    id: row.id,
    type: row.type as "person" | "anomaly",
    archiveNo: row.archive_no,
    typePrefix: tm.noPrefix,
    typeLabel: tm.label,
    title: row.title,
    metaLine: dc.recordedBy(row.author_name || dc.recordedByName, fmtDate(row.updated_at)),
    badges,
    tags: (row.tags || []).map((t) => t.name),
    blocks,
  };
}
