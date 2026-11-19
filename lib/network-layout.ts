// 关系网静态分组布局：按阵营成簇，确定性计算坐标，无物理模拟。
// 同一批输入永远得到同一批坐标；新增人员自动落入所属阵营簇的下一个空位。

export interface LayoutNode {
  id: string;
  kind: "person" | "faction";
  faction?: string | null;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutZone {
  key: string; // 阵营 slug；无阵营人员归 "__none__"
  x: number;
  y: number;
  w: number;
  h: number;
  memberIds: string[];
  hasFactionNode: boolean;
}

export interface NetworkLayout {
  pos: Map<string, LayoutPoint>;
  zones: LayoutZone[];
}

const NONE_KEY = "__none__";

export function computeNetworkLayout(nodes: LayoutNode[], opts: { local: boolean }): NetworkLayout {
  const { local } = opts;
  // 卡片实际尺寸（含边框余量），与 NetworkBoard 的 rectCollide 口径一致
  const PERSON = local ? { w: 116, h: 140 } : { w: 140, h: 204 };
  const FACTION = local ? { w: 120, h: 152 } : { w: 144, h: 176 };
  const ZONE_PAD_X = 30;
  const ZONE_PAD_TOP = 40; // 顶部留出区域标签的空间
  const ZONE_PAD_BOTTOM = 26;
  const GAP = 16; // 簇内成员网格间距
  const FACTION_GAP = 24; // 阵营节点与成员网格的间距
  const ZONE_GAP_X = 46;
  const ZONE_GAP_Y = 60;
  const ROW_WIDTH = local ? 980 : 1340; // 世界坐标下每行阵营区域的目标宽度

  const persons = nodes.filter((n) => n.kind === "person");
  const slugOf = (n: LayoutNode) => (n.faction ? n.faction : NONE_KEY);

  // 按阵营分组；无阵营人员单独成簇，固定排在最后
  const groups = new Map<string, LayoutNode[]>();
  for (const p of persons) {
    const key = slugOf(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  for (const g of groups.values()) g.sort((a, b) => a.id.localeCompare(b.id));
  // 无成员的阵营也独占一个区域（仅放阵营节点），参与正常排布
  for (const n of nodes) {
    if (n.kind === "faction" && n.faction && !groups.has(n.faction)) groups.set(n.faction, []);
  }

  const factionNodeOf = new Map<string, LayoutNode>();
  for (const n of nodes) {
    if (n.kind === "faction") factionNodeOf.set(n.faction ?? NONE_KEY, n);
  }

  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === NONE_KEY) return 1;
    if (b === NONE_KEY) return -1;
    const d = groups.get(b)!.length - groups.get(a)!.length;
    return d !== 0 ? d : a.localeCompare(b);
  });

  // 先算出每个簇的尺寸
  const dims = new Map<string, { w: number; h: number; cols: number; rows: number; gridW: number; gridH: number }>();
  for (const key of orderedKeys) {
    const m = groups.get(key)!.length;
    const cols = m === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(Math.sqrt(m))));
    const rows = m === 0 ? 0 : Math.ceil(m / cols);
    const gridW = rows ? cols * PERSON.w + (cols - 1) * GAP : 0;
    const gridH = rows ? rows * PERSON.h + (rows - 1) * GAP : 0;
    const hasF = factionNodeOf.has(key);
    const w = Math.max(gridW, hasF ? FACTION.w : 0) + ZONE_PAD_X * 2;
    const h = ZONE_PAD_TOP + (hasF ? FACTION.h + FACTION_GAP : 0) + gridH + ZONE_PAD_BOTTOM;
    dims.set(key, { w, h, cols, rows, gridW, gridH });
  }

  // 簇按行打包，行内水平居中于 0，整列垂直居中于 0
  interface Placed { key: string; x: number; y: number }
  const placed: Placed[] = [];
  const rowHeight: number[] = [];
  let cx = -ZONE_GAP_X; // 首个簇会立即加上间距归零
  let row = 0;
  for (const key of orderedKeys) {
    const d = dims.get(key)!;
    if (cx > -ZONE_GAP_X && cx + ZONE_GAP_X + d.w > ROW_WIDTH) {
      row += 1;
      cx = -ZONE_GAP_X;
    }
    cx += ZONE_GAP_X;
    placed.push({ key, x: cx, y: row });
    rowHeight[row] = Math.max(rowHeight[row] ?? 0, d.h);
    cx += d.w;
  }
  const totalH = rowHeight.reduce((s, h) => s + h, 0) + ZONE_GAP_Y * Math.max(rowHeight.length - 1, 0);
  const rowY: number[] = [];
  {
    let y = -totalH / 2;
    for (let r = 0; r < rowHeight.length; r++) {
      rowY.push(y);
      y += rowHeight[r] + ZONE_GAP_Y;
    }
  }
  const rowWidth: number[] = [];
  for (let r = 0; r < rowHeight.length; r++) {
    let w = -ZONE_GAP_X;
    for (const p of placed) if (p.y === r) w += ZONE_GAP_X + dims.get(p.key)!.w;
    rowWidth[r] = w;
  }

  const pos = new Map<string, LayoutPoint>();
  const zones: LayoutZone[] = [];
  for (const p of placed) {
    const d = dims.get(p.key)!;
    const zx = p.x - rowWidth[p.y] / 2;
    const zy = rowY[p.y];
    zones.push({
      key: p.key,
      x: zx,
      y: zy,
      w: d.w,
      h: d.h,
      memberIds: groups.get(p.key)!.map((n) => n.id),
      hasFactionNode: factionNodeOf.has(p.key),
    });

    // 成员网格在区域内水平居中；有阵营节点时整体下移
    let contentTop = zy + ZONE_PAD_TOP + (factionNodeOf.has(p.key) ? FACTION.h + FACTION_GAP : 0);
    // 垂直方向上让网格与区域顶部留白保持视觉平衡
    contentTop += Math.max(0, (d.h - (contentTop - zy) - d.gridH) / 2) * 0.4;
    const gridLeft = zx + (d.w - d.gridW) / 2;
    groups.get(p.key)!.forEach((n, i) => {
      const col = i % d.cols;
      const r = Math.floor(i / d.cols);
      pos.set(n.id, {
        x: gridLeft + col * (PERSON.w + GAP) + PERSON.w / 2,
        y: contentTop + r * (PERSON.h + GAP) + PERSON.h / 2,
      });
    });

    const fNode = factionNodeOf.get(p.key);
    if (fNode) {
      pos.set(fNode.id, { x: zx + d.w / 2, y: zy + ZONE_PAD_TOP + FACTION.h / 2 });
    }
  }

  // 兜底：挂在未知阵营的 faction 节点（数据异常时）放原点
  for (const n of nodes) {
    if (n.kind === "faction" && !pos.has(n.id)) pos.set(n.id, { x: 0, y: 0 });
  }

  return { pos, zones };
}
