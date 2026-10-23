# 仰山复兴计划 · 档案库网站

SCP 基金会中文站风格的世界观档案库。**纯静态 + Git 化内容管理**，构建后托管于 GitHub Pages，浏览器内通过 Sveltia CMS 编辑内容，保存即提交 Git。

在线地址：`https://<你的GitHub用户名>.github.io/YangshanRejuvenationProject/`

---

## 一、技术架构

| 层 | 方案 |
|---|---|
| 框架 | Next.js 15（静态导出 `output: 'export'`） |
| 内容 | `content/` 下的 Markdown 文件（YAML frontmatter），Git 历史即版本历史 |
| 后台 | Sveltia CMS（`public/admin/`，GitHub 账号登录） |
| 搜索 | Pagefind（构建时索引，浏览器端检索） |
| 关系网 | d3-force 侦探线索板（构建期数据，前端渲染） |
| 部署 | GitHub Actions → GitHub Pages（推送 main 自动上线） |

### 目录结构

```
content/              全部档案内容（Git 管理的唯一事实来源）
  anomaly/  person/  faction/  lore/  cihai/   五类档案，每篇一个 .md
  chronicle/          编年史事件，每事件一个 .md（前台 /chronicle）
  relationships.json  人物关系数据（人员编号关联）
  kinds.json          关系类型列表
public/
  logos/              势力徽标（webp）
  uploads/            正文/头像/画廊图片
  admin/              Sveltia CMS（config.yml 为表单配置）
docs/                 部署文档（OAuth Worker 代码、语法指南）
scripts/              构建辅助脚本（导出、徽标优化、预览、编年史导入等）
```

## 二、首次部署（一次性，约 20 分钟）

### 1. 创建仓库并推送

```bash
git init -b main
git add .
git commit -m "初始化仰山档案站"
# 在 GitHub 上新建空仓库 YangshanRejuvenationProject（不要勾选 README/License）
git remote add origin https://github.com/<你的GitHub用户名>/YangshanRejuvenationProject.git
git push -u origin main
```

### 2. 开启 GitHub Pages

仓库 → **Settings → Pages → Source 选择 "GitHub Actions"**。

### 3. 创建 GitHub OAuth App

GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**：

- Application name：任意（如 `ysr-cms`）
- Homepage URL：`https://<你的GitHub用户名>.github.io/YangshanRejuvenationProject/`
- Authorization callback URL：**先随便填**，部署完 Worker 后回来改成 `https://<Worker子域>.workers.dev/callback`

创建后记录 **Client ID**，并生成 **Client Secret**。

### 4. 部署 Cloudflare Workers 代理（免费）

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages → Create Worker** → 部署，名称如 `ysr-oauth`。
2. Worker → Settings → Variables and Secrets，添加两个 **Secret**：
   - `GITHUB_CLIENT_ID` = 上一步的 Client ID
   - `GITHUB_CLIENT_SECRET` = 上一步的 Client Secret
3. 把 `docs/oauth-worker.js` 的内容粘贴进 Worker 的代码编辑器，**Deploy**。
4. Worker 地址即 `https://ysr-oauth.<你的子域>.workers.dev`。回到第 3 步把 OAuth App 的 callback URL 改为 `https://ysr-oauth.<你的子域>.workers.dev/callback`。

### 5. 配置仓库变量与本地后台

仓库 → **Settings → Secrets and variables → Actions → Variables**（注意是 Variables，不是 Secrets）新建两个：

| 名称 | 值 |
|---|---|
| `GH_OWNER` | 你的 GitHub 用户名 |
| `OAUTH_WORKER_URL` | `https://ysr-oauth.<你的子域>.workers.dev` |

本地一次配置（已默认写入当前仓库地址与 Worker；如需更换仓库或 Worker 再执行）：

```bash
# 便携 Node
export PATH="/d/网站制作/tools/node:$PATH"
GITHUB_OWNER=<你的GitHub用户名> OAUTH_WORKER_URL=https://ysr-oauth.<子域>.workers.dev \
  node scripts/gen-admin-config.mjs
```

> 此后推送 main，Actions 会自动用仓库变量重新生成 `public/admin/config.yml` 再构建——**永远不要把真实配置以外的方式提交进仓库？** 不需要担心：`config.yml` 里不含任何密钥，OAuth Client Secret 只存在于 Worker。

