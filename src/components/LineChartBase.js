// LineChartBase.js
import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, PanResponder } from "react-native";
import Svg, { G, Path, Line, Circle, Text as SvgText } from "react-native-svg";
import * as d3Shape from "d3-shape";
import { scaleTime, scaleLinear, scalePoint } from "d3-scale";
import moment from "moment";

const { width: screenWidth } = Dimensions.get("window");
const defaultMargin = { top: 16, bottom: 32, left: 16, right: 40 };
const defaultHeight = 200;
const defaultColors = { tutorial: "#F57F17", weapon: "#0277BD", duo: "#C62828" };

export default function LineChartBase({
  title = "",
  points = [],
  counts = { tutorial: [], weapon: [], duo: [] },
  xType = "time",    // "time" or "point"
  height = defaultHeight,
  colors = defaultColors
}) {
  const innerWidth = screenWidth - defaultMargin.left - defaultMargin.right;
  const innerHeight = height - defaultMargin.top - defaultMargin.bottom;

  // 1. 计算比例尺和序列
  const { series, xScale, yScale } = useMemo(() => {
    // 构造三条序列
    const rawSeries = ["tutorial", "weapon", "duo"].map((key) =>
      points.map((p, i) => ({
        x: xType === "time" ? moment(p).toDate() : String(p),
        value: counts[key] && counts[key][i] != null ? counts[key][i] : 0,
        key,
      }))
    );

    // X 轴
    let xScaleFn;
    if (xType === "time") {
      const start = rawSeries[0][0]?.x || new Date();
      const end = rawSeries[0][rawSeries[0].length - 1]?.x || new Date();
      xScaleFn = scaleTime()
        .domain([start, end])
        .range([0, innerWidth]);
    } else {
      const domainPts = points.map((p) => String(p));
      xScaleFn = scalePoint()
        .domain(domainPts)
        .range([0, innerWidth]);
    }

    // Y 轴
    let maxY = 1;
    rawSeries.forEach((serie) => {
      serie.forEach((pt) => {
        if (pt.value > maxY) maxY = pt.value;
      });
    });
    const yScaleFn = scaleLinear()
      .domain([0, maxY])
      .range([innerHeight, 0]);

    return { series: rawSeries, xScale: xScaleFn, yScale: yScaleFn };
  }, [points, counts, xType, innerWidth, innerHeight]);

  // 2. D3 曲线生成器
  const lineGenerator = d3Shape
    .line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.value))
    .curve(d3Shape.curveMonotoneX);

  // 3. 触摸交互：垂直线 + 圆点
  const [touchIndex, setTouchIndex] = useState(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) =>
        updateTouchIndex(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) =>
        updateTouchIndex(evt.nativeEvent.locationX),
      onPanResponderRelease: () => setTouchIndex(null),
      onPanResponderTerminate: () => setTouchIndex(null),
    })
  ).current;

  function updateTouchIndex(x) {
    const lx = x - defaultMargin.left;
    if (lx < 0 || lx > innerWidth) {
      setTouchIndex(null);
      return;
    }
    let closest = null;
    let minD = Infinity;
    series[0].forEach((pt, idx) => {
      const dx = Math.abs(xScale(pt.x) - lx);
      if (dx < minD) {
        minD = dx;
        closest = idx;
      }
    });
    setTouchIndex(closest);
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View {...panResponder.panHandlers}>
        <Svg width={screenWidth} height={height}>
          <G x={defaultMargin.left} y={defaultMargin.top}>
            {/* X 轴标签 */}
            {series[0].map((pt, i) => (
              <SvgText
                key={`x-${i}`}
                x={xScale(pt.x)}
                y={innerHeight + 20}
                fontSize={10}
                fill="#666"
                textAnchor="middle"
              >
                {xType === "time"
                  ? moment(pt.x).format("MM-DD")
                  : pt.x}
              </SvgText>
            ))}

            {/* Y 轴刻度与网格 */}
            {yScale.ticks(5).map((t, i) => (
              <G key={`y-${i}`}>
                <SvgText
                  x={-8}
                  y={yScale(t)}
                  fontSize={10}
                  fill="#666"
                  textAnchor="end"
                >
                  {t}
                </SvgText>
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

            {/* 绘制折线 */}
            {series.map((serie) => (
              <Path
                key={`line-${serie[0].key}`}
                d={lineGenerator(serie)}
                fill="none"
                stroke={colors[serie[0].key]}
                strokeWidth={2}
              />
            ))}

            {/* 交互高亮 */}
            {touchIndex != null && touchIndex >= 0 && (
              <G>
                <Line
                  x1={xScale(series[0][touchIndex].x)}
                  y1={0}
                  x2={xScale(series[0][touchIndex].x)}
                  y2={innerHeight}
                  stroke="#aaa"
                  strokeDasharray={[4, 4]}
                />
                {series.map((serie) => {
                  const pt = serie[touchIndex];
                  return (
                    <G key={`dot-${serie[0].key}`}>
                      <Circle
                        cx={xScale(pt.x)}
                        cy={yScale(pt.value)}
                        r={4}
                        fill={colors[serie[0].key]}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                      <SvgText
                        x={xScale(pt.x) + 6}
                        y={yScale(pt.value) - 6}
                        fontSize={12}
                        fontWeight="bold"
                        fill={colors[serie[0].key]}
                      >
                        {pt.value}
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
        {["tutorial", "weapon", "duo"].map((key) => (
          <React.Fragment key={`leg-${key}`}>
            <View style={[styles.dot, { backgroundColor: colors[key] }]} />
            <Text style={styles.legendText}>
              {key === "tutorial"
                ? "观看教程"
                : key === "weapon"
                ? "武器强化"
                : "双人练习"}
            </Text>
          </React.Fragment>
        ))}
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
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 4 },
  legendText: { fontSize: 12, color: "#666", marginRight: 12 },
});
