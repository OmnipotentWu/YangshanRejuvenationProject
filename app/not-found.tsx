import Link from "next/link";
import { SITE_COPY } from "../lib/site-copy";

export default function NotFound() {
  const nf = SITE_COPY.notFound;
  return (
    <div className="container fade-in terminal-page" style={{ textAlign: "center" }} data-pagefind-ignore>
      <div className="terminal-code">{nf.code}</div>
      <h1 className="terminal-title">{nf.title}</h1>
      <p className="terminal-desc">{nf.desc}</p>
      <div className="terminal-actions" style={{ justifyContent: "center" }}>
        <Link href="/archives/" className="btn">{nf.back}</Link>
        <Link href="/random/" className="btn btn-gold">{nf.random}</Link>
      </div>
    </div>
  );
}
