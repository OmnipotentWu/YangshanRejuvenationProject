"use client";

import { useEffect, useState } from "react";
import { asset } from "../../lib/assets";

export default function RandomPage() {
  const [msg, setMsg] = useState("正在调阅随机档案…");
  useEffect(() => {
    fetch(asset("/random/manifest.json"))
      .then((r) => r.json())
      .then((ids: number[]) => {
        if (!ids.length) {
          setMsg("暂无可调阅的档案。");
          return;
        }
        const id = ids[Math.floor(Math.random() * ids.length)];
        window.location.replace(asset(`/archives/${id}/`));
      })
      .catch(() => setMsg("档案清单加载失败，请返回档案库。"));
  }, []);
  return (
    <div className="container fade-in" style={{ paddingTop: 80, textAlign: "center" }}>
      <div className="mono" style={{ color: "var(--gold-dim)", letterSpacing: "0.2em", fontSize: 13 }}>
        YS-RANDOM · ARCHIVE RETRIEVAL
      </div>
      <p className="muted" style={{ marginTop: 14 }}>{msg}</p>
    </div>
  );
}
