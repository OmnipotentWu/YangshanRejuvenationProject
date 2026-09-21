import { NextResponse } from "next/server";
import { parseMeta } from "../../../lib/queries";
import { publishedArchives } from "../../../lib/content";

export const dynamic = "force-static";

export function GET() {
  const archives = publishedArchives().map((a) => {
    const meta = parseMeta(a);
    return {
      id: a.id,
      no: a.archive_no,
      type: a.type,
      title: a.title,
      codename: a.codename,
      summary: a.summary,
      updated: a.updated_at,
      tags: (a.tags || []).map((t: any) => t.name),
      mark: a.type === "anomaly" ? meta.specialMark || "无" : undefined,
      faction: a.type === "person" ? meta.faction || "" : undefined,
      stats: a.type === "person" ? meta.stats || {} : undefined,
    };
  });
  const tags = [...new Set(archives.flatMap((a) => a.tags))].sort();
  const factions = publishedArchives()
    .filter((a) => a.type === "faction")
    .map((a) => ({ id: a.id, title: a.title, slug: parseMeta(a).slug || "" }));
  return NextResponse.json({ archives, tags, factions });
}
