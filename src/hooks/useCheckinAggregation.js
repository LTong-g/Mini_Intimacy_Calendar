// useCheckinAggregation.js
import { useState, useEffect } from "react";
import moment from "moment";
import { getEffectiveCheckInData, normalizeCheckInRecord } from "../utils/checkInStorage";

export default function useCheckinAggregation({ startDate, endDate, year }) {
  const [aggData, setAggData] = useState(null);

  useEffect(() => {
    (async () => {
      const raw = await getEffectiveCheckInData();
      // 生成时间点列表
      let points = [];
      if (year) {
        points = Array.from({ length: 12 }, (_, i) => i + 1);
      } else {
        const s = moment(startDate), e = moment(endDate);
        for (let m = s.clone(); m.isSameOrBefore(e); m.add(1, "days")) {
          points.push(m.format("YYYY-MM-DD"));
        }
      }
      // 初始化计数
      const tmp = { tutorial: [], weapon: [], duo: [] };
      points.forEach((p, idx) => {
        tmp.tutorial[idx] = 0;
        tmp.weapon[idx]   = 0;
        tmp.duo[idx]      = 0;
      });
      // 聚合统计
      Object.entries(raw).forEach(([dateStr, status]) => {
        const record = normalizeCheckInRecord(status);
        if (year) {
          const m = moment(dateStr);
          if (m.year() === year) {
            const idx = m.month();
            tmp.tutorial[idx] += record.tutorial;
            tmp.weapon[idx] += record.weapon;
            tmp.duo[idx] += record.duo;
          }
        } else {
          if (!moment(dateStr).isBetween(startDate, endDate, null, "[]")) return;
          const idx = points.indexOf(dateStr);
          if (idx < 0) return;
          tmp.tutorial[idx] += record.tutorial;
          tmp.weapon[idx] += record.weapon;
          tmp.duo[idx] += record.duo;
        }
      });
      setAggData({ points, counts: tmp });
    })();
  }, [startDate, endDate, year]);

  return aggData; // { points: [...], counts: { tutorial: [...], weapon: [...], duo: [...] } }
}