### 6. 首次上线

推送任意改动（或 Actions 页手动 Run workflow）。约 1–3 分钟后访问：

- 前台：`https://<用户名>.github.io/YangshanRejuvenationProject/`
- 后台：`https://<用户名>.github.io/YangshanRejuvenationProject/admin/`

## 三、日常发布流程

1. 浏览器打开 `/admin/`，用 GitHub 账号登录（只有你自己的账号能提交）。
2. 在表单里新建/编辑档案（五类模板与旧后台一致），或维护"人物关系 / 关系类型"。
3. 点 **发布** → Sveltia 自动向仓库提交 commit。
4. Actions 自动构建部署，**1–3 分钟后线上更新**。
5. 勾选"草稿"的档案不会出现在线上（本地 `npm run dev` 可见）。

> 正文语法见 `docs/Markdown语法指南.md`。

## 四、本地开发

使用仓库自带的便携版 Node（Windows）：

```bash
export PATH="/d/网站制作/tools/node:$PATH"
npm ci               # 首次
npm run dev          # 开发预览 http://localhost:3000/YangshanRejuvenationProject/
npm run build        # 生成 out/（含 Pagefind 索引）
npm run preview      # 本地预览 out/ http://localhost:3000/YangshanRejuvenationProject/
```

> 便携 Node 目录（`tools/node`）已被 .gitignore 排除，不会进入仓库；
> 云端构建版本由 `.nvmrc`（22.23.2）锁定，与本地一致。

## 五、常用维护

- **换配色 / 设计令牌**：全站颜色、字体、线宽、切角等令牌集中在 `app/globals.css` 顶部的 `:root` 注释块（`--bg` 主背景、`--panel` 面板、`--gold` 档案金信号色、`--ink`/`--body` 文字、`--line` 细线…）。改配色只动这一节，全站自动跟随。
- **改站点固定文案**（导航、页脚、状态栏、空状态提示等装饰文字）：全部集中在 `lib/site-copy.ts`，组件内无硬编码。
- **换势力徽标**：把新图命名为 `<slug>.png` 放入 `public/logos/`，双击 `替换徽标.bat`，提交即可。
- **加新谬误/词条**：后台新建，编号按前缀顺延（YS-M-010、YS-C-002…）。
- **新建势力**：势力情报 → 新建，**务必填 slug**（个体备案的"势力归属"靠它联动）。
- **新增关系**：后台「人物关系」→ 在关系数据里添加一行，人员甲乙从下拉选择、类型从下拉选择、备注可空；保存发布即上关系网，无需改任何代码。
- **新增关系类型**：后台「关系类型」→ 类型列表里加一行即可，关系网图例与筛选自动更新（线型按列表顺序循环分配）。改名/删除旧类型不会使已有关系失效。
- **将来换自定义域名**：去掉 `next.config.ts` 的 `basePath` 与 `env`，把 `public/admin/config.yml` 的 `public_folder` 改为 `/uploads`，重新部署即可。

### 编年史

- **新增一条事件**：后台「编年史」→ 新建。时期、子分组、日期精度用下拉选择；「日期展示标签」**原文照抄**（如 `灵帝7年9月23日`、`万邦8年春`、`神话时期中期`），保存后即为该事件的分享定位锚点。正文填事件描述，多数一两句直接展示，较长会自动折叠为「详情」。
- **排序号怎么填**：整体排序 = 时期 → 子分组 → 纪年（年 → 月 → 日）→ 排序号。纪年只到年/月的事件自动排在同组更精确的事件之前；「年初 / 年末 / 春 / 夏」等修饰在「日期精度」里选对应项（年末排该年最后）。**同一日期（或同一神话阶段/王朝内）有多条事件时**，用排序号区分先后，从 0 开始填，越小越靠前；单条事件留 0 即可。
- **挂接关联档案**：事件表单里展开「关联档案」，按五类分别搜索选择（可跨类型多选，选中即建立链接，无需复制 URL）。挂接后，对应档案详情页底部会自动出现「相关历史事件」区块，跳回本时间轴对应位置。

## 六、从旧版迁移

内容已迁移至 `content/`（31 篇 + 关系数据）。旧 SQLite、账号系统、服务器 API 已全部移除。
如需从旧库重新导出：`node scripts/export-content.mjs`（需要 `data/yangshan.db`）。
