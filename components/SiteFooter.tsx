import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer" data-pagefind-ignore>
      <div className="container">
        <div className="motto">自由 · 平衡 · 新知</div>
        <div>
          仰山复兴计划项目组 · 档案管理系统 — 本库档案对全体访客公开，协作编辑请
          <Link href="/admin"> 登录后台</Link>。
        </div>
        <div className="mono" style={{ marginTop: 6, fontSize: 12 }}>
          YANGSHAN REVITALIZATION PROJECT · ARCHIVE DIVISION
        </div>
      </div>
    </footer>
  );
}
