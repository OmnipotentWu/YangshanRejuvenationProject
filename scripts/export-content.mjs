// 一次性迁移：SQLite → content/*.md（frontmatter + Markdown 正文）
// 用法：node scripts/export-content.mjs
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new Database(path.join(root, "data", "yangshan.db"), { readonly: true });

const TYPES = ["anomaly", "person", "faction", "lore", "cihai"];
const CONTENT = path.join(root, "content");
fs.rmSync(CONTENT, { recursive: true, force: true });
for (const t of TYPES) fs.mkdirSync(path.join(CONTENT, t), { recursive: true });

const tagsOf = db.prepare(
  `SELECT t.name FROM tags t JOIN archive_tags at ON at.tag_id = t.id WHERE at.archive_id = ? ORDER BY t.name`
);

function dumpFm(fm) {
  for (const k of Object.keys(fm)) {
    const v = fm[k];
    if (v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) delete fm[k];
  }
  return yaml.dump(fm, { lineWidth: -1, noRefs: true, sortKeys: false }).trimEnd() + "\n";
}

let count = 0;
const rows = db.prepare("SELECT * FROM archives ORDER BY id").all();
for (const r of rows) {
  const meta = JSON.parse(r.meta || "{}");
  const fm = {
    no: r.archive_no,
    title: r.title,
    codename: r.codename || undefined,
    summary: r.summary || undefined,
    draft: r.status === "draft",
    tags: tagsOf.all(r.id).map((t) => t.name),
    created: r.created_at,
    updated: r.updated_at,
  };
  let body = "";

  if (r.type === "anomaly") {
    Object.assign(fm, {
      specialMark: meta.specialMark || "无",
      desc: meta.desc || "",
      danger: meta.danger || "",
      utilization: meta.utilization || "",
      reversibility: meta.reversibility || "",
      origin: meta.origin || "",
      disposal: meta.disposal || "",
      report: meta.report || "",
      postscript: r.body_md || "",
    });
  } else if (r.type === "person") {
    Object.assign(fm, {
      gender: meta.gender || "",
      age: meta.age || "",
      unit: meta.unit || "",
      race: meta.race || "",
      faction: meta.faction || "",
      avatar: meta.avatar || "",
      gallery: (meta.gallery || []).map((g) => ({ image: g.src, caption: g.caption || "" })),
      background: meta.background || "",
      appearance: meta.appearance || "",
      anomalyEffect: meta.anomalyEffect || "",
      holdings: meta.holdings || "",
      stats: meta.stats || {},
    });
  } else if (r.type === "faction") {
    Object.assign(fm, {
      slogan: meta.slogan || "",
      slug: meta.slug || "",
      altNames: meta.altNames || [],
      logo: r.logo_path || "",
    });
    body = r.body_md || "";
  } else {
    body = r.body_md || "";
  }

  const file = path.join(CONTENT, r.type, `${r.archive_no.toLowerCase()}.md`);
  fs.writeFileSync(file, `---\n${dumpFm(fm)}---\n\n${body.trimEnd()}\n`, "utf-8");
  count++;
}

// 人物关系 + 关系类型（以档案编号关联，便于人工阅读与 CMS 编辑）
const noOf = new Map(db.prepare("SELECT id, archive_no FROM archives").all().map((r) => [r.id, r.archive_no]));
const rels = db.prepare(
  `SELECT r.source_id AS source, r.target_id AS target, k.name AS kind, r.note AS note
   FROM relationships r JOIN relation_kinds k ON k.id = r.kind_id ORDER BY r.id`
).all()
  .map((e) => ({ source: noOf.get(e.source), target: noOf.get(e.target), kind: e.kind, note: e.note }))
  .filter((e) => e.source && e.target);
fs.writeFileSync(path.join(CONTENT, "relationships.json"), JSON.stringify({ relations: rels }, null, 2) + "\n");
const kinds = db.prepare("SELECT name FROM relation_kinds ORDER BY is_preset DESC, id").all().map((k) => ({ name: k.name }));
fs.writeFileSync(path.join(CONTENT, "kinds.json"), JSON.stringify({ kinds }, null, 2) + "\n");

console.log(`已导出 ${count} 篇档案 → content/<type>/*.md`);
console.log(`关系 ${rels.length} 条 → content/relationships.json；关系类型 ${kinds.length} 种 → content/kinds.json`);
db.close();
