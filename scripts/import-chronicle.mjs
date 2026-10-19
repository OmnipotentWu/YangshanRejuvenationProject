// 一次性导入脚本：解析《仰山年表【新】.docx》→ content/chronicle/*.md
// 用法（仓库根目录，Git Bash）：
//   node scripts/import-chronicle.mjs            # 全量导入 + 输出关联候选清单（不写 related）
//   node scripts/import-chronicle.mjs --apply x.json  # 按确认后的映射写入 related 后重建文件
// 解析约定：每段一个事件，格式为【标签】正文；章节标题行（无【】）用于上下文分段。
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dump as yamlDump } from "js-yaml";

const root = process.cwd();
const DOCX = path.join(root, "仰山年表【新】.docx");
const OUT_DIR = path.join(root, "content", "chronicle");
const TYPES = ["anomaly", "person", "faction", "lore", "cihai"];

// ---------- 提取 docx 文本 ----------
function extractText() {
  const cmd = `unzip -p "${DOCX}" word/document.xml | perl tools/docx2txt.pl stdin`;
  return execSync(cmd, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, shell: "bash" });
}

// ---------- 标签解析 ----------
function parseLabel(label) {
  // 神话时期前期 / 中期 / 后期 / 末
  let m = label.match(/^神话时期(前期|中期|后期|末)$/);
  if (m) {
    return { period: "神话时期", subgroup: m[1], era_year: null, era_month: null, era_day: null, precision: "" };
  }
  // 统一时期前期：钱姓王朝
  m = label.match(/^统一时期(前期|中期|后期)[:：](.+)$/);
  if (m) {
    return { period: "统一时期", subgroup: m[2], era_year: null, era_month: null, era_day: null, precision: "" };
  }
  // 灵帝7年9月23日 / 灵帝2年末 / 灵帝14年年末 / 万邦8年春 …
  m = label.match(/^(灵帝|万邦)(\d+|元)年?(?:(\d+)月)?(?:(\d+)日)?(年初|年末|春|夏|秋|冬)?$/);
  if (m) {
    const year = m[2] === "元" ? 1 : Number(m[2]);
    const month = m[3] != null ? Number(m[3]) : null;
    const day = m[4] != null ? Number(m[4]) : null;
    const mod = m[5] || "";
    const precision = mod || (day != null ? "日" : month != null ? "月" : "年");
    return m[1] === "灵帝"
      ? { period: "统一时期", subgroup: "灵帝年间", era_year: year, era_month: month, era_day: day, precision }
      : { period: "万邦时期", subgroup: "万邦年间", era_year: year, era_month: month, era_day: day, precision };
  }
  throw new Error(`无法解析标签：【${label}】`);
}

function monthKey(e) {
  if (e.era_month != null) return e.era_month;
  return { 春: 2, 夏: 5, 秋: 8, 冬: 11, 年末: 13 }[e.precision] ?? 0;
}

const PERIOD_RANK = { 神话时期: 0, 统一时期: 1, 万邦时期: 2 };
const SUBGROUP_RANK = {
  前期: 0, 中期: 1, 后期: 2, 末: 3,
  钱姓王朝: 0, 虞姓王朝: 1, 袁姓王朝: 2, 孔姓王朝: 3, 皇甫姓王朝: 4,
  动乱时期: 5, 郑姓王朝: 6, 何姓王朝: 7, 灵帝年间: 8, 万邦年间: 0,
};
const d = (x) => (x == null ? 0 : x);
function cmp(a, b) {
  return (
    (PERIOD_RANK[a.period] - PERIOD_RANK[b.period]) ||
    ((SUBGROUP_RANK[a.subgroup] ?? 99) - (SUBGROUP_RANK[b.subgroup] ?? 99)) ||
    (d(a.era_year) - d(b.era_year)) ||
    (monthKey(a) - monthKey(b)) ||
    (d(a.era_day) - d(b.era_day)) ||
    (a.sort_order - b.sort_order)
  );
}

