import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
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

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 230;
const tutorialColor = '#F57F17';
const tutorialLightColor = '#FFE082';
const tutorialMidColor = '#FFD54F';
const tutorialDarkColor = '#8A4B00';
const gridColor = '#ECEFF3';
const axisTextColor = '#6B7280';
const remainderColor = '#E2E5EA';
const msPerMinute = 1000 * 60;

const formatMinutes = (ms) => `${Math.round(ms / msPerMinute)} 分钟`;
const minutesValue = (ms) => Math.round(ms / msPerMinute);
const formatAxisMinutes = (ms, maxMs) => {
  const minutes = ms / msPerMinute;
  if (maxMs < 4 * msPerMinute) {
    return minutes.toFixed(1).replace(/\.0$/, '');
  }
  return String(Math.round(minutes));
};

const getUsageSliceColor = (index) => (
  [tutorialColor, tutorialMidColor, tutorialDarkColor, '#FFB300', '#B76E00'][index % 5]
);

const getDailySliceColor = (item, index) => (
  item.color || getUsageSliceColor(index)
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
        <Text style={styles.chartMeta}>已过 {formatMinutes(total)}</Text>
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
                y={-5}
                fontSize={18}
                fontWeight="700"
                fill={tutorialDarkColor}
                textAnchor="middle"
              >
                {minutesValue(usageTotal)}
              </SvgText>
              <SvgText y={15} fontSize={11} fill={axisTextColor} textAnchor="middle">
                黑名单分钟
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
                  {item.label}：{formatMinutes(item.durationMs)}
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
  const maxValue = Math.max(1, ...rows.map((item) => item.durationMs));
  const innerWidth = chartWidth - 42;
  const innerHeight = chartHeight - 58;
  const barGap = 12;
  const barWidth = Math.min(24, Math.max(14, (innerWidth - barGap * (rows.length - 1)) / rows.length));
  const totalBarWidth = rows.length * barWidth + Math.max(0, rows.length - 1) * barGap;
  const plotWidth = Math.max(totalBarWidth, 120);
  const plotStartX = Math.max(0, (innerWidth - plotWidth) / 2);
  const barStartX = plotStartX + Math.max(0, (plotWidth - totalBarWidth) / 2);

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>最近7天使用时长</Text>
        <Text style={styles.chartMeta}>单位：分钟</Text>
      </View>
      <Svg width={chartWidth} height={chartHeight - 6}>
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
                <SvgText x={plotStartX + plotWidth + 4} y={y + 4} fontSize={10} fill="#666">
                  {formatAxisMinutes(maxValue * ratio, maxValue)}
                </SvgText>
              </G>
            );
          })}
          <Line
            x1={plotStartX}
            y1={innerHeight}
            x2={plotStartX + plotWidth}
            y2={innerHeight}
            stroke="#DDE2E8"
            strokeWidth={1}
          />
          {rows.map((item, index) => {
            const x = barStartX + index * (barWidth + barGap);
            const height = Math.max(item.durationMs > 0 ? 4 : 0, (item.durationMs / maxValue) * innerHeight);
            return (
              <G key={item.key}>
                <Rect
                  x={x}
                  y={innerHeight - height}
                  width={barWidth}
                  height={height}
                  fill="url(#weeklyBarGradient)"
                  rx={6}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={innerHeight + 17}
                  fontSize={10}
                  fill={axisTextColor}
                  textAnchor="middle"
                >
                  {moment(item.key).format('dd')}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

export const MonthlyUsageLineChart = ({ rows }) => {
  const visibleRows = rows.filter((item) => !item.isFuture);
  const maxValue = Math.max(1, ...visibleRows.map((item) => item.durationMs));
  const innerWidth = chartWidth - 46;
  const innerHeight = chartHeight - 66;
  const step = rows.length > 1 ? innerWidth / (rows.length - 1) : innerWidth;
  const points = rows
    .map((item, index) => ({
      x: rows.length > 1 ? index * step : innerWidth / 2,
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

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>最近30天每日趋势</Text>
        <Text style={styles.chartMeta}>单位：分钟</Text>
      </View>
      <Svg width={chartWidth} height={chartHeight}>
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
                <Line x1={0} y1={y} x2={innerWidth} y2={y} stroke={gridColor} strokeWidth={1} />
                <SvgText x={innerWidth + 4} y={y + 4} fontSize={10} fill={axisTextColor}>
                  {formatAxisMinutes(maxValue * ratio, maxValue)}
                </SvgText>
              </G>
            );
          })}
          <Line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#DDE2E8" strokeWidth={1} />
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
          {points.map((point) => (
            <G key={point.item.key}>
              <Circle cx={point.x} cy={point.y} r={4} fill="#fff" stroke={tutorialColor} strokeWidth={2} />
              {point.item.durationMs > 0 && (
                <Circle cx={point.x} cy={point.y} r={2} fill={tutorialColor} />
              )}
            </G>
          ))}
          {rows.filter((_, index) => (
            index === 0
            || index === rows.length - 1
            || index === Math.floor((rows.length - 1) / 2)
          )).map((item) => {
            const index = rows.findIndex((row) => row.key === item.key);
            const x = rows.length > 1 ? index * step : innerWidth / 2;
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
  );
};

const styles = StyleSheet.create({
  chartBlock: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ECEFF3',
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
    color: '#333',
  },
  chartMeta: {
    fontSize: 12,
    color: axisTextColor,
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
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
    color: '#444',
    flex: 1,
  },
});
