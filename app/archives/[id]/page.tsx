import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArchive, getFactions, getLinkRefs, getLocalNetwork, linkifyMarkdown, parseMeta } from "../../../lib/queries";
import { includeDrafts, visibleArchives } from "../../../lib/content";
import { chroniclesForArchive } from "../../../lib/chronicle";
import { asset } from "../../../lib/assets";
import { fmtDate } from "../../../lib/format";
import { SITE_COPY } from "../../../lib/site-copy";
import { SIX_DIMS, TYPE_META } from "../../../lib/types";
import MdView from "../../../components/MdView";
import RadarChart from "../../../components/RadarChart";
import NetworkBoard from "../../../components/NetworkBoard";
import Gallery from "../../../components/Gallery";
import ShareExportButton from "../../../components/share/ShareExportButton";
import { buildSharePayload } from "../../../lib/share-blocks";

// 模板段落文本规整为 Markdown（无空行的换行统一为段落间隔）
function toMd(text: string): string {
  if (!text) return "";
  if (text.includes("\n\n")) return text;
  return text.split("\n").map((s) => s.trim()).filter(Boolean).join("\n\n");
}

// 字段小节：金色等宽小节码 + 字段名 + 细线引导 + 正文；空字段整节不渲染
function SecBlock({ n, name, text, refs, id }: { n: number; name: string; text: string; refs: any[]; id: string }) {
  if (!text || !text.trim()) return null;
  const dc = SITE_COPY.detail;
  const md = linkifyMarkdown(toMd(text), refs, id);
  return (
    <section className="sec-block">
      <div className="sec-head">
        <span className="sec-code">{dc.secCode(n)}</span>
        <span className="sec-name">{name}</span>
        <span className="sec-rule" aria-hidden="true" />
      </div>
      <div className="sec-body">
        <MdView>{md}</MdView>
      </div>
    </section>
  );
}

