// src/utils/statsUtils.js

// 1. 总览统计
export function computeTotalStats(data) {
  let totalTutorial = 0, totalWeapon = 0, totalDuo = 0;
  const yearsSet = new Set();

  Object.entries(data).forEach(([dateStr, counts]) => {
    const d = new Date(dateStr);
    yearsSet.add(d.getFullYear());
    totalTutorial += counts.tutorial || 0;
    totalWeapon  += counts.weapon  || 0;
    totalDuo     += counts.duo     || 0;
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const numYears = years.length || 1;
  const avgTut = totalTutorial / numYears;
  const avgW   = totalWeapon  / numYears;
  const avgD   = totalDuo     / numYears;

  const rows = [
    { label: '总计', tutorial: totalTutorial, weapon: totalWeapon, duo: totalDuo },
    { label: '年均', tutorial: avgTut.toFixed(2),    weapon: avgW.toFixed(2),    duo: avgD.toFixed(2) }
  ];

  years.forEach(year => {
    let yt = 0, yw = 0, yd = 0;
    Object.entries(data).forEach(([dateStr, counts]) => {
      if (new Date(dateStr).getFullYear() === year) {
        yt += counts.tutorial || 0;
        yw += counts.weapon  || 0;
        yd += counts.duo     || 0;
      }
    });
    rows.push({ label: `${year}`, tutorial: yt, weapon: yw, duo: yd });
  });

  return rows;
}

// 2. 指定年份统计
export function computeYearStats(data, year) {
  let totalTutorial = 0, totalWeapon = 0, totalDuo = 0;
  const monthMap = {};

  Object.entries(data).forEach(([dateStr, counts]) => {
    const d = new Date(dateStr);
    if (d.getFullYear() === year) {
      totalTutorial += counts.tutorial || 0;
      totalWeapon  += counts.weapon  || 0;
      totalDuo     += counts.duo     || 0;
      const m = d.getMonth() + 1;
      if (!monthMap[m]) monthMap[m] = { tutorial: 0, weapon: 0, duo: 0 };
      monthMap[m].tutorial += counts.tutorial || 0;
      monthMap[m].weapon   += counts.weapon  || 0;
      monthMap[m].duo      += counts.duo     || 0;
    }
  });

  const avgTut = totalTutorial / 12;
  const avgW   = totalWeapon  / 12;
  const avgD   = totalDuo     / 12;

  const rows = [
    { label: '总计', tutorial: totalTutorial, weapon: totalWeapon, duo: totalDuo },
    { label: '月均', tutorial: avgTut.toFixed(2),    weapon: avgW.toFixed(2),    duo: avgD.toFixed(2) }
  ];

  for (let m = 12; m >= 1; m--) {
    const c = monthMap[m] || { tutorial: 0, weapon: 0, duo: 0 };
    rows.push({ label: `${m}月`, tutorial: c.tutorial, weapon: c.weapon, duo: c.duo });
  }

  return rows;
}

// 3. 自定义区间统计
export function computeCustomStats(data, startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end   = new Date(endDateStr);
  const spanMs   = end.getTime() - start.getTime();
  const spanDays = Math.ceil(spanMs / (1000 * 3600 * 24)) + 1;

  // 日统计
  if (spanDays <= 31) {
    let t = 0, w = 0, d = 0;
    Object.entries(data).forEach(([dateStr, counts]) => {
      const dt = new Date(dateStr);
      if (dt >= start && dt <= end) {
        t += counts.tutorial || 0;
        w += counts.weapon  || 0;
        d += counts.duo     || 0;
      }
    });
    return [
      { label: '总计', tutorial: t, weapon: w, duo: d },
      { label: '日均', tutorial: (t / spanDays).toFixed(2), weapon: (w / spanDays).toFixed(2), duo: (d / spanDays).toFixed(2) }
    ];
  }
  // 月统计
  else if (spanDays <= 366) {
    let t = 0, w = 0, d = 0;
    const monthMap = {};

    Object.entries(data).forEach(([dateStr, counts]) => {
      const dt = new Date(dateStr);
      if (dt >= start && dt <= end) {
        const m = dt.getMonth() + 1;
        if (!monthMap[m]) monthMap[m] = { tutorial: 0, weapon: 0, duo: 0 };
        monthMap[m].tutorial += counts.tutorial || 0;
        monthMap[m].weapon   += counts.weapon  || 0;
        monthMap[m].duo      += counts.duo     || 0;
        t += counts.tutorial || 0;
        w += counts.weapon  || 0;
        d += counts.duo     || 0;
      }
    });

    const months = Object.keys(monthMap)
      .map(m => Number(m))
      .sort((a, b) => b - a);
    const avgTut = t / months.length;
    const avgW   = w / months.length;
    const avgD   = d / months.length;

    const rows = [
      { label: '总计', tutorial: t, weapon: w, duo: d },
      { label: '月均', tutorial: avgTut.toFixed(2), weapon: avgW.toFixed(2), duo: avgD.toFixed(2) }
    ];
    months.forEach(m => {
      const c = monthMap[m];
      rows.push({ label: `${m}月`, tutorial: c.tutorial, weapon: c.weapon, duo: c.duo });
    });
    return rows;
  }
  // 年统计
  else {
    let t = 0, w = 0, d = 0;
    const yearMap = {};

    Object.entries(data).forEach(([dateStr, counts]) => {
      const dt = new Date(dateStr);
      if (dt >= start && dt <= end) {
        const y = dt.getFullYear();
        if (!yearMap[y]) yearMap[y] = { tutorial: 0, weapon: 0, duo: 0 };
        yearMap[y].tutorial += counts.tutorial || 0;
        yearMap[y].weapon   += counts.weapon  || 0;
        yearMap[y].duo      += counts.duo     || 0;
        t += counts.tutorial || 0;
        w += counts.weapon  || 0;
        d += counts.duo     || 0;
      }
    });

    const years = Object.keys(yearMap)
      .map(y => Number(y))
      .sort((a, b) => b - a);
    const avgTut = t / years.length;
    const avgW   = w / years.length;
    const avgD   = d / years.length;

    const rows = [
      { label: '总计', tutorial: t, weapon: w, duo: d },
      { label: '年均', tutorial: avgTut.toFixed(2), weapon: avgW.toFixed(2), duo: avgD.toFixed(2) }
    ];
    years.forEach(y => {
      const c = yearMap[y];
      rows.push({ label: `${y}`, tutorial: c.tutorial, weapon: c.weapon, duo: c.duo });
    });
    return rows;
  }
}
