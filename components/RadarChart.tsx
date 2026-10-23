"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import { SIX_DIMS } from "../lib/types";

const GRADE_VALUE: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const GOLD = "#C29B40";

export default function RadarChart({ stats, height = 340 }: { stats: Record<string, string>; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const values = SIX_DIMS.map((d) => GRADE_VALUE[stats?.[d] || ""] ?? 0);
    chart.setOption({
      radar: {
        indicator: SIX_DIMS.map((d) => ({ name: d, max: 5 })),
        radius: "62%",
        center: ["50%", "52%"],
        axisName: { color: "#7d7a70", fontSize: 13, fontFamily: "inherit" },
        splitArea: {
          areaStyle: {
            color: ["rgba(194,155,64,0.02)", "rgba(194,155,64,0.05)", "rgba(194,155,64,0.02)", "rgba(194,155,64,0.05)", "rgba(194,155,64,0.09)"],
          },
        },
        splitLine: { lineStyle: { color: "rgba(242,242,240,0.14)" } },
        axisLine: { lineStyle: { color: "rgba(242,242,240,0.18)" } },
      },
      tooltip: {
        trigger: "item",
        formatter: () =>
          SIX_DIMS.map((d, i) => `${d}：${stats?.[d] || "—"}`).join("<br/>"),
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: values,
              name: "工作能力评定",
              areaStyle: { color: "rgba(194,155,64,0.35)" },
              lineStyle: { color: GOLD, width: 2.5 },
              itemStyle: { color: GOLD },
              symbol: "circle",
              symbolSize: 5,
              label: { show: false },
            },
          ],
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stats)]);

  return <div ref={ref} style={{ width: "100%", height, maxWidth: 460, margin: "0 auto" }} />;
}