// ---------- 档案名索引（关联候选匹配） ----------
function buildArchiveIndex() {
  const list = [];
  for (const t of TYPES) {
    const dir = path.join(root, "content", t);
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const pick = (re) => { const m = raw.match(re); return m ? m[1].trim().replace(/^["']|["']$/g, "") : ""; };
      const names = [pick(/^title:\s*(.+)$/m), pick(/^codename:\s*(.+)$/m)];
      const altM = raw.match(/^altNames:\s*\n((?:\s*-\s*.+\n)*)/m);
      if (altM) names.push(...altM[1].split("\n").map((s) => s.replace(/^\s*-\s*/, "").trim()));
      list.push({ no: pick(/^no:\s*(.+)$/m) || f, type: t, title: names[0], names: [...new Set(names.filter((n) => n && n.length >= 2))] });
    }
  }
  return list;
}

// ---------- 主流程 ----------
function main() {
  const applyArg = process.argv.indexOf("--apply");
  const applyMap = applyArg > -1 ? JSON.parse(fs.readFileSync(process.argv[applyArg + 1], "utf8")) : null;

  const text = extractText();
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

  const introLines = [];
  const events = [];
  for (const line of lines) {
    const m = line.match(/^【(.+?)】(.+)$/);
    if (!m) { introLines.push(line); continue; }
    const [, label, body] = m;
    const parsed = parseLabel(label);
    events.push({ label, body: body.trim(), ...parsed });
  }

  console.log(`序言/标题等非事件行 ${introLines.length} 条（前两条将作为页面引语核对）：`);
  introLines.slice(0, 2).forEach((s) => console.log("  · " + s.slice(0, 60) + "…"));
  console.log(`共解析事件 ${events.length} 条`);

  // sort_order：同（时期/子分组/年/月键/日键）内按文档顺序 0,1,2…
  const counters = new Map();
  for (const e of events) {
    const key = [e.period, e.subgroup, e.era_year ?? "", monthKey(e), e.era_day ?? ""].join("|");
    const n = counters.get(key) || 0;
    counters.set(key, n + 1);
    e.sort_order = n;
  }

  // 全局排序并编号 → 文件名 = 序号-标签
  events.sort(cmp);
  const used = new Set();
  events.forEach((e, i) => {
    let stem = `${String(i + 1).padStart(4, "0")}-${e.label}`;
    let n = 2;
    while (used.has(stem)) stem = `${String(i + 1).padStart(4, "0")}-${e.label}-${n++}`;
    used.add(stem);
    e.slug = stem;
  });

  // 关联候选（--apply 前只输出清单，不写文件）
  const archives = buildArchiveIndex();
  const candidates = events.map((e) => {
    const hits = [];
    for (const a of archives) {
      const name = a.names.find((n) => e.body.includes(n));
      if (name) hits.push({ no: a.no, type: a.type, name, title: a.title });
    }
    return { slug: e.slug, label: e.label, hits };
  }).filter((c) => c.hits.length);

  if (!applyMap) {
    console.log(`\n关联候选：${candidates.length} 条事件命中档案名（未写入文件）`);
    for (const c of candidates) {
      console.log(`  ${c.slug}  →  ${c.hits.map((h) => `${h.no}(${h.name})`).join(", ")}`);
    }
    fs.writeFileSync(path.join(root, "chronicle-related-candidates.json"), JSON.stringify(candidates, null, 2));
    console.log("\n候选清单已写入 chronicle-related-candidates.json");
  }

  // 写文件
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  for (const e of events) {
    const fm = {
      period: e.period,
      subgroup: e.subgroup,
      date_label: e.label,
      ...(e.era_year != null ? { era_year: e.era_year } : {}),
      ...(e.era_month != null ? { era_month: e.era_month } : {}),
      ...(e.era_day != null ? { era_day: e.era_day } : {}),
      ...(e.precision ? { precision: e.precision } : {}),
      sort_order: e.sort_order,
      ...(applyMap && applyMap[e.slug] && Object.keys(applyMap[e.slug]).length ? { related: applyMap[e.slug] } : {}),
      draft: false,
      created: now,
      updated: now,
    };
    const md = `---\n${yamlDump(fm, { lineWidth: -1 })}---\n\n${e.body}\n`;
    fs.writeFileSync(path.join(OUT_DIR, `${e.slug}.md`), md);
  }
  console.log(`\n已写入 ${events.length} 个文件 → ${path.relative(root, OUT_DIR)}`);

  // 密集段抽查
  const dump = (pred, title) => {
    console.log(`\n== ${title} ==`);
    for (const e of events.filter(pred)) {
      console.log(`  ${e.slug}  y${e.era_year} m${monthKey(e)} d${e.era_day ?? "-"} o${e.sort_order}  ${e.precision || "—"}`);
    }
  };
  dump((e) => e.subgroup === "灵帝年间" && [7, 12, 16, 17].includes(e.era_year), "灵帝 7/12/16/17 年");
  dump((e) => e.subgroup === "万邦年间" && [1, 14].includes(e.era_year), "万邦元年 / 14 年");
}

main();
