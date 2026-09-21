import type { ArchiveMeta } from "./types";
import { getArchiveById, loadArchives, loadKinds, loadRelationships, publishedArchives } from "./content";

export function parseMeta(a: { meta?: string }): ArchiveMeta {
  try { return JSON.parse(a.meta || "{}"); } catch { return {}; }
}

export function getArchive(id: string) {
  const row: any = getArchiveById(id);
  if (!row) return null;
  row.tags = row.tags || [];
  row.author_name = null;
  return row;
}

export function searchArchives(_q: string) {
  // 静态版全文搜索由 Pagefind 承担（浏览器端），此函数仅为类型占位
  return { groups: { anomaly: [], person: [], faction: [], lore: [], cihai: [] }, total: 0, order: [] as any[] };
}

export function randomArchiveId(): string | null {
  const list = publishedArchives();
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)].id;
}

export function stats() {
  const m: Record<string, number> = { anomaly: 0, person: 0, faction: 0, lore: 0, cihai: 0 };
  for (const a of publishedArchives()) m[a.type]++;
  return { byType: m, total: m.anomaly + m.person + m.faction + m.lore + m.cihai, drafts: 0, relationships: loadRelationships().length };
}

export function latestArchives(n: number) {
  return publishedArchives()
    .slice()
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1) || (a.id < b.id ? 1 : -1))
    .slice(0, n)
    .map((a) => ({ id: a.id, type: a.type, title: a.title, archive_no: a.archive_no, codename: a.codename, updated_at: a.updated_at }));
}

// ---------- 自动内链 ----------
import { asset } from "./assets";

export interface LinkRef { id: string; title: string; }

export function getLinkRefs(): LinkRef[] {
  const refs: LinkRef[] = [];
  for (const r of publishedArchives()) {
    refs.push({ id: r.id, title: r.title });
    if (r.codename) refs.push({ id: r.id, title: r.codename });
  }
  return refs;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function linkifyMarkdown(md: string, refs: LinkRef[], excludeId?: string): string {
  const usable = refs.filter((r) => r.id !== excludeId && r.title.length >= 2);
  if (!usable.length || !md) return md;
  usable.sort((a, b) => b.title.length - a.title.length);
  const alt = usable.map((r) => escapeReg(r.title)).join("|");
  const map = new Map(usable.map((r) => [r.title, r.id]));
  const quote = `["'“”‘’「」『』]`;
  const re = new RegExp(
    `(《(?:${alt})》)|((?:谬误条目|谬误|条目|见于谬误|参见谬误)${quote}?((?:${alt}))${quote}?)`,
    "g"
  );
  return md.replace(re, (whole, book, quoted, innerTitle) => {
    const title = book ? book.slice(1, -1) : innerTitle;
    const id = map.get(title);
    if (!id) return whole;
    const href = asset(`/archives/${id}/`);
    if (book) return `[${book}](${href})`;
    return `[${quoted}](${href})`;
  });
}

// ---------- 关系网 ----------
export interface NetworkData {
  persons: { id: string; title: string; codename: string | null; faction: string | null; avatar: string | null }[];
  factions: { id: string; title: string; slug: string; logo_path: string | null; slogan: string | null }[];
  edges: { source: string; target: string; kind: string; note: string }[];
  membership: { person: string; factionSlug: string }[];
  kinds: string[];
}

export function getNetworkData(): NetworkData {
  const persons = publishedArchives()
    .filter((a) => a.type === "person")
    .map((r) => {
      const o = parseMeta(r);
      return { id: r.id, title: r.title, codename: r.codename, faction: o.faction || null, avatar: o.avatar || null };
    });
  const factions = publishedArchives()
    .filter((a) => a.type === "faction")
    .map((r) => {
      const o = parseMeta(r);
      return { id: r.id, title: r.title, slug: o.slug || "", logo_path: r.logo_path, slogan: o.slogan || null };
    });
  const personIds = new Set(persons.map((p) => p.id));
  const edges = loadRelationships().filter((e) => personIds.has(e.source) && personIds.has(e.target));
  return {
    persons,
    factions,
    edges,
    membership: persons.filter((p) => p.faction).map((p) => ({ person: p.id, factionSlug: p.faction as string })),
    kinds: loadKinds(),
  };
}

export function getLocalNetwork(personId: string): NetworkData {
  const all = getNetworkData();
  const related = new Set<string>([personId]);
  const edges = all.edges.filter((e) => {
    if (e.source === personId || e.target === personId) {
      related.add(e.source); related.add(e.target); return true;
    }
    return false;
  });
  const secondHop = all.edges.filter((e) => !edges.includes(e) && related.has(e.source) && related.has(e.target));
  const finalEdges = [...edges, ...secondHop];
  for (const e of finalEdges) { related.add(e.source); related.add(e.target); }
  const persons = all.persons.filter((p) => related.has(p.id));
  const fset = new Set(persons.map((p) => p.faction).filter(Boolean) as string[]);
  const factions = all.factions.filter((f) => fset.has(f.slug));
  const kinds = [...new Set(finalEdges.map((e) => e.kind))];
  const membership = all.membership.filter((m) => related.has(m.person) && fset.has(m.factionSlug));
  return { persons, factions, edges: finalEdges, membership, kinds };
}

// ---------- 势力列表（势力归属选择 / 筛选） ----------
export function getFactions() {
  return publishedArchives()
    .filter((a) => a.type === "faction")
    .map((r) => ({ id: r.id, title: r.title, slug: parseMeta(r).slug || "", logo_path: r.logo_path, slogan: parseMeta(r).slogan || "" }));
}
