import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkFirstLineIndent from "../lib/remark-indent";
import { asset } from "../lib/assets";

// 允许 <p class="fi"> 用于首行缩进段落
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    p: [...((defaultSchema.attributes as any)?.p ?? []), ["className", "fi"]],
  },
};

// 站内链接与站内图片自动加 basePath 前缀
function MdA({ href, children }: any) {
  return <a href={href ? asset(String(href)) : href}>{children}</a>;
}
function MdImg({ src, alt }: any) {
  return <img src={src ? asset(String(src)) : src} alt={alt || ""} />;
}

export default function MdView({ children, className }: { children: string; className?: string }) {
  if (!children) return null;
  // ">> " 段落前缀 → 内部缩进标记（避免被解析为引用块）
  const processed = children.replace(/^>>[ \t]?/gm, "[[IND]] ");
  return (
    <div className={`md ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFirstLineIndent]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{ a: MdA, img: MdImg }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
