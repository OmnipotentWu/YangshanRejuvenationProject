"use client";

import { useRef, useState } from "react";
import type { SharePayload } from "../../lib/share-blocks";
import { runShareExport, type SharePhase } from "./export";

const PHASE_LABEL: Record<SharePhase, string> = {
  prep: "准备素材…",
  render: "排版中…",
  capture: "截图中",
};

export default function ShareExportButton({ payload }: { payload: SharePayload }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setHint(null);
    setError(null);
    try {
      await runShareExport(payload, (phase, cur, total) => {
        setHint(phase === "capture" ? `${PHASE_LABEL[phase]} ${cur}/${total}` : PHASE_LABEL[phase]);
      });
    } catch (err) {
      console.error("[share-export] 导出失败", err);
      setError("导出失败，请重试");
      if (errTimer.current) clearTimeout(errTimer.current);
      errTimer.current = setTimeout(() => setError(null), 5000);
    } finally {
      setBusy(false);
      setHint(null);
    }
  };

  return (
    <span className="share-export-wrap">
      <button
        type="button"
        className="share-export-btn"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
        title="将本档案导出为适合分享的竖版长图（PNG）"
      >
        {busy ? (hint ?? "生成中…") : "导出图片"}
      </button>
      {error ? <span className="share-export-err" role="alert">{error}</span> : null}
    </span>
  );
}
