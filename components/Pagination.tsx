import Link from "next/link";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  makeHref: (page: number) => string;
}

export default function Pagination({ page, total, pageSize, makeHref }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const items: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) items.push(i);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <nav className="pager" aria-label="分页">
      {page > 1 ? <Link href={makeHref(page - 1)}>上一页</Link> : null}
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} className="muted">…</span>
        ) : it === page ? (
          <span key={it} className="cur">{it}</span>
        ) : (
          <Link key={it} href={makeHref(it)}>{it}</Link>
        )
      )}
      {page < pages ? <Link href={makeHref(page + 1)}>下一页</Link> : null}
    </nav>
  );
}
