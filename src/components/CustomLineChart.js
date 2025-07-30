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
  if (raw.length > 12) {
    const groupSize = Math.ceil(raw.length / 12);
    // 拷贝并在头部填一个哑数据以对齐分组
    const temp = [...raw];
    if (temp.length % groupSize !== 0) {
      temp.unshift({
        date:   moment(startDate).subtract(1, "days").toDate(),
        tutorial: 0, weapon: 0, duo: 0
      });
    }
    const grouped = [];
    for (let i = 0; i < temp.length; i += groupSize) {
      const slice = temp.slice(i, i + groupSize);
      const sumTut = slice.reduce((s, v) => s + v.tutorial, 0);
      const sumWea = slice.reduce((s, v) => s + v.weapon, 0);
      const sumDuo = slice.reduce((s, v) => s + v.duo, 0);
      grouped.push({
        date:      slice[0].date,
        tutorial:  sumTut,
        weapon:    sumWea,
        duo:       sumDuo,
      });
    }
    dsArr = grouped;
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
    />
  );
}
