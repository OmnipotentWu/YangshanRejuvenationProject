// 日期显示格式化：content frontmatter 的 created/updated 被 YAML 解析为
// Date 对象，String() 后形如 "Mon Oct 20 2026 20:03:00 GMT+0800 ..."，
// 也可能已是 ISO / "YYYY-MM-DD HH:mm:ss" 字符串。统一输出 YYYY-MM-DD，空值回退 "--"。
export function fmtDate(s?: string | null): string {
  const t = (s || "").trim();
  if (!t) return "--";
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return t.slice(0, 10);
}
