// 编年史内容加载与排序：content/chronicle/*.md → 事件对象
// 排序键 = 时期序 → 子分组序 → 纪元年 → 月键 → 日键 → sort_order
// 规则：缺失精度的事件排在同组更精确事件之前（年仅 < 年月 < 年月日）；
// 年初锚定年首，年末锚定年末（月键 13），春/夏/秋/冬锚定季位（2/5/8/11）。
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { includeDrafts } from "./content";
import type { ArchiveType } from "./types";

export type ChroniclePeriod = "神话时期" | "统一时期" | "万邦时期";

export interface ChronicleEvent {
  slug: string; // 文件名主干，同时作为页面锚点 id
  period: ChroniclePeriod;
  subgroup: string;
  date_label: string; // 原文照抄的展示标签
  era_year: number | null;
  era_month: number | null;
  era_day: number | null;
  precision: string; // "" | 日 | 月 | 年 | 年初 | 年末 | 春 | 夏 | 秋 | 冬
  sort_order: number;
  related: { id: string; type: ArchiveType }[]; // 五类档案编号扁平化
  body: string;
  draft: boolean;
}

export const CHRONICLE_PERIODS: { id: ChroniclePeriod; rank: number; desc: string }[] = [
  { id: "神话时期", rank: 0, desc: "内山文明的蒙昧起源。文字记录诞生之前，仅有口耳相传的史诗，内山先民于神话中认知自身与世界。" },
  { id: "统一时期", rank: 1, desc: "自钱姓共主称帝至王朝形式瓦解的漫长帝制年代。前中期以王朝分段，末期始有确切纪年。" },
  { id: "万邦时期", rank: 2, desc: "统一王朝瓦解之后的城邦纪元。各邦并立，仰山复兴计划（YRP）于此间成立。" },
];

export const MYTH_STAGES = ["前期", "中期", "后期", "末"];
export const UNIFICATION_SUBGROUPS = [
  "钱姓王朝", "虞姓王朝", "袁姓王朝", "孔姓王朝", "皇甫姓王朝", "动乱时期", "郑姓王朝", "何姓王朝", "灵帝年间",
];
export const WANBANG_SUBGROUP = "万邦年间";

export const PERIOD_RANK: Record<string, number> = { 神话时期: 0, 统一时期: 1, 万邦时期: 2 };

const SUBGROUP_RANK: Record<string, number> = {
  前期: 0, 中期: 1, 后期: 2, 末: 3,
  钱姓王朝: 0, 虞姓王朝: 1, 袁姓王朝: 2, 孔姓王朝: 3, 皇甫姓王朝: 4,
  动乱时期: 5, 郑姓王朝: 6, 何姓王朝: 7, 灵帝年间: 8,
  万邦年间: 0,
};

export const CHRONICLE_PRECISIONS = ["日", "月", "年", "年初", "年末", "春", "夏", "秋", "冬"];

// 月键：显式月份取月数；年初/仅年 → 0；季位锚定；年末 → 13
export function monthKey(e: Pick<ChronicleEvent, "era_month" | "precision">): number {
  if (e.era_month != null) return e.era_month;
  switch (e.precision) {
    case "春": return 2;
    case "夏": return 5;
    case "秋": return 8;
    case "冬": return 11;
    case "年末": return 13;
    default: return 0;
  }
}

export function compareChronicles(a: ChronicleEvent, b: ChronicleEvent): number {
  const dn = (x: number | null | undefined): number => (x == null ? 0 : x);
  return (
    (PERIOD_RANK[a.period] - PERIOD_RANK[b.period]) ||
    ((SUBGROUP_RANK[a.subgroup] ?? 99) - (SUBGROUP_RANK[b.subgroup] ?? 99)) ||
    (dn(a.era_year) - dn(b.era_year)) ||
    (monthKey(a) - monthKey(b)) ||
    (dn(a.era_day) - dn(b.era_day)) ||
    (a.sort_order - b.sort_order) ||
    (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
  );
}

let cache: ChronicleEvent[] | null = null;

const RELATED_TYPES: ArchiveType[] = ["anomaly", "person", "faction", "lore", "cihai"];

export function loadChronicles(): ChronicleEvent[] {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "content", "chronicle");
  const out: ChronicleEvent[] = [];
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const related: { id: string; type: ArchiveType }[] = [];
      const rel = data.related || {};
      for (const type of RELATED_TYPES) {
        for (const id of rel[type] || []) {
          related.push({ id: String(id), type });
        }
      }
      out.push({
        slug: file.replace(/\.md$/, ""),
        period: (data.period as ChroniclePeriod) || "神话时期",
        subgroup: String(data.subgroup || ""),
        date_label: String(data.date_label || ""),
        era_year: data.era_year == null ? null : Number(data.era_year),
        era_month: data.era_month == null ? null : Number(data.era_month),
        era_day: data.era_day == null ? null : Number(data.era_day),
        precision: String(data.precision || ""),
        sort_order: Number(data.sort_order || 0),
        related,
        body: content.trim(),
        draft: !!data.draft,
      });
    }
  }
  out.sort(compareChronicles);
  cache = out;
  return out;
}

export function visibleChronicles(): ChronicleEvent[] {
  return loadChronicles().filter((e) => includeDrafts() || !e.draft);
}

export function sortedChronicles(): ChronicleEvent[] {
  return visibleChronicles().slice().sort(compareChronicles);
}

// 档案详情页反向联动：关联某档案的事件（按时间序）
export function chroniclesForArchive(archiveId: string): ChronicleEvent[] {
  return sortedChronicles().filter((e) => e.related.some((r) => r.id === archiveId));
}
