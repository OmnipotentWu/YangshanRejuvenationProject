import Link from "next/link";
import { SITE_COPY } from "../lib/site-copy";

export default function SiteFooter() {
  const { shell } = SITE_COPY;
  return (
    <footer className="site-footer" data-pagefind-ignore>
      <div className="container">
        <hr className="sf-rule" />
        <div className="motto">{shell.footerMotto}</div>
        <div>
          {shell.footerNote}
          <Link href="/admin">{shell.footerLogin}</Link>。
        </div>
        <div className="mono" style={{ marginTop: 6, fontSize: 12, letterSpacing: "0.14em" }}>
          {shell.footerEn}
        </div>
      </div>
    </footer>
  );
}
