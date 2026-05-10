import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import * as d3Shape from 'd3-shape';
import moment from 'moment';
import {
  formatUsageAxisDurationCompact,
  formatUsageDurationChinese,
  formatUsageDurationCompact,
  getUsageDurationMinutes,
} from '../utils/usageDurationFormat';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartBlockPadding = 12;
const chartInnerWidth = chartWidth - chartBlockPadding * 2;
const chartHeight = 230;
const tutorialColor = '#F57F17';
const tutorialLightColor = '#FFE082';
const tutorialMidColor = '#FFD54F';
const tutorialDarkColor = '#8A4B00';
const gridColor = '#F4D79A';
const axisTextColor = '#A66A00';
const remainderColor = '#F6E7C4';
const heatmapEmptyColor = '#FFFFFF';
const heatmapFutureColor = '#F7F7F7';
const heatmapNeutralBorderColor = '#E0E0E0';
const heatmapGradientStartColor = '#FFE082';
const heatmapGradientEndColor = '#8A4B00';
const monthlyTouchValueLabelOffsetX = 6;
const monthlyPlotSideInset = 18;
const yAxisLabelWidth = 0;
const horizontalAxisPadding = 10;
const msPerDay = 24 * 60 * 60 * 1000;
const heatmapLegendGradientWidth = 86;
const heatmapLegendGradientHeight = 11;

const getUsageSliceColor = (index) => (
  [tutorialColor, tutorialMidColor, tutorialDarkColor, '#FFB300', '#B76E00'][index % 5]
);

const getDailySliceColor = (item, index) => getUsageSliceColor(index);

const shouldShowMonthlyPoint = (points, index) => {
  const point = points[index];
  if (!point || point.item.durationMs > 0) {
    return true;
  }

  const previous = points[index - 1];
  const next = points[index + 1];
  return !previous || !next || previous.item.durationMs > 0 || next.item.durationMs > 0;
};

const overlapDuration = (interval, rangeStart, rangeEnd) => {
  const start = Math.max(interval.startTime, rangeStart);
  const end = Math.min(interval.endTime, rangeEnd);
  return Math.max(0, end - start);
};

const parseHexColor = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const toHexChannel = (value) => Math.round(value).toString(16).padStart(2, '0').toUpperCase();

const interpolateHexColor = (startHex, endHex, ratio) => {
  const start = parseHexColor(startHex);
  const end = parseHexColor(endHex);
  const boundedRatio = Math.max(0, Math.min(1, ratio));
  return `#${toHexChannel(start.r + (end.r - start.r) * boundedRatio)}${toHexChannel(start.g + (end.g - start.g) * boundedRatio)}${toHexChannel(start.b + (end.b - start.b) * boundedRatio)}`;
};

const getRoundedHeatmapMaxMinutes = (maxDurationMs) => {
  const maxMinutes = getUsageDurationMinutes(maxDurationMs);
  if (maxMinutes <= 0) return 0;
  return Math.ceil(maxMinutes / 10) * 10;
};

const getHeatmapColor = (durationMs, maxMinutes) => {
  if (durationMs <= 0) return heatmapEmptyColor;
  const durationMinutes = getUsageDurationMinutes(durationMs);
  const ratio = maxMinutes > 0 ? durationMinutes / maxMinutes : 0;
  return interpolateHexColor(heatmapGradientStartColor, heatmapGradientEndColor, ratio);
};

const getUsageHeatmapLayoutMetrics = (layoutWidth = chartWidth) => {
  const blockWidth = Number.isFinite(layoutWidth) && layoutWidth > 0 ? layoutWidth : chartWidth;
  const measuredWidth = Math.max(0, blockWidth - chartBlockPadding * 2);
  const svgWidth = measuredWidth || chartInnerWidth;
  const labelWidth = 26;
  const monthLabelHeight = 18;
  const bottomPadding = 6;
  const cellGap = 3;
  const targetPlotHeight = Math.max(132, Math.min(184, Math.round(svgWidth * 0.42)));
  const cellSize = Math.max(10, Math.floor((targetPlotHeight - cellGap * 6) / 7));
  const plotHeight = cellSize * 7 + cellGap * 6;
  const plotWidth = Math.max(1, svgWidth - labelWidth);
  const columnCount = Math.max(1, Math.floor((plotWidth + cellGap) / (cellSize + cellGap)));
  const actualPlotWidth = columnCount * cellSize + Math.max(0, columnCount - 1) * cellGap;
  const svgHeight = monthLabelHeight + plotHeight + bottomPadding;

  return {
    actualPlotWidth,
    cellGap,
    cellSize,
    columnCount,
    labelWidth,
    monthLabelHeight,
    plotHeight,
    svgHeight,
    svgWidth,
  };
};

