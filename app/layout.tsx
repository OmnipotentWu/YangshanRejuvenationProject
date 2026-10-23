import type { Metadata } from "next";
import "./globals.css";
import SiteRail from "../components/SiteRail";
import StatusBar from "../components/StatusBar";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: { default: "仰山市档案与公共安全部 · 档案管理系统", template: "%s · 仰山档案" },
  description: "仰山复兴计划世界观档案库：谬误备案、个体备案、势力情报与设定资料。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteRail />
        <div className="shell-main">
          <StatusBar />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
