// src/utils/statsUtils.js
import { normalizeCheckInRecord } from "./checkInStorage";

// —— 辅助：把记录解析成三项次数，兼容旧位掩码
function parseStatus(value) {
  return normalizeCheckInRecord(value);
}

// 1. 总览统计：总计、年均、各年
export function computeTotalStats(data) {
  let totalTutorial = 0,
    totalWeapon = 0,
    totalDuo = 0;
  const yearsSet = new Set();

  Object.entries(data).forEach(([dateStr, flag]) => {
    const { tutorial, weapon, duo } = parseStatus(flag);
    totalTutorial += tutorial;
    totalWeapon += weapon;
    totalDuo += duo;
    yearsSet.add(new Date(dateStr).getFullYear());
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const nYears = years.length || 1;
  const avgTut = totalTutorial / nYears;
  const avgWea = totalWeapon / nYears;
  const avgDuo = totalDuo / nYears;

  const rows = [
    {
      label: "总计",
      tutorial: totalTutorial,
      weapon: totalWeapon,
      duo: totalDuo,
    },
    {
      label: "年均",
      tutorial: avgTut.toFixed(2),
      weapon: avgWea.toFixed(2),
      duo: avgDuo.toFixed(2),
    },
  ];

  years.forEach((year) => {
    let yTut = 0,
      yWea = 0,
      yD = 0;
    Object.entries(data).forEach(([dateStr, flag]) => {
      if (new Date(dateStr).getFullYear() === year) {
        const st = parseStatus(flag);
        yTut += st.tutorial;
        yWea += st.weapon;
        yD += st.duo; // ← 这里必须用 yD，而不是未定义的 y
      }
    });
    rows.push({ label: `${year}`, tutorial: yTut, weapon: yWea, duo: yD });
  });

  return rows;
}

// 2. 年度统计：总计、月均、月份明细
export function computeYearStats(data, year) {
  let totalTutorial = 0,
    totalWeapon = 0,
    totalDuo = 0;
  const monthMap = {};
  const today = new Date();
  const maxMonth =
    year === today.getFullYear()
      ? today.getMonth() + 1
      : 12;

  Object.entries(data).forEach(([dateStr, flag]) => {
    const d = new Date(dateStr);
    if (d.getFullYear() === year) {
      const { tutorial, weapon, duo } = parseStatus(flag);
      totalTutorial += tutorial;
      totalWeapon += weapon;
      totalDuo += duo;
      const m = d.getMonth() + 1;
      if (!monthMap[m]) monthMap[m] = { tutorial: 0, weapon: 0, duo: 0 };
      monthMap[m].tutorial += tutorial;
      monthMap[m].weapon += weapon;
      monthMap[m].duo += duo;
    }
  });

  const avgTut = totalTutorial / maxMonth;
  const avgWea = totalWeapon / maxMonth;
  const avgDuo = totalDuo / maxMonth;

  const rows = [
    {
      label: "总计",
      tutorial: totalTutorial,
      weapon: totalWeapon,
      duo: totalDuo,
    },
    {
      label: "月均",
      tutorial: avgTut.toFixed(2),
      weapon: avgWea.toFixed(2),
      duo: avgDuo.toFixed(2),
    },
  ];

  for (let m = maxMonth; m >= 1; m--) {
    const c = monthMap[m] || { tutorial: 0, weapon: 0, duo: 0 };
    rows.push({
      label: `${m}月`,
      tutorial: c.tutorial,
      weapon: c.weapon,
      duo: c.duo,
    });
  }

  return rows;
}

// 3. 自定义区间统计（日 / 月 / 年）
export function computeCustomStats(data, startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const msPerDay = 1000 * 3600 * 24;
  // 间隔天数
  const spanDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;

  // 累加总数
  let totalT = 0,
    totalW = 0,
    totalD = 0;
  const monthMap = {};
  const yearMap = {};

  Object.entries(data).forEach(([dateStr, flag]) => {
    const dt = new Date(dateStr);
    if (dt < start || dt > end) return;
    const { tutorial: tut, weapon: wea, duo } = parseStatus(flag);

    totalT += tut;
    totalW += wea;
    totalD += duo;

    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;

    // 按月聚合。自定义区间可能跨年，必须用年月作为键避免同名月份合并。
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { year: y, month: m, tutorial: 0, weapon: 0, duo: 0 };
    }
    monthMap[monthKey].tutorial += tut;
    monthMap[monthKey].weapon += wea;
    monthMap[monthKey].duo += duo;

    // 按年聚合
    if (!yearMap[y]) yearMap[y] = { tutorial: 0, weapon: 0, duo: 0 };
    yearMap[y].tutorial += tut;
    yearMap[y].weapon += wea;
    yearMap[y].duo += duo;
  });

  // 日均
  const dailyAvgT = totalT / spanDays;
  const dailyAvgW = totalW / spanDays;
  const dailyAvgD = totalD / spanDays;

  // 1) <=31天：日统计
  if (spanDays <= 31) {
    return [
      { label: "总计", tutorial: totalT, weapon: totalW, duo: totalD },
      {
        label: "日均",
        tutorial: dailyAvgT.toFixed(2),
        weapon: dailyAvgW.toFixed(2),
        duo: dailyAvgD.toFixed(2),
      },
    ];
  }
  // 2) 32～366天：月统计，用日均×30 作为月均
  else if (spanDays <= 366) {
    const monthlyAvgT = dailyAvgT * 30;
    const monthlyAvgW = dailyAvgW * 30;
    const monthlyAvgD = dailyAvgD * 30;

    const rows = [
      { label: "总计", tutorial: totalT, weapon: totalW, duo: totalD },
      {
        label: "日均",
        tutorial: dailyAvgT.toFixed(2),
        weapon: dailyAvgW.toFixed(2),
        duo: dailyAvgD.toFixed(2),
      },
      {
        label: "月均",
        tutorial: monthlyAvgT.toFixed(2),
        weapon: monthlyAvgW.toFixed(2),
        duo: monthlyAvgD.toFixed(2),
      },
    ];
    const isCrossYear = start.getFullYear() !== end.getFullYear();
    // 仅显示有记录的月份，按真实年月从近到远排序
    Object.keys(monthMap)
      .sort((a, b) => b.localeCompare(a))
      .forEach((monthKey) => {
        const c = monthMap[monthKey];
        rows.push({
          label: isCrossYear ? `${c.year}年${c.month}月` : `${c.month}月`,
          tutorial: c.tutorial,
          weapon: c.weapon,
          duo: c.duo,
        });
      });
    return rows;
  }
  // 3) >366天：年统计，用日均×365 作为年均
  else {
    const monthlyAvgT = dailyAvgT * 30;
    const monthlyAvgW = dailyAvgW * 30;
    const monthlyAvgD = dailyAvgD * 30;
    const yearlyAvgT = dailyAvgT * 365;
    const yearlyAvgW = dailyAvgW * 365;
    const yearlyAvgD = dailyAvgD * 365;

    const years = Object.keys(yearMap)
      .map((y) => Number(y))
      .sort((a, b) => b - a);
    const rows = [
      { label: "总计", tutorial: totalT, weapon: totalW, duo: totalD },
      {
        label: "日均",
        tutorial: dailyAvgT.toFixed(2),
        weapon: dailyAvgW.toFixed(2),
        duo: dailyAvgD.toFixed(2),
      },
      {
        label: "月均",
        tutorial: monthlyAvgT.toFixed(2),
        weapon: monthlyAvgW.toFixed(2),
        duo: monthlyAvgD.toFixed(2),
      },
      {
        label: "年均",
        tutorial: yearlyAvgT.toFixed(2),
        weapon: yearlyAvgW.toFixed(2),
        duo: yearlyAvgD.toFixed(2),
      },
    ];
    years.forEach((y) => {
      const c = yearMap[y];
      rows.push({
        label: `${y}`,
        tutorial: c.tutorial,
        weapon: c.weapon,
        duo: c.duo,
      });
    });
    return rows;
  }
}
