import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import Svg, { G, Path, Line, Circle, Text as SvgText } from "react-native-svg";

import * as d3Shape from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";

const CHECKIN_KEY = "checkin_status";
const { width: screenWidth } = Dimensions.get("window");
const chartHeight = 200;
const margin = { top: 16, bottom: 32, left: 16, right: 40 };
const innerWidth = screenWidth - margin.left - margin.right;
const innerHeight =
  chartHeight - margin.top - margin.bottom;

const colors = {
  tutorial: "#F57F17",
  weapon: "#0277BD",
  duo: "#C62828",
};

export default function YearLineChart({ year }) {
  const [data, setData] = useState({
    tutorial: Array(12).fill(0),
    weapon: Array(12).fill(0),
    duo: Array(12).fill(0),
  });
  const [touchIndex, setTouchIndex] = useState(null);

  // 载入 AsyncStorage
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(CHECKIN_KEY);
      const raw = stored ? JSON.parse(stored) : {};
      const tmp = {
        tutorial: Array(12).fill(0),
        weapon: Array(12).fill(0),
        duo: Array(12).fill(0),
      };
      Object.entries(raw).forEach(([dateStr, status]) => {
        const m = moment(dateStr);
        if (m.year() !== year) return;
        const idx = m.month();
        if (status & 1) tmp.tutorial[idx]++;
        if (status & 2) tmp.weapon[idx]++;
        if (status & 4) tmp.duo[idx]++;
      });
      setData(tmp);
    })();
  }, [year]);

  // 准备 d3 scales
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const maxY = Math.max(
    ...data.tutorial,
    ...data.weapon,
    ...data.duo
  );
  const xScale = scalePoint()
    .domain(months)
    .range([0, innerWidth]);
  const yScale = scaleLinear()
    .domain([0, maxY || 1])
    .range([innerHeight, 0]);

  // 生成 path 工具
  const lineGen = d3Shape
    .line()
    .x((d) => xScale(String(d.month)))
    .y((d) => yScale(d.value))
    .curve(d3Shape.curveMonotoneX);

  // 把三个 series 都做成 [ {month, value}, ... ]
  const series = ["tutorial", "weapon", "duo"].map((key) =>
    data[key].map((v, i) => ({ month: i + 1, value: v, key }))
  );

  // PanResponder：根据触摸 x 定位到最近的 monthIndex
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        updateIndex(e.nativeEvent.locationX),
      onPanResponderMove: (e) =>
        updateIndex(e.nativeEvent.locationX),
      onPanResponderRelease: () => {}, // 保持最后状态
    })
  ).current;

  function updateIndex(x) {
    const localX = x - margin.left;
    if (localX < 0 || localX > innerWidth) return;
    // 找到最接近的 month
    const distances = months.map((m) =>
      Math.abs(xScale(m) - localX)
    );
    const idx = distances.indexOf(Math.min(...distances));
    setTouchIndex(idx);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {year} 年记录变化趋势
      </Text>
      <View {...pan.panHandlers}>
        <Svg
          width={screenWidth}
          height={chartHeight}
          style={{ backgroundColor: "#fff" }}
        >
          <G x={margin.left} y={margin.top}>
            {/* X 轴 */}
            {months.map((m, i) => (
              <SvgText
                key={i}
                x={xScale(m)}
                y={innerHeight + 20}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {m}月
              </SvgText>
            ))}

            {/* Y 轴刻度 */}
            {yScale.ticks(5).map((t, i) => (
              <G key={i}>
                <SvgText
                  x={-8}
                  y={yScale(t)}
                  fontSize="10"
                  fill="#666"
                  textAnchor="end"
                >
                  {t}
                </SvgText>
                {/* 可加水平网格线 */}
                <Line
                  x1={0}
                  y1={yScale(t)}
                  x2={innerWidth}
                  y2={yScale(t)}
                  stroke="#eee"
                  strokeWidth={1}
                />
              </G>
            ))}

            {/* 折线 */}
            {series.map((s) => (
              <Path
                key={s[0].key}
                d={lineGen(s)}
                fill="none"
                stroke={colors[s[0].key]}
                strokeWidth={2}
              />
            ))}

            {/* 触摸高亮：垂直线 + 圆点 + 数值 */}
            {touchIndex !== null && (
              <G>
                {/* 垂直虚线 */}
                <Line
                  x1={xScale(String(touchIndex + 1))}
                  y1={0}
                  x2={xScale(String(touchIndex + 1))}
                  y2={innerHeight}
                  stroke="#aaa"
                  strokeDasharray={[4, 4]}
                  strokeWidth={1}
                />
                {/* 三个圆点和标签 */}
                {series.map((s) => {
                  const point = s[touchIndex];
                  return (
                    <G key={s[0].key}>
                      <Circle
                        cx={xScale(String(point.month))}
                        cy={yScale(point.value)}
                        r={4}
                        fill={colors[s[0].key]}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                      <SvgText
                        x={
                          xScale(String(point.month)) + 6
                        }
                        y={yScale(point.value) - 6}
                        fontSize="12"
                        fontWeight={"bold"}
                        fill={colors[s[0].key]}
                      >
                        {point.value}
                      </SvgText>
                    </G>
                  );
                })}
              </G>
            )}
          </G>
        </Svg>
      </View>

      {/* 图例 */}
      <View style={styles.legend}>
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.tutorial },
          ]}
        />
        <Text style={styles.legendText}>观看教程</Text>
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.weapon },
          ]}
        />
        <Text style={styles.legendText}>武器强化</Text>
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.duo },
          ]}
        />
        <Text style={styles.legendText}>双人练习</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
  },
});
