// YearLineChart.js
import React from "react";
import useCheckinAggregation from "../hooks/useCheckinAggregation";
import LineChartBase from "./LineChartBase";

export default function YearLineChart({ year }) {
  const agg = useCheckinAggregation({ year });
  if (!agg) return null;
  return (
    <LineChartBase
      title={`${year}年 记录变化趋势`}
      points={agg.points}
      counts={agg.counts}
      xType="point"
    />
  );
}
