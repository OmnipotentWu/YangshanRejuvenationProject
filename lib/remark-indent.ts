// remark 插件：段落以 "[[IND]]" 标记开头时渲染为首行缩进段落（class="fi"）
// 注意：存储与编辑器中使用 ">> " 前缀，MdView 在解析前将其转换为 "[[IND]]"，
// 避免 ">>" 被 Markdown 解析为引用块。
export default function remarkFirstLineIndent() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (node?.type === "paragraph" && Array.isArray(node.children)) {
        const first = node.children[0];
        if (first?.type === "text" && typeof first.value === "string" && first.value.startsWith("[[IND]]")) {
          first.value = first.value.replace(/^\[\[IND\]\][ ]?/, "");
          node.data = { ...(node.data ?? {}), hProperties: { className: ["fi"] } };
        }
      }
      if (Array.isArray(node?.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}
