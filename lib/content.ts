// 构建时内容加载器：content/<type>/*.md → 内存档案对象（替代原 SQLite 数据层）
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Archive, ArchiveMeta, ArchiveType, Tag } from "./types";
import { TYPE_ORDER } from "./types";

let cache: Archive[] | null = null;

export function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

function buildMeta(type: ArchiveType, d: Record<string, any>): ArchiveMeta {
  if (type === "anomaly") {
    return {
      specialMark: d.specialMark || "无",
      desc: d.desc || "",
      danger: d.danger || "",
      utilization: d.utilization || "",
      reversibility: d.reversibility || "",
      origin: d.origin || "",
      disposal: d.disposal || "",
      report: d.report || "",
    };
  }
  if (type === "person") {
    return {
      gender: d.gender || "",
      age: d.age || "",
      unit: d.unit || "",
      race: d.race || "",
      background: d.background || "",
      appearance: d.appearance || "",
      anomalyEffect: d.anomalyEffect || "",
      holdings: d.holdings || "",
      stats: d.stats || {},
      faction: d.faction || undefined,
      avatar: d.avatar || undefined,
      gallery: (d.gallery || []).map((g: any) => ({ src: g.image || g.src || "", caption: g.caption || "" })),
    };
  }
  if (type === "faction") {
    return {
      slogan: d.slogan || "",
      slug: d.slug || "",
      altNames: d.altNames || [],
    };
  }
  return {};
}

export function loadArchives(): Archive[] {
  if (cache) return cache;
  const contentDir = path.join(process.cwd(), "content");
  const out: Archive[] = [];
  for (const type of TYPE_ORDER) {
    const dir = path.join(contentDir, type);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const status = data.draft ? "draft" : "published";
      const tags: Tag[] = (data.tags || []).map((name: string, i: number) => ({ id: i + 1, name: String(name) }));
      out.push({
        id: String(data.no || file.replace(/\.md$/, "").toUpperCase()),
        archive_no: String(data.no || file.replace(/\.md$/, "").toUpperCase()),
        type,
        title: String(data.title || ""),
        codename: data.codename || null,
        summary: data.summary || null,
        body_md: type === "anomaly" || type === "person" ? String(data.postscript || "") : content.trim(),
        meta: JSON.stringify(buildMeta(type, data)),
        logo_path: type === "faction" ? data.logo || null : null,
        status,
        source_file: null,
        created_by: null,
        created_at: String(data.created || ""),
        updated_at: String(data.updated || ""),
        tags,
      } as Archive);
    }
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  cache = out;
  return out;
}

export function visibleArchives(): Archive[] {
  return loadArchives().filter((a) => includeDrafts() || a.status === "published");
}

export function publishedArchives(): Archive[] {
  return loadArchives().filter((a) => a.status === "published");
}

export function getArchiveById(id: string): Archive | undefined {
  return loadArchives().find((a) => a.id === id);
}

// ---------- 关系数据 ----------
let _relationships: { source: string; target: string; kind: string; note: string }[] | null = null;
export function loadRelationships() {
  if (_relationships) return _relationships;
  const file = path.join(process.cwd(), "content", "relationships.json");
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : {};
  _relationships = Array.isArray(raw) ? raw : raw.relations || [];
  return _relationships!;
}

let _kinds: string[] | null = null;
export function loadKinds(): string[] {
  if (_kinds) return _kinds;
  const file = path.join(process.cwd(), "content", "kinds.json");
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : {};
  const list = Array.isArray(raw) ? raw : raw.kinds || [];
  _kinds = list.map((k: any) => (typeof k === "string" ? k : k.name)).filter(Boolean);
  return _kinds!;
}
