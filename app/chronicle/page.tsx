import type { Metadata } from "next";
import { CHRONICLE_PERIODS, sortedChronicles } from "../../lib/chronicle";
import { loadArchives } from "../../lib/content";
import ChronicleBoard from "../../components/ChronicleBoard";

export const metadata: Metadata = { title: "编年史" };

// 《仰山年表【新】》卷首序言与收录说明（原文照录）
const INTRO =
  "注意：仰山的历史记录在“鼠患”影响下散佚严重，官方的历史研究受各方面影响长期停滞，直到万邦初年才完全重启，推进得比预想得更加缓慢。故本年表仅尝试为所有的，有志于为仰山历史研究工作贡献力量的民间或官方学者提供有益参考。谨记，历史并不作为完整、连续且透明的事实在研究中显露，而是尝试在叙述无法缝合、言尽并统一的位置，通过空白、沉默、矛盾、断裂、重复、边缘等形式显露自身。";
const NOTICE = "本年表暂未收录万邦15年的历史记录。";

export default function ChroniclePage() {
  const archives = new Map(loadArchives().map((a) => [a.id, a]));
  const events = sortedChronicles().map((e) => ({
    slug: e.slug,
    period: e.period,
    subgroup: e.subgroup,
    date_label: e.date_label,
    era_year: e.era_year,
    era_month: e.era_month,
    era_day: e.era_day,
    precision: e.precision,
    related: e.related.map((r) => ({ ...r, title: archives.get(r.id)?.title || r.id })),
    body: e.body,
  }));

  return (
    <div className="container fade-in" style={{ paddingTop: 28 }}>
      <header className="chron-title">
        <h1>仰山编年史</h1>
        <p className="mono muted">CHRONICLE OF YANGSHAN · 自神话时期至万邦时期</p>
      </header>

      <blockquote className="chron-intro">{INTRO}</blockquote>
      <p className="chron-notice">{NOTICE}</p>

      <ChronicleBoard events={events} periods={CHRONICLE_PERIODS} />
    </div>
  );
}
