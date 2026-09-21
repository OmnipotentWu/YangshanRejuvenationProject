// 本地预览 out/ 目录的极简静态服务器（无需安装额外依赖）
// 用法：npm run preview  → http://localhost:3000/YangshanRejuvenationProject/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const base = "/YangshanRejuvenationProject";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (urlPath.startsWith(base)) urlPath = urlPath.slice(base.length) || "/";
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = path.join(root, urlPath);
    if (!path.resolve(file).startsWith(path.resolve(root)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(3000, () => {
    console.log(`预览：http://localhost:3000${base}/`);
  });
