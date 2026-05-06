// YearLineChart.js
import React from "react";
import useCheckinAggregation from "../hooks/useCheckinAggregation";
import LineChartBase from "./LineChartBase";
import moment from "moment";

export default function YearLineChart({ year }) {
  const agg = useCheckinAggregation({ year });
  if (!agg) return null;
  const hiddenPointIndexes =
    year === moment().year()
      ? Array.from(
          { length: 12 - (moment().month() + 1) },
          (_, index) => moment().month() + 1 + index
        )
      : [];

  return (
    <LineChartBase
      title={`${year}年 记录变化趋势`}
      points={agg.points}
      counts={agg.counts}
      xType="point"
      hiddenPointIndexes={hiddenPointIndexes}
    />
  );
}
