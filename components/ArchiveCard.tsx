import Link from "next/link";
import type { ArchiveType } from "../lib/types";
import { TYPE_META } from "../lib/types";

interface Props {
  id: string;
  archive_no: string;
  type: ArchiveType;
  title: string;
  codename?: string | null;
  excerpt?: string | null;
  updated_at?: string;
}

export default function ArchiveCard({ id, archive_no, type, title, codename, excerpt, updated_at }: Props) {
  return (
    <div className="card fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span className="archive-no">{archive_no}</span>
        <span className="badge badge-gold">{TYPE_META[type].label}</span>
      </div>
      <div className="card-title" style={{ marginTop: 6 }}>
        <Link href={`/archives/${id}`}>{title}</Link>
        {codename ? <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>（{codename}）</span> : null}
      </div>
      {excerpt ? (
        <p className="muted" style={{ fontSize: 13.5, margin: "0 0 8px" }}>
          {excerpt.length > 90 ? excerpt.slice(0, 90) + "…" : excerpt}
        </p>
      ) : null}
      {updated_at ? <div className="mono muted" style={{ fontSize: 11.5 }}>更新于 {updated_at}</div> : null}
    </div>
  );
}
