import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: { default: "仰山市档案与公共安全部 · 档案管理系统", template: "%s · 仰山档案" },
  description: "仰山复兴计划世界观档案库：谬误备案、个体备案、势力情报与设定资料。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
