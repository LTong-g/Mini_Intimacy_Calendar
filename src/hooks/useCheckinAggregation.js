// useCheckinAggregation.js
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";

const CHECKIN_KEY = "checkin_status";

export default function useCheckinAggregation({ startDate, endDate, year }) {
  const [aggData, setAggData] = useState(null);

  useEffect(() => {
    (async () => {
      const raw = JSON.parse((await AsyncStorage.getItem(CHECKIN_KEY)) || "{}");
      // 生成时间点列表
      let points = [];
      if (year) {
        points = Array.from({ length: 12 }, (_, i) => i); // 0–11 月
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
        if (year) {
          const m = moment(dateStr);
          if (m.year() === year) {
            const idx = m.month();
            if (status & 1) tmp.tutorial[idx]++; 
            if (status & 2) tmp.weapon[idx]++; 
            if (status & 4) tmp.duo[idx]++;
          }
        } else {
          if (!moment(dateStr).isBetween(startDate, endDate, null, "[]")) return;
          const idx = points.indexOf(dateStr);
          if (idx < 0) return;
          if (status & 1) tmp.tutorial[idx]++; 
          if (status & 2) tmp.weapon[idx]++; 
          if (status & 4) tmp.duo[idx]++;
        }
      });
      setAggData({ points, counts: tmp });
    })();
  }, [startDate, endDate, year]);

  return aggData; // { points: [...], counts: { tutorial: [...], weapon: [...], duo: [...] } }
}
