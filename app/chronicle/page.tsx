import type { Metadata } from "next";
import { CHRONICLE_PERIODS, sortedChronicles } from "../../lib/chronicle";
import { loadArchives } from "../../lib/content";
import { SITE_COPY } from "../../lib/site-copy";
import ChronicleBoard from "../../components/ChronicleBoard";

export const metadata: Metadata = { title: "编年史" };

export default function ChroniclePage() {
  const cc = SITE_COPY.chronicle;
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
        <h1>{cc.title}</h1>
        <p>{cc.eyebrow}</p>
      </header>

      <blockquote className="chron-intro">{cc.intro}</blockquote>
      <p className="chron-notice">{cc.notice}</p>

      <ChronicleBoard events={events} periods={CHRONICLE_PERIODS} />
    </div>
  );
}
