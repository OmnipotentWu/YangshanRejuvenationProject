"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { asset } from "../lib/assets";
import { SITE_COPY } from "../lib/site-copy";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "square" } as const;

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M3 11.5 12 4l9 7.5" /><path d="M6 10.5V20h12v-9.5" /><path d="M10 20v-6h4v6" /></svg>
  ),
  archives: (
    <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="5" /><path d="M5 9v11h14V9" /><path d="M10 13h4" /></svg>
  ),
  chronicle: (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="6" r="2.6" /><circle cx="18" cy="7" r="2.6" /><circle cx="10" cy="18" r="2.6" /><path d="M8.3 7 15.6 7.2M7 8.4l2 7.2M16.6 9.3l-5 7" /></svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
  ),
  random: (
    <svg viewBox="0 0 24 24" {...stroke}><rect x="3.5" y="3.5" width="17" height="17" /><circle cx="8.6" cy="8.6" r="1.3" /><circle cx="15.4" cy="15.4" r="1.3" /><circle cx="15.4" cy="8.6" r="1.3" /><circle cx="8.6" cy="15.4" r="1.3" /></svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" /></svg>
  ),
};

const navIcons = ["home", "archives", "chronicle", "network"];
const utilIcons = ["search", "random", "admin"];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href.replace(/\/$/, ""));
}

export default function SiteRail() {
  const pathname = usePathname() || "/";
  const { shell } = SITE_COPY;

  return (
    <>
      <aside className="rail" data-pagefind-ignore>
        <Link href="/" className="rail-brand" aria-label="仰山档案 · 首页">
          <span className="rb-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/logos/yrp.webp")} alt={shell.railBrandTop} />
          </span>
          <span className="rb-top">{shell.railBrandTop}</span>
          <span className="rb-sub">{shell.railBrandSub}</span>
        </Link>
        <nav className="rail-nav" aria-label="主导航">
          {shell.nav.map((n, i) => (
            <Link key={n.href} href={n.href} className={`rail-link${isActive(n.href, pathname) ? " active" : ""}`}>
              <span className="rl-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="rl-icon" aria-hidden="true">{ICONS[navIcons[i]]}</span>
              <span className="rl-label">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="rail-utils">
          {shell.railUtils.map((u, i) => (
            <Link key={u.href} href={u.href} className="rail-util" title={u.title}>
              <span className="rl-icon" aria-hidden="true">{ICONS[utilIcons[i]]}</span>
              <span>{u.label}</span>
            </Link>
          ))}
        </div>
        <div className="rail-foot">{shell.railFooter}</div>
      </aside>

      <div className="m-topbar" data-pagefind-ignore>
        <Link href="/" className="mt-mark" aria-label="仰山档案 · 首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logos/yrp.webp")} alt="" />
        </Link>
        <span className="mt-brand">{shell.railBrandTop}</span>
        <span className="mt-status">{shell.statusRight}</span>
      </div>
      <nav className="m-navbar" aria-label="主导航" data-pagefind-ignore>
        {shell.nav.map((n, i) => (
          <Link key={n.href} href={n.href} className={isActive(n.href, pathname) ? "active" : ""}>
            <span className="rl-icon" aria-hidden="true">{ICONS[navIcons[i]]}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
