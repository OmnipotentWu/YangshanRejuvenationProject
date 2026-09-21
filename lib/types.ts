// 类型定义与全站常量
export type ArchiveType = "anomaly" | "person" | "faction" | "lore" | "cihai";
export type ArchiveStatus = "draft" | "published";
export type Role = "admin" | "editor";

export interface Archive {
  id: string; // 档案编号（YS-M-001 式），同时作为路由与关系关联标识
  archive_no: string;
  type: ArchiveType;
  title: string;
  codename: string | null;
  summary: string | null;
  body_md: string;
  meta: string; // JSON string
  logo_path: string | null;
  status: ArchiveStatus;
  source_file: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  tags?: { id: number; name: string }[];
}

export interface ArchiveMeta {
  specialMark?: string;
  desc?: string;
  danger?: string;
  utilization?: string;
  reversibility?: string;
  origin?: string;
  disposal?: string;
  report?: string;
  gender?: string;
  age?: string;
  unit?: string;
  race?: string;
  background?: string;
  appearance?: string;
  anomalyEffect?: string;
  holdings?: string;
  stats?: Record<string, string>;
  faction?: string; // 人员所属势力（slug）
  avatar?: string; // 人员头像（上传路径）
  gallery?: { src: string; caption?: string }[]; // 人员画廊
  slogan?: string;
  slug?: string; // 势力徽标 slug
  altNames?: string[];
}

export interface Tag { id: number; name: string; }

export interface SessionUser {
  uid: number;
  username: string;
  role: Role;
  display_name: string;
}

export const TYPE_META: Record<ArchiveType, { label: string; noPrefix: string; desc: string }> = {
  anomaly: { label: "谬误备案", noPrefix: "YS-M", desc: "登记在册的谬误现象档案" },
  person: { label: "个体备案", noPrefix: "YS-P", desc: "社会面重要个体档案" },
  faction: { label: "势力情报", noPrefix: "YS-F", desc: "仰山市各方势力情报" },
  lore: { label: "设定资料", noPrefix: "YS-L", desc: "备忘 · 教材 · 纪事" },
  cihai: { label: "仰山辞海", noPrefix: "YS-C", desc: "名词 · 辞海释义" },
};

export const TYPE_ORDER: ArchiveType[] = ["anomaly", "person", "faction", "lore", "cihai"];

export const SPECIAL_MARKS = ["远古谬误", "已崩解谬误", "谬误科技", "已合并谬误", "无"];

export const SIX_DIMS = ["科学素养", "环境耐受", "谬误驾驭", "力量强度", "策略应对", "谈判技巧"] as const;
export const GRADES = ["S", "A", "B", "C", "D"] as const;

export const PRESET_RELATION_KINDS = ["亲属", "同事", "上下级", "合作", "敌对", "旧识", "恋人"];

// 势力识别关键词 → slug（用于人员所属势力提取与徽标配对）
export const FACTION_SLUGS: Record<string, { keywords: string[]; short: string }> = {
  yrp: { keywords: ["仰山复兴计划", "复兴计划", "YRP", "档案与公共安全部", "谬误科技学会", "项目组", "对外联系处"], short: "仰山复兴计划" },
  zhaohe: { keywords: ["兆和"], short: "兆和商会" },
  sangyu: { keywords: ["桑榆"], short: "桑榆酒业" },
  fengrui: { keywords: ["锋锐"], short: "锋锐安保" },
  minxin: { keywords: ["闵心"], short: "闵心控股" },
  chenshan: { keywords: ["沉山"], short: "沉山" },
};

export function detectFactionSlug(text: string): string | null {
  for (const [slug, v] of Object.entries(FACTION_SLUGS)) {
    if (v.keywords.some((k) => text.includes(k))) return slug;
  }
  return null;
}
