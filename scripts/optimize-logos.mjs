// 徽标优化：PNG 原图 → 512px WebP（保留透明通道），原图移至 assets-src/logos-originals/
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGOS = path.join(root, "public", "logos");
const OUT = path.join(root, "assets-src", "logos-originals");
fs.mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(LOGOS, "manifest.json"), "utf-8"));

for (const [slug, info] of Object.entries(manifest)) {
  const src = path.join(LOGOS, `${slug}.png`);
  if (!fs.existsSync(src)) {
    console.log(`跳过 ${slug}：未找到 ${slug}.png`);
    continue;
  }
  const dst = path.join(LOGOS, `${slug}.webp`);
  await sharp(src)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 95 })
    .toFile(dst);
  const before = fs.statSync(src).size;
  const after = fs.statSync(dst).size;
  // 原图移出 public，避免被直接访问到未经优化的版本
  fs.renameSync(src, path.join(OUT, `${slug}.png`));
  info.file = `${slug}.webp`;
  console.log(`${slug}: ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(0)}KB`);
}

fs.writeFileSync(path.join(LOGOS, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest.json 已更新为 .webp");
