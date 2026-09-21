// 用仓库变量生成 Sveltia CMS 配置（本地开发与 GitHub Actions 共用）
// 配置来源：环境变量，或 public/admin/config.yml 中的占位符（本地手动替换也可）
// 用法：GITHUB_OWNER=<用户名> OAUTH_WORKER_URL=<Worker地址> node scripts/gen-admin-config.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "public", "admin", "config.yml");
let yml = fs.readFileSync(file, "utf-8");

const owner = process.env.GITHUB_OWNER || "";
const oauth = process.env.OAUTH_WORKER_URL || "";

if (owner) {
  yml = yml.replace("<GITHUB_OWNER>/YangshanRejuvenationProject", `${owner}/YangshanRejuvenationProject`);
}
if (oauth) {
  yml = yml.replaceAll("<OAUTH_WORKER_URL>", oauth.replace(/\/$/, ""));
}
fs.writeFileSync(file, yml);

const okOwner = !yml.includes("<GITHUB_OWNER>");
const okOauth = !yml.includes("<OAUTH_WORKER_URL>");
console.log(`config.yml 生成完毕：repo ${okOwner ? "✓" : "✗ 占位符未替换"}，OAuth ${okOauth ? "✓" : "✗ 占位符未替换"}`);
if (!okOwner || !okOauth) process.exit(1);
