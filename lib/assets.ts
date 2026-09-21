// 静态资源与站内路径的 basePath 前缀工具（GitHub Pages 仓库子路径部署）
export const ASSET_BASE: string = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(p: string): string {
  if (!p) return p;
  if (/^(https?:)?\/\//.test(p) || p.startsWith("data:")) return p;
  return ASSET_BASE + p;
}
