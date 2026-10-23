"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { asset } from "../../lib/assets";
import { SITE_COPY } from "../../lib/site-copy";

export default function RandomPage() {
  const rc = SITE_COPY.random;
  const [msg, setMsg] = useState<string>(rc.loading);
  useEffect(() => {
    fetch(asset("/random/manifest.json"))
      .then((r) => r.json())
      .then((ids: number[]) => {
        if (!ids.length) {
          setMsg(SITE_COPY.random.empty);
          return;
        }
        const id = ids[Math.floor(Math.random() * ids.length)];
        window.location.replace(asset(`/archives/${id}/`));
      })
      .catch(() => setMsg(SITE_COPY.random.failed));
  }, []);
  return (
    <div className="container fade-in terminal-page" style={{ textAlign: "center" }}>
      <div className="terminal-code">{rc.code}</div>
      <p className="terminal-desc">{msg}</p>
      {msg === rc.failed ? (
        <Link href="/archives/" className="btn">{rc.back}</Link>
      ) : null}
    </div>
  );
}
