// TotalLineChart.js
import React, { useMemo } from "react";
import useCheckinData from "../hooks/useCheckinData";
import { computeTotalStats } from "../utils/statsUtils";
import LineChartBase from "../../../shared/components/charts/LineChartBase";

export default function TotalLineChart() {
  const data = useCheckinData();

  const agg = useMemo(() => {
    if (!data) return null;

    // 1. 拿到按年统计的 rows（computeTotalStats 返回：[总计, 年均, 2025, 2024, …]）
    const rows = computeTotalStats(data);

    // 2. 只保留年份那几项，并转成数字，再按年份升序排序
    const yearRows = rows
      .filter(row => /^\d{4}$/.test(row.label))
      .map(row => ({
        year:       Number(row.label),
        tutorial:   Number(row.tutorial),
        weapon:     Number(row.weapon),
        duo:        Number(row.duo),
      }))
      .sort((a, b) => a.year - b.year);

    // 3. 构造 LineChartBase 所需的 points 和 counts
    const points = yearRows.map(r => r.year);
    const counts = {
      tutorial: yearRows.map(r => r.tutorial),
      weapon:   yearRows.map(r => r.weapon),
      duo:      yearRows.map(r => r.duo),
    };

    return { points, counts };
  }, [data]);

  if (!agg) return null;

  return (
    <LineChartBase
      title="年度记录趋势"
      points={agg.points}
      counts={agg.counts}
      xType="point"
    />
  );
}
