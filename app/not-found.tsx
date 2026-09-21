import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container fade-in" style={{ paddingTop: 60, textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 13, color: "var(--gold-dim)", letterSpacing: "0.2em" }}>
        YS-404 · ARCHIVE NOT FOUND
      </div>
      <h1 style={{ fontSize: 24, margin: "12px 0" }}>该档案不存在或未发布</h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        您尝试调阅的档案可能尚未发布、已被移除，或编号有误。
      </p>
      <Link href="/archives" className="btn btn-gold">返回档案库</Link>
      {"　"}
      <Link href="/random" className="btn">随机调阅一份</Link>
    </div>
  );
}
