import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, PanResponder } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import Svg, { G, Path, Line, Circle, Text as SvgText } from "react-native-svg";
import * as d3Shape from "d3-shape";
import { scaleTime, scaleLinear } from "d3-scale";

const CHECKIN_KEY = "checkin_status";
const { width: screenWidth } = Dimensions.get("window");
const chartHeight = 200;
const margin = { top: 16, bottom: 32, left: 16, right: 40 };
const innerWidth = screenWidth - margin.left - margin.right;
const innerHeight = chartHeight - margin.top - margin.bottom;

const colors = { tutorial: "#F57F17", weapon: "#0277BD", duo: "#C62828" };

export default function DateRangeLineChart({ startDate, endDate }) {
  const [data, setData] = useState({ tutorial: {}, weapon: {}, duo: {} });
  const [dates, setDates] = useState([]);
  const [touchIndex, setTouchIndex] = useState(null);

  // Load and aggregate data
  useEffect(() => {
    setTouchIndex(null);
    const s = moment(startDate);
    const e = moment(endDate);
    const dayList = [];
    for (let m = s.clone(); m.isSameOrBefore(e); m.add(1, 'days')) {
      dayList.push(m.format("YYYY-MM-DD"));
    }
    setDates(dayList);
    (async () => {
      const rawStr = await AsyncStorage.getItem(CHECKIN_KEY);
      const raw = rawStr ? JSON.parse(rawStr) : {};
      const tmp = { tutorial: {}, weapon: {}, duo: {} };
      dayList.forEach(d => (tmp.tutorial[d] = tmp.weapon[d] = tmp.duo[d] = 0));
      Object.entries(raw).forEach(([dateStr, status]) => {
        if (!moment(dateStr).isBetween(s, e, null, '[]')) return;
        if (status & 1) tmp.tutorial[dateStr]++;
        if (status & 2) tmp.weapon[dateStr]++;
        if (status & 4) tmp.duo[dateStr]++;
      });
      setData(tmp);
    })();
  }, [startDate, endDate]);

  // Early return
  if (dates.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{`${startDate} 至 ${endDate} 记录趋势`}</Text>
        <Text style={styles.loading}>加载中...</Text>
      </View>
    );
  }

  // Build counts array [{date, tutorial, weapon, duo}]
  let counts = dates.map(d => ({
    date: moment(d).toDate(),
    tutorial: data.tutorial[d] || 0,
    weapon:   data.weapon[d]   || 0,
    duo:      data.duo[d]      || 0,
  }));

  // Downsample to <=12 points
  if (counts.length > 12) {
    const groupSize = Math.ceil(counts.length / 12);
    // pad to multiple of groupSize by unshifting dummy
    if (counts.length % groupSize !== 0) {
      counts.unshift({ date: moment(startDate).subtract(1, 'days').toDate(), tutorial: 0, weapon: 0, duo: 0 });
    }
    const grouped = [];
    for (let i = 0; i < counts.length; i += groupSize) {
      const slice = counts.slice(i, i + groupSize);
      const sumTut = slice.reduce((sum, v) => sum + v.tutorial, 0);
      const sumWea = slice.reduce((sum, v) => sum + v.weapon, 0);
      const sumDuo = slice.reduce((sum, v) => sum + v.duo, 0);
      grouped.push({ date: slice[0].date, tutorial: sumTut, weapon: sumWea, duo: sumDuo });
    }
    counts = grouped;
  }

  // Generate downsampled dates and series
  const dsDates = counts.map(c => c.date);
  const series = ["tutorial", "weapon", "duo"].map(key =>
    counts.map(c => ({ date: c.date, value: c[key], key }))
  );

  // Scales
  const xScale = scaleTime()
    .domain([moment(startDate).toDate(), moment(endDate).toDate()])
    .range([0, innerWidth]);
  const maxY = Math.max(...series.flat().map(pt => pt.value), 1);
  const yScale = scaleLinear().domain([0, maxY]).range([innerHeight, 0]);
  const lineGen = d3Shape.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(d3Shape.curveMonotoneX);

  // Touch responder
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: ({ nativeEvent }) => handleTouch(nativeEvent.locationX),
    onPanResponderMove: ({ nativeEvent }) => handleTouch(nativeEvent.locationX),
  });
  function handleTouch(x) {
    const localX = x - margin.left;
    if (localX < 0 || localX > innerWidth) return setTouchIndex(null);
    const xCoords = dsDates.map(d => xScale(d));
    let closest = 0;
    let minDiff = Infinity;
    xCoords.forEach((xc, i) => {
      const diff = Math.abs(xc - localX);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    });
    setTouchIndex(closest);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{`${startDate} 至 ${endDate} 记录趋势`}</Text>
      <Svg width={screenWidth} height={chartHeight} style={{ backgroundColor: '#fff' }} {...pan.panHandlers}>
        <G x={margin.left} y={margin.top}>
          {/* X 轴：下采样刻度 */}
          {dsDates.map((d, i) => (
            <SvgText
              key={i}
              x={xScale(d)}
              y={innerHeight + 20}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {moment(d).format('MM-DD')}
            </SvgText>
          ))}
          {/* Y 轴刻度 */}
          {yScale.ticks(5).map((t, i) => (
            <G key={i}>
              <SvgText x={-8} y={yScale(t)} fontSize="10" fill="#666" textAnchor="end">{t}</SvgText>
              <Line x1={0} y1={yScale(t)} x2={innerWidth} y2={yScale(t)} stroke="#eee" strokeWidth={1} />
            </G>
          ))}
          {/* 折线 */}
          {series.map(s => (
            <Path key={s[0].key} d={lineGen(s)} fill="none" stroke={colors[s[0].key]} strokeWidth={2} />
          ))}
          {/* 触摸高亮 */}
          {touchIndex !== null && (
            <G>
              <Line x1={xScale(dsDates[touchIndex])} y1={0} x2={xScale(dsDates[touchIndex])} y2={innerHeight} stroke="#aaa" strokeDasharray={[4, 4]} />
              {series.map(s => {
                const pt = s[touchIndex];
                if (!pt) return null;
                return (
                  <G key={s[0].key}>
                    <Circle cx={xScale(pt.date)} cy={yScale(pt.value)} r={4} fill={colors[s[0].key]} stroke="#fff" strokeWidth={1} />
                    <SvgText x={xScale(pt.date) + 6} y={yScale(pt.value) - 6} fontSize="12" fontWeight="bold" fill={colors[s[0].key]}> {pt.value} </SvgText>
                  </G>
                );
              })}
            </G>
          )}
        </G>
      </Svg>
      {/* 图例 */}
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colors.tutorial }]} /><Text style={styles.legendText}>观看教程</Text>
        <View style={[styles.dot, { backgroundColor: colors.weapon }]} /><Text style={styles.legendText}>武器强化</Text>
        <View style={[styles.dot, { backgroundColor: colors.duo }]}    /><Text style={styles.legendText}>双人练习</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  title:     { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 4 },
  loading:   { fontSize: 12, color: "#666" },
  legend:    { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8 },
  dot:       { width: 10, height: 10, borderRadius: 5, marginHorizontal: 4 },
  legendText:{ fontSize: 12, color: "#666", marginRight: 12 },
});