// 档号拆分：YS-M-021 → 前缀 YS-M（主文字色）+ 尾号 021（金色）
function splitNo(no: string): { pre: string; suf: string } {
  const i = no.lastIndexOf("-");
  return i < 0 ? { pre: no, suf: "" } : { pre: no.slice(0, i), suf: no.slice(i + 1) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = getArchive(id);
  if (!row || (row.status !== "published" && !includeDrafts())) return { title: "档案不存在" };
  return { title: row.title };
}

export function generateStaticParams() {
  return visibleArchives().map((a) => ({ id: a.id }));
}

export default async function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = getArchive(id);
  if (!row || (row.status !== "published" && !includeDrafts())) notFound();

  const meta = parseMeta(row);
  const refs = getLinkRefs();
  const factions = getFactions();
  const tm = TYPE_META[row.type as keyof typeof TYPE_META];
  const dc = SITE_COPY.detail;
  const noParts = splitNo(row.archive_no);
  const events = chroniclesForArchive(row.id);
  let sec = 0;
  const nextSec = () => ++sec;

  // 关联档案：编年事件同事件的其它档案 + 人员的关系邻接
  const relatedIds = new Set<string>();
  for (const e of events) for (const r of e.related) if (r.id !== row.id) relatedIds.add(r.id);
  if (row.type === "person") {
    const local = getLocalNetwork(row.id);
    for (const e of local.edges) {
      if (e.source !== row.id) relatedIds.add(e.source);
      if (e.target !== row.id) relatedIds.add(e.target);
    }
  }
  const relatedArchives = [...relatedIds]
    .map((rid) => getArchive(rid))
    .filter((a): a is NonNullable<typeof a> => !!a && a.status === "published")
    .slice(0, 6);

  return (
    <div className="container fade-in">
      <meta data-pagefind-meta={`archive_type:${row.type}`} />
      <meta data-pagefind-meta={`no:${row.archive_no}`} />
      <meta data-pagefind-meta={`title:${row.title.replace(/"/g, "")}`} />

      <header className="dossier-head">
        <div className="eyebrow">{dc.eyebrowOf(tm.noPrefix, tm.label)}</div>
        <div className="dossier-no">
          <span>{noParts.pre}</span>
          {noParts.suf ? (
            <>
              <span className="dossier-slash">-</span>
              <span className="suffix">{noParts.suf}</span>
            </>
          ) : null}
        </div>
        {row.type === "person" || row.type === "anomaly" ? (
          <div className="dossier-title-row">
            <h1>{row.title}</h1>
            <ShareExportButton payload={buildSharePayload(row, meta, refs, factions)} />
          </div>
        ) : (
          <h1>{row.title}</h1>
        )}
        {row.codename ? <div className="dossier-codename">{dc.codename} // {row.codename}</div> : null}
        <div className="d-meta">
          {dc.recordedBy(row.author_name || dc.recordedByName, fmtDate(row.updated_at))}
        </div>
        {row.type === "anomaly" && meta.specialMark && meta.specialMark !== "无" ? (
          <div><span className="badge badge-danger">{dc.markBadge(meta.specialMark)}</span></div>
        ) : null}
        {row.tags.length ? (
          <div className="d-tags">
            {row.tags.map((t: any) => (
              <Link key={t.id} className="tag-chip" href={`/archives/?tag=${encodeURIComponent(t.name)}`}>
                {t.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <div className="dossier-grid">
        <div>
          {row.type === "anomaly" ? (
            <>
              <SecBlock n={nextSec()} name={dc.secDesc} text={meta.desc || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secDanger} text={meta.danger || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secUtilization} text={meta.utilization || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secReversibility} text={meta.reversibility || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secOrigin} text={meta.origin || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secDisposal} text={meta.disposal || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secReport} text={meta.report || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secPostscript} text={row.body_md} refs={refs} id={row.id} />
            </>
          ) : null}

          {row.type === "person" ? (
            <>
              {meta.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset(meta.avatar)} alt={row.title} className="avatar-frame" />
              ) : null}
              <div className="info-grid">
                <div className="ig-cell"><span className="ig-label">{dc.infoName}</span><span className="ig-value">{row.title}</span></div>
                {row.codename ? <div className="ig-cell"><span className="ig-label">{dc.codename}</span><span className="ig-value mono">{row.codename}</span></div> : null}
                {meta.gender ? <div className="ig-cell"><span className="ig-label">{dc.infoGender}</span><span className="ig-value">{meta.gender}</span></div> : null}
                {meta.age ? <div className="ig-cell"><span className="ig-label">{dc.infoAge}</span><span className="ig-value">{meta.age}</span></div> : null}
                {meta.unit ? <div className="ig-cell ig-full"><span className="ig-label">{dc.infoUnit}</span><span className="ig-value">{meta.unit}</span></div> : null}
                {meta.race ? <div className="ig-cell"><span className="ig-label">{dc.infoRace}</span><span className="ig-value">{meta.race}</span></div> : null}
                {meta.faction ? (
                  <div className="ig-cell">
                    <span className="ig-label">{dc.infoFaction}</span>
                    <span className="ig-value">
                      {(() => {
                        const f = factions.find((x) => x.slug === meta.faction);
                        return f ? (
                          <Link href={`/archives/${f.id}/`} className="badge badge-gold">
                            {f.title}
                          </Link>
                        ) : (
                          <span className="ig-warn">{dc.factionMissing(meta.faction)}</span>
                        );
                      })()}
                    </span>
                  </div>
                ) : null}
              </div>

              <SecBlock n={nextSec()} name={dc.secBackground} text={meta.background || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secAppearance} text={meta.appearance || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secAnomalyEffect} text={meta.anomalyEffect || ""} refs={refs} id={row.id} />
              <SecBlock n={nextSec()} name={dc.secHoldings} text={meta.holdings || ""} refs={refs} id={row.id} />

              {meta.stats && Object.values(meta.stats).some(Boolean) ? (
                <div className="stats-panel">
                  <div className="sp-title">{dc.statsTitle}</div>
                  <div className="sp-legend">{dc.statsLegend}</div>
                  <div className="sp-flex">
                    <RadarChart stats={meta.stats} />
                    <table className="grade-table">
                      <tbody>
                        {SIX_DIMS.map((d) => (
                          <tr key={d}>
                            <td>{d}</td>
                            <td className="g">{meta.stats?.[d] || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <section className="sec-block">
                <div className="sec-head">
                  <span className="sec-code">{dc.secCode(nextSec())}</span>
                  <span className="sec-name">{dc.relationTitle}</span>
                  <span className="sec-rule" aria-hidden="true" />
                </div>
                <PersonLocalNetwork personId={row.id} />
              </section>
              <Gallery items={meta.gallery || []} />
            </>
          ) : null}

          {row.type === "faction" ? (
            <>
              <div className="faction-emblem">
                {row.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset(row.logo_path)} alt={row.title} />
                ) : null}
                <div>
                  {meta.slogan ? <p className="fe-slogan">「{meta.slogan}」</p> : null}
                  {meta.altNames && meta.altNames.length ? (
                    <div className="fe-names">ALT // {meta.altNames.join(" · ")}</div>
                  ) : null}
                </div>
              </div>
              <div className="read-body">
                <MdView>{linkifyMarkdown(toMd(row.body_md), refs, row.id)}</MdView>
              </div>
            </>
          ) : null}

          {row.type === "lore" || row.type === "cihai" ? (
            <div className="read-body">
              <MdView>{linkifyMarkdown(toMd(row.body_md), refs, row.id)}</MdView>
            </div>
          ) : null}

          {events.length ? <RelatedChronicles events={events} /> : null}
        </div>

        <aside className="dossier-side">
          <div className="index-panel">
            <div className="ip-head">{dc.indexTitle}</div>
            <div className="ip-row">
              <span className="ip-label">{dc.indexUnit}</span>
              <span className="ip-value">{dc.indexUnitValue}</span>
            </div>
            <div className="ip-row">
              <span className="ip-label">{dc.indexRevised}</span>
              <span className="ip-value mono">{fmtDate(row.updated_at)}</span>
            </div>
            <div className="ip-row">
              <span className="ip-label">{dc.indexStatus}</span>
              <span className="ip-value">
                <span className={`badge${row.status === "published" ? " badge-gold" : ""}`}>
                  {row.status === "published" ? dc.statusPublished : dc.statusDraft}
                </span>
              </span>
            </div>
            <div className="ip-row">
              <span className="ip-label">{dc.indexRelated}</span>
              {relatedArchives.length ? (
                <span className="ip-links">
                  {relatedArchives.map((a) => (
                    <Link key={a.id} href={`/archives/${a.id}/`}>
                      {a.archive_no} · {a.title}
                    </Link>
                  ))}
                </span>
              ) : (
                <span className="ip-value muted">{dc.indexRelatedEmpty}</span>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="action-bar">
        <span className="ab-label">// ACTIONS</span>
        <Link href="/archives/" className="btn">{dc.backToIndex}</Link>
        <Link href={events.length ? `/chronicle/#${encodeURIComponent(events[0].slug)}` : "/chronicle/"} className="btn">
          {dc.locateChronicle}
        </Link>
        <Link href="/random/" className="btn btn-gold">{dc.randomDossier}</Link>
      </div>
    </div>
  );
}

// 相关历史事件：列出关联本档案的编年史事件，跳转 /chronicle 对应锚点
function RelatedChronicles({ events }: { events: { slug: string; date_label: string; body: string }[] }) {
  const dc = SITE_COPY.detail;
  return (
    <section className="rel-chron">
      <div className="section-head">
        <h2>{dc.relatedChronicleTitle}</h2>
      </div>
      {events.map((e) => {
        const plain = e.body.replace(/[#>*`\-[\]()!]/g, "").replace(/\s+/g, "");
        const excerpt = plain.length > 64 ? plain.slice(0, 64) + "…" : plain;
        return (
          <div key={e.slug} className="rc-row">
            <span className="rc-date">{e.date_label}</span>
            <span className="rc-text">{excerpt}</span>
            <span className="rc-go">
              <Link href={`/chronicle/#${encodeURIComponent(e.slug)}`}>{dc.relatedChronicleView} →</Link>
            </span>
          </div>
        );
      })}
    </section>
  );
}

function PersonLocalNetwork({ personId }: { personId: string }) {
  const data = getLocalNetwork(personId);
  if (!data.edges.length) {
    return <p className="muted">{SITE_COPY.detail.relationEmpty}</p>;
  }
  return <NetworkBoard data={data} local />;
}
