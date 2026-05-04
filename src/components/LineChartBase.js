// LineChartBase.js
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions, PanResponder } from "react-native";
import Svg, { G, Path, Line, Circle, Text as SvgText } from "react-native-svg";
import * as d3Shape from "d3-shape";
import { scaleTime, scaleLinear, scalePoint } from "d3-scale";
import moment from "moment";

const { width: screenWidth } = Dimensions.get("window");
const defaultMargin = { top: 16, bottom: 32, left: 16, right: 40 };
const defaultHeight = 200;
const defaultColors = { tutorial: "#F57F17", weapon: "#0277BD", duo: "#C62828" };
const timeAxisLabelPadding = 8;
const minAxisLabelGap = 32;
const axisLabelFontSize = 10;
const axisLabelCharWidth = 6;
const axisLabelOverlapPadding = 4;
const touchValueLabelOffsetX = 6;
const touchValueLabelOverlapStepX = 6;

const formatAxisLabel = (item, xType) => (
  xType === "time" ? moment(item.label).format("MM-DD") : String(item.label)
);

const estimateAxisLabelWidth = (label) => (
  String(label).length * axisLabelCharWidth
);

export default function LineChartBase({
  title = "",
  points = [],
  counts = { tutorial: [], weapon: [], duo: [] },
  xType = "time",    // "time" or "point"
  xDomain = null,
  xLabels = null,
  touchXLabels = null,
  height = defaultHeight,
  colors = defaultColors
}) {
  const innerWidth  = screenWidth - defaultMargin.left - defaultMargin.right;
  const innerHeight = height      - defaultMargin.top  - defaultMargin.bottom;

  // 1. 计算比例尺和序列
  const { series, xScale, yScale, axisLabels, touchAxisLabels, hiddenAxisLabelIndexes } = useMemo(() => {
    const rawSeries = ["tutorial","weapon","duo"].map(key =>
      points.map((p,i) => ({
        x: xType==="time" ? moment(p).toDate() : String(p),
        value: counts[key]?.[i] ?? 0,
        key
      }))
    );
    const timeDomain = xDomain?.length === 2
      ? xDomain.map((p) => moment(p).toDate())
      : [
          rawSeries[0][0]?.x || new Date(),
          rawSeries[0].slice(-1)[0]?.x || new Date()
        ];

    // X 轴比例尺
    const xScaleFn = xType==="time"
      ? scaleTime()
          .domain(timeDomain)
          .range([timeAxisLabelPadding, innerWidth - timeAxisLabelPadding])
      : scalePoint()
          .domain(points.map(p=>String(p)))
          .range([0, innerWidth]);

    // Y 轴比例尺
    let maxY = 1;
    rawSeries.flat().forEach(pt => { if (pt.value > maxY) maxY = pt.value; });
    const yScaleFn = scaleLinear().domain([0, maxY]).range([innerHeight, 0]);
    const toAxisLabels = (labels) => labels.map((label) => ({
      x: xType==="time" ? moment(label).toDate() : String(label),
      label
    }));
    const axisLabelsValue = Array.isArray(xLabels)
      ? toAxisLabels(xLabels)
      : rawSeries[0].map((pt) => ({ x: pt.x, label: pt.x }));
    const touchAxisLabelsValue = Array.isArray(touchXLabels)
      ? touchXLabels.map((labels) => Array.isArray(labels) ? toAxisLabels(labels) : null)
      : null;
    const hiddenLabelIndexes = new Set();
    if (xType === "time" && Array.isArray(xLabels) && axisLabelsValue.length >= 2) {
      const last = axisLabelsValue[axisLabelsValue.length - 1];
      const penultimate = axisLabelsValue[axisLabelsValue.length - 2];
      if (Math.abs(xScaleFn(last.x) - xScaleFn(penultimate.x)) < minAxisLabelGap) {
        hiddenLabelIndexes.add(axisLabelsValue.length - 2);
      }
    }

    return {
      series: rawSeries,
      xScale: xScaleFn,
      yScale: yScaleFn,
      axisLabels: axisLabelsValue,
      touchAxisLabels: touchAxisLabelsValue,
      hiddenAxisLabelIndexes: hiddenLabelIndexes,
    };
  }, [points, counts, xType, xDomain, xLabels, touchXLabels, innerWidth, innerHeight]);

  // 2. 曲线生成器
  const lineGenerator = d3Shape
    .line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.value))
    .curve(d3Shape.curveMonotoneX);

  // 3. 触摸交互
  const [touchIndex, setTouchIndex] = useState(null);
  const handleTouch = useCallback((x) => {
    const lx = x - defaultMargin.left;
    if (lx < 0 || lx > innerWidth || !series[0]?.length) {
      setTouchIndex(null);
      return;
    }
    let minD = Infinity, idx = null;
    series[0].forEach((pt,i) => {
      const d = Math.abs(xScale(pt.x) - lx);
      if (d < minD) { minD = d; idx = i; }
    });
    setTouchIndex(idx);
  }, [innerWidth, series, xScale]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant:   e => handleTouch(e.nativeEvent.locationX),
    onPanResponderMove:    e => handleTouch(e.nativeEvent.locationX),
    onPanResponderRelease: () => setTouchIndex(null),
    onPanResponderTerminate: () => setTouchIndex(null),
  }), [handleTouch]);

  const activeTouchAxisLabels = touchIndex != null && touchAxisLabels?.[touchIndex]?.length
    ? touchAxisLabels[touchIndex]
    : null;
  const positionedTouchAxisLabels = useMemo(() => {
    if (!activeTouchAxisLabels) return null;

    const labels = activeTouchAxisLabels.map((item) => ({ ...item }));
    if (labels.length !== 2) return labels;

    const tickXs = labels.map((item) => xScale(item.x));
    const labelWidths = labels.map((item) => (
      estimateAxisLabelWidth(formatAxisLabel(item, xType))
    ));
    const requiredGap = Math.max(
      minAxisLabelGap,
      labelWidths[0] / 2 + labelWidths[1] / 2 + axisLabelOverlapPadding
    );
    const currentGap = Math.abs(tickXs[1] - tickXs[0]);

    if (currentGap >= requiredGap) {
      return labels;
    }

    const spread = requiredGap - currentGap;
    const labelXs = [...tickXs];
    const isFirstTouchGroup = touchIndex === 0;
    const isLastTouchGroup = touchIndex === touchAxisLabels.length - 1;

    if (isFirstTouchGroup && !isLastTouchGroup) {
      labelXs[1] += spread;
    } else if (isLastTouchGroup && !isFirstTouchGroup) {
      labelXs[0] -= spread;
    } else {
      labelXs[0] -= spread / 2;
      labelXs[1] += spread / 2;
    }

    return labels.map((item, index) => ({
      ...item,
      labelX: labelXs[index],
    }));
  }, [activeTouchAxisLabels, touchIndex, touchAxisLabels, xScale, xType]);
  const visibleAxisLabels = positionedTouchAxisLabels || axisLabels;
  const visibleHiddenAxisLabelIndexes = activeTouchAxisLabels
    ? new Set()
    : hiddenAxisLabelIndexes;

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View {...panResponder.panHandlers}>
        <Svg width={screenWidth} height={height}>
          <G x={defaultMargin.left} y={defaultMargin.top}>
            {/* X 轴标签 */}
            {visibleAxisLabels.map((item,i) => {
              const labelTickX = xScale(item.x);
              const labelX = item.labelX ?? labelTickX;
              return (
                <React.Fragment key={`x-${i}`}>
                  <Line
                    x1={labelTickX}
                    y1={innerHeight + 2}
                    x2={labelTickX}
                    y2={innerHeight + 6}
                    stroke="#ddd"
                    strokeWidth={1}
                  />
                  {!visibleHiddenAxisLabelIndexes.has(i) && (
                    <SvgText
                      x={labelX}
                      y={innerHeight + 20}
                      fontSize={axisLabelFontSize}
                      fill="#666"
                      textAnchor="middle"
                    >
                      {formatAxisLabel(item, xType)}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}

            {/* Y 轴刻度与网格 */}
            {yScale.ticks(5).map((t,i) => (
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

            {/* 折线 */}
            {series.map(serie => (
              <Path
                key={`line-${serie[0].key}`}
                d={lineGenerator(serie)}
                fill="none"
                stroke={colors[serie[0].key]}
                strokeWidth={2}
              />
            ))}

            {/* 单点时静态显示该点 */}
            {series[0].length === 1 && series.map(serie => {
              const pt = serie[0];
              return (
                <G key={`single-${serie[0].key}`}>
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

            {/* 始终响应触摸高亮 */}
            {touchIndex != null && touchIndex >= 0 && (
              <G>
                <Line
                  x1={xScale(series[0][touchIndex].x)}
                  y1={0}
                  x2={xScale(series[0][touchIndex].x)}
                  y2={innerHeight}
                  stroke="#aaa"
                  strokeDasharray={[4,4]}
                />
                {series.map((serie, serieIndex) => {
                  const pt = serie[touchIndex];
                  const overlapCount = series
                    .slice(0, serieIndex)
                    .filter(prevSerie => prevSerie[touchIndex]?.value === pt.value)
                    .length;
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
                        x={xScale(pt.x) + touchValueLabelOffsetX + overlapCount * touchValueLabelOverlapStepX}
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
        {["tutorial","weapon","duo"].map(key => (
          <React.Fragment key={`leg-${key}`}>
            <View style={[styles.dot, { backgroundColor: colors[key] }]} />
            <Text style={styles.legendText}>
              {key==="tutorial" ? "观看教程" : key==="weapon" ? "武器强化" : "双人练习"}
            </Text>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  title:     { fontSize:14, fontWeight:"bold", color:"#333", marginBottom:4 },
  legend:    { flexDirection:"row", alignItems:"center", justifyContent:"center", marginTop:8 },
  dot:       { width:10, height:10, borderRadius:5, marginHorizontal:4 },
  legendText:{ fontSize:12, color:"#666", marginRight:12 },
});