export const getUsageHeatmapVisibleWeeks = (layoutWidth) => (
  getUsageHeatmapLayoutMetrics(layoutWidth).columnCount
);

export const DailyUsagePieChart = ({ rows }) => {
  const total = rows.reduce((sum, item) => sum + item.durationMs, 0);
  const usageTotal = rows
    .filter((item) => !item.isRemainder)
    .reduce((sum, item) => sum + item.durationMs, 0);
  const radius = 72;
  const arcs = d3Shape.pie().value((item) => item.durationMs)(rows);
  const arcPath = d3Shape.arc().outerRadius(radius).innerRadius(43).cornerRadius(3).padAngle(0.012);

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>当日使用占比</Text>
        <Text style={styles.chartMeta}>已过 {formatUsageDurationChinese(total)}</Text>
      </View>
      {total <= 0 ? (
        <Text style={styles.emptyText}>暂无当日使用时间数据</Text>
      ) : (
        <>
          <Svg width={chartWidth} height={180}>
            <G x={chartWidth / 2} y={90}>
              {arcs.map((arc, index) => (
                <Path
                  key={arc.data.packageName}
                  d={arcPath(arc)}
                  fill={arc.data.isRemainder ? remainderColor : getDailySliceColor(arc.data, index)}
                  stroke="#fff"
                  strokeWidth={1.4}
                />
              ))}
              <Circle r={39} fill="#FFF8E1" />
              <SvgText
                y={1}
                fontSize={18}
                fontWeight="700"
                fill={tutorialDarkColor}
                textAnchor="middle"
              >
                {formatUsageDurationCompact(usageTotal)}
              </SvgText>
              <SvgText y={19} fontSize={9} fill={axisTextColor} textAnchor="middle">
                黑名单时长
              </SvgText>
            </G>
          </Svg>
          <View style={styles.legend}>
            {rows.map((item, index) => (
              <View key={item.packageName} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: item.isRemainder ? remainderColor : getDailySliceColor(item, index) },
                  ]}
                />
                <Text style={styles.legendText}>
                  {item.label}：{formatUsageDurationChinese(item.durationMs)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

export const WeeklyUsageBarChart = ({ rows }) => {
  const [touchIndex, setTouchIndex] = useState(null);
  const maxValue = Math.max(1, ...rows.map((item) => item.durationMs));
  const innerWidth = chartInnerWidth - 42;
  const innerHeight = chartHeight - 58;
  const barGap = 12;
  const barWidth = Math.min(24, Math.max(14, (innerWidth - barGap * (rows.length - 1)) / rows.length));
  const totalBarWidth = rows.length * barWidth + Math.max(0, rows.length - 1) * barGap;
  const plotWidth = Math.max(totalBarWidth + horizontalAxisPadding * 2, 120);
  const plotStartX = Math.max(yAxisLabelWidth, (innerWidth - plotWidth) / 2);
  const barStartX = plotStartX + Math.max(
    horizontalAxisPadding,
    (plotWidth - totalBarWidth) / 2
  );
  const bars = rows.map((item, index) => {
    const x = barStartX + index * (barWidth + barGap);
    const height = Math.max(item.durationMs > 0 ? 4 : 0, (item.durationMs / maxValue) * innerHeight);
    return {
      x,
      y: innerHeight - height,
      height,
      item,
    };
  });
  const handleTouch = useCallback((x) => {
    const lx = x - 16;
    if (lx < plotStartX || lx > plotStartX + plotWidth || bars.length === 0) {
      setTouchIndex(null);
      return;
    }

    let nextIndex = null;
    let minDistance = Infinity;
    bars.forEach((bar, index) => {
      const centerX = bar.x + barWidth / 2;
      const distance = Math.abs(centerX - lx);
      if (distance < minDistance) {
        minDistance = distance;
        nextIndex = index;
      }
    });
    setTouchIndex(nextIndex);
  }, [barWidth, bars, plotStartX, plotWidth]);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => handleTouch(event.nativeEvent.locationX),
    onPanResponderMove: (event) => handleTouch(event.nativeEvent.locationX),
    onPanResponderRelease: () => setTouchIndex(null),
    onPanResponderTerminate: () => setTouchIndex(null),
  }), [handleTouch]);
  const touchBar = touchIndex != null ? bars[touchIndex] : null;
  const touchLabel = touchBar ? formatUsageDurationCompact(touchBar.item.durationMs) : '';
  const touchLabelWidth = touchLabel.length * 7;
  const touchLabelX = touchBar
    ? Math.max(
      plotStartX + touchLabelWidth / 2,
      Math.min(plotStartX + plotWidth - touchLabelWidth / 2, touchBar.x + barWidth / 2)
    )
    : 0;
  const touchLabelY = touchBar
    ? touchBar.y - 8
    : 0;
  const touchFrameY = touchBar && touchBar.height > 0 ? touchBar.y : innerHeight - 4;
  const touchFrameHeight = touchBar && touchBar.height > 0 ? touchBar.height : 4;

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>最近7天使用时长</Text>
        <Text style={styles.chartMeta}>时长</Text>
      </View>
      <View {...panResponder.panHandlers}>
        <Svg width={chartInnerWidth} height={chartHeight - 6}>
          <Defs>
            <LinearGradient
              id="weeklyBarGradient"
              x1="0"
              y1="0"
              x2="0"
              y2={innerHeight}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={tutorialMidColor} stopOpacity="1" />
              <Stop offset="1" stopColor={tutorialColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <G x={16} y={24}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = innerHeight * (1 - ratio);
              return (
                <G key={ratio}>
                  <Line
                    x1={plotStartX}
                    y1={y}
                    x2={plotStartX + plotWidth}
                    y2={y}
                    stroke={gridColor}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={plotStartX - 2}
                    y={y + 4}
                    fontSize={10}
                    fill="#8A4B00"
                    textAnchor="end"
                  >
                    {formatUsageAxisDurationCompact(maxValue * ratio, maxValue)}
                  </SvgText>
                </G>
              );
            })}
            <Line
              x1={plotStartX}
              y1={innerHeight}
              x2={plotStartX + plotWidth}
              y2={innerHeight}
              stroke="#F4D79A"
              strokeWidth={1}
            />
            {bars.map((bar) => (
              <G key={bar.item.key}>
                <Rect
                  x={bar.x}
                  y={bar.y}
                  width={barWidth}
                  height={bar.height}
                  fill="url(#weeklyBarGradient)"
                  rx={6}
                />
                <SvgText
                  x={bar.x + barWidth / 2}
                  y={innerHeight + 17}
                  fontSize={10}
                  fill={axisTextColor}
                  textAnchor="middle"
                >
                  {moment(bar.item.key).format('dd')}
                </SvgText>
              </G>
            ))}
            {touchBar && (
              <G>
                <Rect
                  x={touchBar.x}
                  y={touchFrameY}
                  width={barWidth}
                  height={touchFrameHeight}
                  fill="transparent"
                  stroke={tutorialDarkColor}
                  strokeWidth={2}
                  rx={6}
                />
                <SvgText
                  x={touchLabelX}
                  y={touchLabelY}
                  fontSize={12}
                  fontWeight="bold"
                  fill={tutorialDarkColor}
                  textAnchor="middle"
                >
                  {touchLabel}
                </SvgText>
              </G>
            )}
          </G>
        </Svg>
      </View>
    </View>
  );
};

