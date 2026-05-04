// CustomLineChart.js
import React from "react";
import moment from "moment";
import useCheckinAggregation from "../hooks/useCheckinAggregation";
import LineChartBase from "./LineChartBase";

export default function CustomLineChart({ startDate, endDate }) {
  // 获取原始按天聚合的数据
  const agg = useCheckinAggregation({ startDate, endDate });
  if (!agg) return null;

  const { points, counts } = agg;
  // 构造原始数组 [{ date, tutorial, weapon, duo }, …]
  const raw = points.map((p, i) => ({
    date: moment(p).toDate(),
    tutorial: counts.tutorial[i] || 0,
    weapon:   counts.weapon[i]   || 0,
    duo:      counts.duo[i]      || 0,
  }));

  // 下采样到最多 12 个点
  let dsArr = raw;
  let axisLabels = points;
  let touchAxisLabels = null;
  if (raw.length > 12) {
    const groupSize = Math.ceil(raw.length / 12);
    const grouped = [];
    const labelDates = [];
    const groupRangeLabels = [];
    for (let i = 0; i < raw.length; i += groupSize) {
      const slice = raw.slice(i, i + groupSize);
      const middleIdx = Math.ceil(slice.length / 2) - 1;
      const rangeStart = moment(slice[0].date).format("YYYY-MM-DD");
      const rangeEnd = moment(slice[slice.length - 1].date).format("YYYY-MM-DD");
      const sumTut = slice.reduce((s, v) => s + v.tutorial, 0);
      const sumWea = slice.reduce((s, v) => s + v.weapon, 0);
      const sumDuo = slice.reduce((s, v) => s + v.duo, 0);
      grouped.push({
        date:      slice[middleIdx].date,
        tutorial:  sumTut,
        weapon:    sumWea,
        duo:       sumDuo,
      });
      labelDates.push(rangeStart);
      groupRangeLabels.push(rangeStart === rangeEnd ? [rangeStart] : [rangeStart, rangeEnd]);
    }
    const endLabel = points[points.length - 1];
    if (labelDates[labelDates.length - 1] !== endLabel) {
      labelDates.push(endLabel);
    }
    dsArr = grouped;
    axisLabels = labelDates;
    touchAxisLabels = groupRangeLabels;
  }

  // 分离下采样后的 x 轴和 y 轴数据
  const dsPoints = dsArr.map(v => v.date);
  const dsCounts = {
    tutorial: dsArr.map(v => v.tutorial),
    weapon:   dsArr.map(v => v.weapon),
    duo:      dsArr.map(v => v.duo),
  };

  return (
    <LineChartBase
      title={`${startDate} 至 ${endDate} 记录趋势`}
      points={dsPoints}
      counts={dsCounts}
      xType="time"
      xDomain={[startDate, endDate]}
      xLabels={axisLabels}
      touchXLabels={touchAxisLabels}
    />
  );
}
