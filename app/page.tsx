import Link from "next/link";
import { getFactions, latestArchives, stats } from "../lib/queries";
import { asset } from "../lib/assets";
import { fmtDate } from "../lib/format";
import { SITE_COPY } from "../lib/site-copy";
import { TYPE_META, TYPE_ORDER } from "../lib/types";

export default function HomePage() {
  const s = stats();
  const latest = latestArchives(8);
  const factions = getFactions();
  const cp = SITE_COPY.home;

  return (
    <div>
      <section className="stage grid-bg">
        <span className="stage-slash s1" aria-hidden="true" />
        <span className="stage-slash s2" aria-hidden="true" />
        <span className="stage-slash s3" aria-hidden="true" />
        <span className="stage-slash s4" aria-hidden="true" />
        <div className="container">
          <div className="stage-inner">
            <div className="stage-title">
              <div className="eyebrow">{cp.eyebrow}</div>
              <h1 className="t-solid">{cp.titleSolid}</h1>
              <div className="t-outline" aria-hidden="true">{cp.titleOutline}</div>
              <p className="t-sub">{cp.desc}</p>
            </div>
            <aside className="stage-stats">
              <div className="ss-total">
                <span className="n">{s.total}</span>
                <span className="u">{cp.statLabel} · {cp.statUnit}</span>
              </div>
              <div className="ss-list">
                {TYPE_ORDER.map((t) => (
                  <Link key={t} href={`/archives/?type=${t}`} className="ss-row">
                    <span>{TYPE_META[t].label}</span>
                    <span className="mono">{String(s.byType[t]).padStart(2, "0")}</span>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="ruler"><span className="ruler-label">{cp.rulerLabel}</span></div>

        <div className="section-head">
          <h2>{cp.latestTitle}</h2>
          <Link className="more" href="/archives/">{cp.latestMore} →</Link>
        </div>
        <div className="intel-list">
          {latest.map((a) => (
            <Link key={a.id} href={`/archives/${a.id}/`} className="intel-row">
              <span className="ir-type">{TYPE_META[a.type].label}</span>
              <span className="ir-date">{fmtDate(a.updated_at)}</span>
              <span className="ir-title">
                <span className="ir-code">{a.archive_no}</span>
                {a.title}
              </span>
              <span className="ir-arrow" aria-hidden="true">▸</span>
            </Link>
          ))}
        </div>

        <div className="section-head">
          <h2>{cp.factionTitle}</h2>
          <Link className="more" href="/archives/?type=faction">{cp.factionAll} →</Link>
        </div>
        {factions.length ? (
          <div className="logo-wall">
            {factions.map((f) => (
              <Link key={f.id} href={`/archives/${f.id}/`} className="logo-cell">
                {f.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset(f.logo_path)} alt={f.title} />
                ) : (
                  <span className="mono muted">{f.title.slice(0, 2)}</span>
                )}
                <div className="fname">{f.title}</div>
                <div className="fslogan">{f.slogan || ""}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="list-empty">{cp.factionEmpty}</div>
        )}

        <div className="section-head">
          <h2>{cp.catTitle}</h2>
        </div>
        {TYPE_ORDER.map((t, i) => (
          <Link key={t} href={`/archives/?type=${t}`} className="cat-strip">
            <span className="cs-no">{String(i + 1).padStart(2, "0")}</span>
            <span className="cs-head">
              <span className="cs-zh">{TYPE_META[t].label}</span>
              <span className="cs-en">{cp.catEn[t]} · {TYPE_META[t].noPrefix}</span>
              <span className="cs-count">{String(s.byType[t]).padStart(2, "0")}</span>
            </span>
            <span className="cs-desc">{TYPE_META[t].desc}</span>
            <span className="cs-wedge" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