export const MonthlyUsageLineChart = ({ rows }) => {
  const [touchIndex, setTouchIndex] = useState(null);
  const visibleRows = rows.filter((item) => !item.isFuture);
  const maxValue = Math.max(1, ...visibleRows.map((item) => item.durationMs));
  const innerWidth = chartInnerWidth - 46 - yAxisLabelWidth;
  const plotStartX = yAxisLabelWidth + monthlyPlotSideInset;
  const plotWidth = Math.max(1, innerWidth - monthlyPlotSideInset * 2);
  const plotEndX = plotStartX + plotWidth;
  const innerHeight = chartHeight - 66;
  const xRangeStart = plotStartX + horizontalAxisPadding;
  const xRangeWidth = Math.max(1, plotWidth - horizontalAxisPadding * 2);
  const step = rows.length > 1 ? xRangeWidth / (rows.length - 1) : xRangeWidth;
  const points = rows
    .map((item, index) => ({
      x: rows.length > 1 ? xRangeStart + index * step : plotStartX + innerWidth / 2,
      y: innerHeight - (item.durationMs / maxValue) * innerHeight,
      item,
    }))
    .filter((point) => !point.item.isFuture);
  const linePath = d3Shape.line()
    .x((item) => item.x)
    .y((item) => item.y)
    .curve(d3Shape.curveMonotoneX)(points);
  const areaPath = d3Shape.area()
    .x((item) => item.x)
    .y0(innerHeight)
    .y1((item) => item.y)
    .curve(d3Shape.curveMonotoneX)(points);
  const handleTouch = useCallback((x) => {
    const lx = x - 20;
    if (lx < plotStartX || lx > plotEndX || points.length === 0) {
      setTouchIndex(null);
      return;
    }

    let nextIndex = null;
    let minDistance = Infinity;
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - lx);
      if (distance < minDistance) {
        minDistance = distance;
        nextIndex = index;
      }
    });
    setTouchIndex(nextIndex);
  }, [plotEndX, plotStartX, points]);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => handleTouch(event.nativeEvent.locationX),
    onPanResponderMove: (event) => handleTouch(event.nativeEvent.locationX),
    onPanResponderRelease: () => setTouchIndex(null),
    onPanResponderTerminate: () => setTouchIndex(null),
  }), [handleTouch]);
  const touchPoint = touchIndex != null ? points[touchIndex] : null;
  const touchLabel = touchPoint ? formatUsageDurationCompact(touchPoint.item.durationMs) : '';

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>最近30天每日趋势</Text>
        <Text style={styles.chartMeta}>时长</Text>
      </View>
      <View {...panResponder.panHandlers}>
        <Svg width={chartInnerWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="monthlyAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tutorialLightColor} stopOpacity="0.72" />
              <Stop offset="1" stopColor={tutorialLightColor} stopOpacity="0.08" />
            </LinearGradient>
          </Defs>
          <G x={20} y={24}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = innerHeight * (1 - ratio);
              return (
                <G key={ratio}>
                  <Line x1={plotStartX} y1={y} x2={plotEndX} y2={y} stroke={gridColor} strokeWidth={1} />
                  <SvgText
                    x={plotStartX - 2}
                    y={y + 4}
                    fontSize={10}
                    fill={axisTextColor}
                    textAnchor="end"
                  >
                    {formatUsageAxisDurationCompact(maxValue * ratio, maxValue)}
                  </SvgText>
                </G>
              );
            })}
            <Line x1={plotStartX} y1={innerHeight} x2={plotEndX} y2={innerHeight} stroke="#F4D79A" strokeWidth={1} />
            {areaPath && <Path d={areaPath} fill="url(#monthlyAreaGradient)" />}
            {linePath && (
              <Path
                d={linePath}
                fill="none"
                stroke={tutorialColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {points.filter((_, index) => shouldShowMonthlyPoint(points, index)).map((point) => (
              <G key={point.item.key}>
                <Circle cx={point.x} cy={point.y} r={4} fill="#fff" stroke={tutorialColor} strokeWidth={2} />
                {point.item.durationMs > 0 && (
                  <Circle cx={point.x} cy={point.y} r={2} fill={tutorialColor} />
                )}
              </G>
            ))}
            {touchPoint && (
              <G>
                <Line
                  x1={touchPoint.x}
                  y1={0}
                  x2={touchPoint.x}
                  y2={innerHeight}
                  stroke="#B76E00"
                  strokeDasharray={[4, 4]}
                />
                <Circle
                  cx={touchPoint.x}
                  cy={touchPoint.y}
                  r={4}
                  fill={tutorialColor}
                  stroke="#fff"
                  strokeWidth={1}
                />
                <SvgText
                  x={touchPoint.x + monthlyTouchValueLabelOffsetX}
                  y={Math.max(12, touchPoint.y - 6)}
                  fontSize={12}
                  fontWeight="bold"
                  fill={tutorialColor}
                >
                  {touchLabel}
                </SvgText>
              </G>
            )}
            {rows.filter((_, index) => (
              index === 0
              || index === rows.length - 1
              || index === Math.floor((rows.length - 1) / 2)
            )).map((item) => {
              const index = rows.findIndex((row) => row.key === item.key);
              const x = rows.length > 1 ? xRangeStart + index * step : plotStartX + innerWidth / 2;
              return (
                <SvgText
                  key={`label-${item.key}`}
                  x={x}
                  y={innerHeight + 18}
                  fontSize={10}
                  fill={axisTextColor}
                  textAnchor="middle"
                >
                  {moment(item.key).format('MM-DD')}
                </SvgText>
              );
            })}
          </G>
        </Svg>
      </View>
    </View>
  );
};

export const UsageHeatmapChart = ({ intervals, onVisibleWeeksChange }) => {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [touchKey, setTouchKey] = useState(null);
  const {
    actualPlotWidth,
    cellGap,
    cellSize,
    columnCount,
    labelWidth,
    monthLabelHeight,
    plotHeight,
    svgHeight,
    svgWidth,
  } = useMemo(() => getUsageHeatmapLayoutMetrics(layoutWidth), [layoutWidth]);
  const startOfToday = moment().startOf('day');
  const currentWeekStart = startOfToday.clone().day(0);
  const startDate = currentWeekStart.clone().subtract(columnCount - 1, 'weeks');

  useEffect(() => {
    if (onVisibleWeeksChange) {
      onVisibleWeeksChange(columnCount);
    }
  }, [columnCount, onVisibleWeeksChange]);

  const maxDurationMs = useMemo(() => {
    let maxValue = 0;
    for (let index = 0; index < columnCount * 7; index += 1) {
      const date = startDate.clone().add(index, 'days');
      if (date.isAfter(startOfToday, 'day')) continue;
      const dayStart = date.valueOf();
      const dayEnd = dayStart + msPerDay;
      const durationMs = intervals.reduce((sum, interval) => (
        sum + overlapDuration(interval, dayStart, dayEnd)
      ), 0);
      maxValue = Math.max(maxValue, durationMs);
    }
    return maxValue;
  }, [columnCount, intervals, startDate, startOfToday]);
  const heatmapMaxMinutes = getRoundedHeatmapMaxMinutes(maxDurationMs);
  const cells = useMemo(() => (
    Array.from({ length: columnCount * 7 }, (_, index) => {
      const date = startDate.clone().add(index, 'days');
      const dayStart = date.valueOf();
      const dayEnd = dayStart + msPerDay;
      const durationMs = intervals.reduce((sum, interval) => (
        sum + overlapDuration(interval, dayStart, dayEnd)
      ), 0);
      const column = Math.floor(index / 7);
      const weekday = date.day();
      return {
        key: date.format('YYYY-MM-DD'),
        label: date.format('M月D日'),
        durationMs: date.isAfter(startOfToday, 'day') ? 0 : durationMs,
        isFuture: date.isAfter(startOfToday, 'day'),
        x: labelWidth + column * (cellSize + cellGap),
        y: monthLabelHeight + weekday * (cellSize + cellGap),
      };
    })
  ), [cellGap, cellSize, columnCount, intervals, labelWidth, monthLabelHeight, startDate, startOfToday]);
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = '';
    for (let column = 0; column < columnCount; column += 1) {
      const columnCells = cells.slice(column * 7, column * 7 + 7);
      const firstOfMonth = columnCells.find((cell) => moment(cell.key).date() === 1);
      const labelCell = firstOfMonth || (column === 0 ? columnCells[0] : null);
      if (!labelCell) continue;
      const date = moment(labelCell.key);
      const monthKey = date.format('YYYY-MM');
      if (monthKey === lastMonth) continue;
      labels.push({
        key: monthKey,
        label: date.format('M月'),
        x: labelCell.x,
      });
      lastMonth = monthKey;
    }
    return labels;
  }, [cells, columnCount]);
  const handleTouch = useCallback((x, y) => {
    const plotX = x - labelWidth;
    const plotY = y - monthLabelHeight;
    if (plotX < 0 || plotY < 0 || plotX > actualPlotWidth || plotY > plotHeight) {
      setTouchKey(null);
      return;
    }
    const column = Math.floor(plotX / (cellSize + cellGap));
    const weekday = Math.floor(plotY / (cellSize + cellGap));
    if (plotX - column * (cellSize + cellGap) > cellSize) {
      setTouchKey(null);
      return;
    }
    if (plotY - weekday * (cellSize + cellGap) > cellSize) {
      setTouchKey(null);
      return;
    }
    if (column < 0 || column >= columnCount || weekday < 0 || weekday > 6) {
      setTouchKey(null);
      return;
    }
    const cell = cells[column * 7 + weekday];
    setTouchKey(cell?.key || null);
  }, [actualPlotWidth, cellGap, cellSize, cells, columnCount, labelWidth, monthLabelHeight, plotHeight]);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => handleTouch(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY
    ),
    onPanResponderMove: (event) => handleTouch(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY
    ),
    onPanResponderRelease: () => setTouchKey(null),
    onPanResponderTerminate: () => setTouchKey(null),
  }), [handleTouch]);
  const touchCell = touchKey ? cells.find((cell) => cell.key === touchKey) : null;
  const metaText = touchCell
    ? `${touchCell.label} ${formatUsageDurationChinese(touchCell.durationMs)}`
    : `${columnCount} 周`;

  return (
    <View
      style={styles.chartBlock}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>使用热力图</Text>
        <Text style={styles.chartMeta}>{metaText}</Text>
      </View>
      <View {...panResponder.panHandlers}>
        <Svg width={svgWidth} height={svgHeight}>
          {['日', '一', '二', '三', '四', '五', '六'].map((label, index) => (
            <SvgText
              key={label}
              x={labelWidth - 7}
              y={monthLabelHeight + index * (cellSize + cellGap) + cellSize / 2 + 4}
              fontSize={10}
              fill={axisTextColor}
              textAnchor="end"
            >
              {label}
            </SvgText>
          ))}
          {monthLabels.map((item) => (
            <SvgText
              key={item.key}
              x={item.x}
              y={11}
              fontSize={10}
              fill={axisTextColor}
            >
              {item.label}
            </SvgText>
          ))}
          {cells.map((cell) => {
            const isTouched = cell.key === touchKey;
            return (
              <Rect
                key={cell.key}
                x={cell.x}
                y={cell.y}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={cell.isFuture ? heatmapFutureColor : getHeatmapColor(cell.durationMs, heatmapMaxMinutes)}
                stroke={isTouched ? tutorialDarkColor : heatmapNeutralBorderColor}
                strokeWidth={isTouched ? 2 : 1}
              />
            );
          })}
        </Svg>
      </View>
      <View style={styles.heatmapLegend}>
        <Text style={styles.heatmapLegendLabel}>0</Text>
        <View style={styles.heatmapLegendGradient}>
          <Svg width={heatmapLegendGradientWidth} height={heatmapLegendGradientHeight}>
            <Defs>
              <LinearGradient id="heatmapLegendGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={heatmapEmptyColor} stopOpacity="1" />
                <Stop offset="0.12" stopColor={heatmapGradientStartColor} stopOpacity="1" />
                <Stop offset="1" stopColor={heatmapGradientEndColor} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={heatmapLegendGradientWidth}
              height={heatmapLegendGradientHeight}
              rx={2}
              fill="url(#heatmapLegendGradient)"
              stroke={heatmapNeutralBorderColor}
              strokeWidth={1}
            />
          </Svg>
        </View>
        <Text style={styles.heatmapLegendLabel}>{heatmapMaxMinutes}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartBlock: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F4D79A',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5F4300',
  },
  chartMeta: {
    fontSize: 12,
    color: axisTextColor,
  },
  emptyText: {
    fontSize: 14,
    color: '#A66A00',
    lineHeight: 22,
  },
  legend: {
    gap: 6,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#5F4300',
    flex: 1,
  },
  heatmapLegend: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginRight: 14,
  },
  heatmapLegendLabel: {
    minWidth: 18,
    fontSize: 10,
    color: axisTextColor,
    textAlign: 'center',
  },
  heatmapLegendGradient: {
    width: heatmapLegendGradientWidth,
    height: heatmapLegendGradientHeight,
    borderRadius: 2,
    overflow: 'hidden',
  },
});
