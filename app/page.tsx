import Link from "next/link";
import { getFactions, latestArchives, parseMeta, stats } from "../lib/queries";
import { asset } from "../lib/assets";
import { TYPE_META, TYPE_ORDER } from "../lib/types";
import ArchiveCard from "../components/ArchiveCard";

export default function HomePage() {
  const s = stats();
  const latest = latestArchives(8);
  const factions = getFactions();

  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="org">仰山复兴计划项目组 · YRP</div>
          <h1>仰山市档案与公共安全部</h1>
          <div className="motto-line">自由 · 平衡 · 新知</div>
          <p className="hero-desc">
            本系统收录仰山市境内登记在册的谬误现象、社会面重要个体、各方势力情报与世界观基础设定。
            全部已发布档案对访客公开，欢迎自由调阅。
          </p>
        </div>
      </section>

      <div className="container">
        <div className="stat-strip">
          {TYPE_ORDER.map((t) => (
            <Link key={t} href={`/archives?type=${t}`} className="stat-box">
              <div className="num">{s.byType[t]}</div>
              <div className="label">{TYPE_META[t].label}</div>
            </Link>
          ))}
          <Link href="/random" className="stat-box" title="随机调阅一份档案">
            <div className="num">⧉</div>
            <div className="label">随机调阅</div>
          </Link>
        </div>

        <div className="section-head">
          <h2>最新发布</h2>
          <Link className="more" href="/archives">进入档案库 →</Link>
        </div>
        <div className="card-grid">
          {latest.map((a) => (
            <ArchiveCard
              key={a.id}
              id={a.id}
              archive_no={a.archive_no}
              type={a.type}
              title={a.title}
              codename={a.codename}
              updated_at={a.updated_at}
            />
          ))}
        </div>

        <div className="section-head">
          <h2>势力情报</h2>
          <Link className="more" href="/archives?type=faction">全部势力 →</Link>
        </div>
        <div className="logo-wall">
          {factions.map((f) => (
            <Link key={f.id} href={`/archives/${f.id}/`} className="card logo-cell">
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
      </div>
    </div>
  );
}
