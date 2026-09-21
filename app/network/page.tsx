import Link from "next/link";
import { getNetworkData } from "../../lib/queries";
import NetworkBoard from "../../components/NetworkBoard";

export const metadata = { title: "人物关系网" };

export default function NetworkPage() {
  const data = getNetworkData();

  return (
    <div className="container fade-in" style={{ paddingTop: 28, maxWidth: 1100 }}>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h2>人物关系网 · 线索板</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          红棉线为关系线索，标签牌为关系类型；拖拽移动卡片，滚轮缩放板面，点击卡片调阅档案。
        </span>
      </div>

      {/* 桌面端：线索板 */}
      <div className="board-only">
        {data.persons.length === 0 ? (
          <p className="muted">暂无已发布的人员档案。</p>
        ) : (
          <NetworkBoard data={data} />
        )}
      </div>

      {/* 移动端降级：列表视图 */}
      <div className="list-only">
        <MobileRelationList data={data} />
      </div>
    </div>
  );
}

function MobileRelationList({ data }: { data: ReturnType<typeof getNetworkData> }) {
  if (data.persons.length === 0) return <p className="muted">暂无已发布的人员档案。</p>;
  return (
    <div className="relation-list">
      {data.persons.map((p) => {
        const rels = data.edges.filter((e) => e.source === p.id || e.target === p.id);
        return (
          <div key={p.id} style={{ marginBottom: 18 }}>
            <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 4, marginBottom: 4 }}>
              <Link href={`/archives/${p.id}/`} style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
                {p.title}
              </Link>
              {p.codename ? <span className="badge" style={{ marginLeft: 8 }}>{p.codename}</span> : null}
            </div>
            {rels.length === 0 ? (
              <div className="rel-item muted" style={{ fontSize: 13 }}>暂无登记关系</div>
            ) : (
              rels.map((e, i) => {
                const otherId = e.source === p.id ? e.target : e.source;
                const other = data.persons.find((x) => x.id === otherId);
                return (
                  <div key={i} className="rel-item">
                    <span className="badge badge-gold">{e.kind}</span>
                    {other ? (
                      <Link href={`/archives/${other.id}/`}>{other.title}</Link>
                    ) : (
                      <span className="muted">（档案 #{otherId}）</span>
                    )}
                    {e.note ? <span className="muted" style={{ fontSize: 12.5 }}>· {e.note}</span> : null}
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
