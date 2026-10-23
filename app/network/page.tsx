import Link from "next/link";
import { getNetworkData } from "../../lib/queries";
import { SITE_COPY } from "../../lib/site-copy";
import NetworkBoard from "../../components/NetworkBoard";

export const metadata = { title: "人物关系网" };

export default function NetworkPage() {
  const data = getNetworkData();
  const nc = SITE_COPY.network;

  return (
    <div className="container fade-in">
      <header className="page-head">
        <div className="eyebrow">{nc.eyebrow}</div>
        <h1>{nc.title}</h1>
        <p className="ph-count">{nc.intro}</p>
      </header>

      {/* 桌面端：态势板 */}
      <div className="board-only">
        {data.persons.length === 0 ? (
          <div className="list-empty">{nc.emptyPersons}</div>
        ) : (
          <NetworkBoard data={data} />
        )}
      </div>

      {/* 移动端降级：情报列表 */}
      <div className="list-only">
        <MobileRelationList data={data} />
      </div>
    </div>
  );
}

function MobileRelationList({ data }: { data: ReturnType<typeof getNetworkData> }) {
  const nc = SITE_COPY.network;
  if (data.persons.length === 0) return <div className="list-empty">{nc.emptyPersons}</div>;
  return (
    <div className="relation-list">
      {data.persons.map((p) => {
        const rels = data.edges.filter((e) => e.source === p.id || e.target === p.id);
        return (
          <div key={p.id} className="rel-group">
            <div className="rel-head">
              <Link href={`/archives/${p.id}/`} className="rh-name">{p.title}</Link>
              <span className="rh-no">{p.id}</span>
              {p.codename ? <span className="badge">{p.codename}</span> : null}
            </div>
            {rels.length === 0 ? (
              <div className="rel-item muted">{nc.emptyRelations}</div>
            ) : (
              rels.map((e, i) => {
                const otherId = e.source === p.id ? e.target : e.source;
                const other = data.persons.find((x) => x.id === otherId);
                return (
                  <div key={i} className="rel-item">
                    <span className="rel-kind">{e.kind || "—"}</span>
                    {other ? (
                      <Link href={`/archives/${other.id}/`}>{other.title}</Link>
                    ) : (
                      <span className="muted">{nc.archiveNo(otherId)}</span>
                    )}
                    {e.note ? <span className="rel-note">· {e.note}</span> : null}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
