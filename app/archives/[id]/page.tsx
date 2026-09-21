import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArchive, getFactions, getLinkRefs, getLocalNetwork, linkifyMarkdown, parseMeta } from "../../../lib/queries";
import { includeDrafts, visibleArchives } from "../../../lib/content";
import { asset } from "../../../lib/assets";
import { SIX_DIMS, TYPE_META } from "../../../lib/types";
import MdView from "../../../components/MdView";
import RadarChart from "../../../components/RadarChart";
import NetworkBoard from "../../../components/NetworkBoard";
import Gallery from "../../../components/Gallery";

// 模板段落文本规整为 Markdown（无空行的换行统一为段落间隔）
function toMd(text: string): string {
  if (!text) return "";
  if (text.includes("\n\n")) return text;
  return text.split("\n").map((s) => s.trim()).filter(Boolean).join("\n\n");
}

function FieldBlock({ label, text, refs, id }: { label: string; text: string; refs: any[]; id: string }) {
  if (!text || !text.trim()) return null;
  const md = linkifyMarkdown(toMd(text), refs, id);
  return (
    <div className="field-block">
      <div className="f-label">{label}</div>
      <MdView>{md}</MdView>
    </div>
  );
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

  return (
    <div className="container fade-in" style={{ paddingTop: 28 }}>
      <meta data-pagefind-meta={`archive_type:${row.type}`} />
      <meta data-pagefind-meta={`no:${row.archive_no}`} />
      <meta data-pagefind-meta={`title:${row.title.replace(/"/g, "")}`} />
      <article className="read-body">
        <header className="archive-head">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span className="archive-no">{row.archive_no}</span>
            <span className="badge badge-gold">{tm.label}</span>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            {meta.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset(meta.avatar)}
                alt={row.title}
                className="avatar-frame"
              />
            ) : null}
            <div style={{ flex: 1 }}>
              <h1>
                {row.title}
                {row.codename ? <span className="muted" style={{ fontSize: 16, fontWeight: 400 }}>　识别代称：{row.codename}</span> : null}
              </h1>
              <div className="meta-line mono">
                录入：{row.author_name || "档案馆"} ｜ 更新于 {row.updated_at}
              </div>
              {row.tags.length ? (
                <div style={{ marginTop: 4 }}>
                  {row.tags.map((t: any) => (
                    <Link key={t.id} className="tag-chip" href={`/archives?tag=${encodeURIComponent(t.name)}`}>
                      {t.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {row.type === "anomaly" ? (
          <>
            {meta.specialMark && meta.specialMark !== "无" ? (
              <p>
                <span className="badge badge-danger" style={{ fontSize: 13 }}>特殊谬误标记 · {meta.specialMark}</span>
              </p>
            ) : null}
            <FieldBlock label="谬误描述" text={meta.desc || ""} refs={refs} id={row.id} />
            <FieldBlock label="谬误危险性分析" text={meta.danger || ""} refs={refs} id={row.id} />
            <FieldBlock label="谬误利用性分析" text={meta.utilization || ""} refs={refs} id={row.id} />
            <FieldBlock label="谬误可逆性分析" text={meta.reversibility || ""} refs={refs} id={row.id} />
            <FieldBlock label="谬误溯源分析" text={meta.origin || ""} refs={refs} id={row.id} />
            <FieldBlock label="谬误处置措施" text={meta.disposal || ""} refs={refs} id={row.id} />
            <FieldBlock label="参考谬误观测或处置报告" text={meta.report || ""} refs={refs} id={row.id} />
            {row.body_md ? <FieldBlock label="附记" text={row.body_md} refs={refs} id={row.id} /> : null}
          </>
        ) : null}

        {row.type === "person" ? (
          <>
            <table className="info-table">
              <tbody>
                <tr><th>姓名</th><td>{row.title}</td></tr>
                {row.codename ? <tr><th>识别代称</th><td className="mono">{row.codename}</td></tr> : null}
                {meta.gender ? <tr><th>性别</th><td>{meta.gender}</td></tr> : null}
                {meta.age ? <tr><th>年龄</th><td>{meta.age}</td></tr> : null}
                {meta.unit ? <tr><th>登记岗位及所在单位</th><td>{meta.unit}</td></tr> : null}
                {meta.race ? <tr><th>种族</th><td>{meta.race}</td></tr> : null}
                {(() => {
                  if (!meta.faction) return null;
                  const f = factions.find((x) => x.slug === meta.faction);
                  return (
                    <tr>
                      <th>势力归属</th>
                      <td>
                        {f ? (
                          <Link href={`/archives/${f.id}`} className="badge badge-gold" style={{ fontSize: 13 }}>
                            {f.logo_path ? "⚜ " : ""}{f.title}
                          </Link>
                        ) : (
                          <span className="muted">（势力档案未发布或不存在的 slug：{meta.faction}）</span>
                        )}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
            <FieldBlock label="个人背景及履历" text={meta.background || ""} refs={refs} id={row.id} />
            <FieldBlock label="外貌等识别特征" text={meta.appearance || ""} refs={refs} id={row.id} />
            <FieldBlock label="影响个体特殊谬误概述" text={meta.anomalyEffect || ""} refs={refs} id={row.id} />
            <FieldBlock label="持有特殊谬误体或谬误科技情况" text={meta.holdings || ""} refs={refs} id={row.id} />

            {meta.stats && Object.values(meta.stats).some(Boolean) ? (
              <div className="field-block" style={{ borderLeftColor: "var(--ink)" }}>
                <div className="f-label">工作能力评定（S 卓越 / A 优良 / B 均衡 / C 一般 / D 缺陷）</div>
                <RadarChart stats={meta.stats} />
                <table className="info-table" style={{ marginTop: 10, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                  <tbody>
                    <tr>
                      {SIX_DIMS.map((d) => (
                        <th key={d} style={{ width: "16.6%", textAlign: "center" }}>{d}</th>
                      ))}
                    </tr>
                    <tr>
                      {SIX_DIMS.map((d) => (
                        <td key={d} className="mono" style={{ textAlign: "center", fontWeight: 700, color: "var(--gold-dim)" }}>
                          {meta.stats?.[d] || "—"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}

            <h2 style={{ marginTop: 30, fontSize: 19 }}>关系线索</h2>
            <PersonLocalNetwork personId={row.id} />
            <Gallery items={meta.gallery || []} />
          </>
        ) : null}

        {row.type === "faction" ? (
          <>
            {row.logo_path ? (
              <div style={{ textAlign: "center", margin: "10px 0 18px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(row.logo_path)} alt={row.title} style={{ width: 132, height: 132, objectFit: "contain" }} />
              </div>
            ) : null}
            {meta.slogan ? (
              <blockquote className="md" style={{ textAlign: "center", fontSize: 16, color: "var(--gold-dim)", border: "none", background: "none" }}>
                「{meta.slogan}」
              </blockquote>
            ) : null}
            <MdView>{linkifyMarkdown(toMd(row.body_md), refs, row.id)}</MdView>
          </>
        ) : null}

        {row.type === "lore" || row.type === "cihai" ? (
          <MdView>{linkifyMarkdown(toMd(row.body_md), refs, row.id)}</MdView>
        ) : null}
      </article>
    </div>
  );
}

function PersonLocalNetwork({ personId }: { personId: string }) {
  const data = getLocalNetwork(personId);
  if (!data.edges.length) {
    return <p className="muted">该个体暂无任何登记关系。关系线索可由管理员在后台维护。</p>;
  }
  return <NetworkBoard data={data} local />;
}
