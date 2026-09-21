"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const nav = [
    { href: "/", label: "首页" },
    { href: "/archives", label: "档案库", match: (p: string) => p.startsWith("/archives") },
    { href: "/network", label: "关系网" },
    { href: "/admin", label: "后台" },
  ];
  const isActive = (href: string, match?: (p: string) => boolean) =>
    match ? match(pathname) : pathname === href;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="site-header" data-pagefind-ignore>
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-title">仰山市档案与公共安全部</span>
          <span className="brand-sub">YANGSHAN ARCHIVE SYSTEM · YRP</span>
        </Link>
        <nav className="main-nav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n.href, n.match) ? "active" : ""}>
              {n.label}
            </Link>
          ))}
          <Link href="/random" className="nav-random" title="随机调阅一份档案">
            ⧉ 随机档案
          </Link>
        </nav>
        <form className="header-search" onSubmit={onSearch} role="search">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="检索档案…"
            aria-label="检索档案"
          />
        </form>
      </div>
    </header>
  );
}
