import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, PanResponder } from "react-native";
import { LineChart, Grid, YAxis, XAxis } from "react-native-svg-charts";
import { Circle, G, Line, Text as SvgText } from "react-native-svg";
import * as shape from "d3-shape";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHECKIN_KEY = "checkin_status";

const YearLineChart = ({ year }) => {
  const [data, setData] = useState({
    tutorial: Array(12).fill(0),
    weapon: Array(12).fill(0),
    duo: Array(12).fill(0),
  });
  const [touchIndex, setTouchIndex] = useState(null);
  const [chartWidth, setChartWidth] = useState(1); // 用于计算index

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    const stored = await AsyncStorage.getItem(CHECKIN_KEY);
    const raw = stored ? JSON.parse(stored) : {};

    const temp = {
      tutorial: Array(12).fill(0),
      weapon: Array(12).fill(0),
      duo: Array(12).fill(0),
    };

    Object.entries(raw).forEach(([dateStr, status]) => {
      const m = moment(dateStr);
      if (m.year() !== year) return;
      const monthIndex = m.month();
      if (status & 1) temp.tutorial[monthIndex]++;
      if (status & 2) temp.weapon[monthIndex]++;
      if (status & 4) temp.duo[monthIndex]++;
    });

    setData(temp);
  };

  const maxY = Math.max(...data.tutorial, ...data.weapon, ...data.duo) * 1.03
  const colors = {
    tutorial: "#F57F17",
    weapon: "#0277BD",
    duo: "#C62828",
  };

  let startX = 0;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      startX = evt.nativeEvent.locationX;
      handleTouch(evt);
    },

    onPanResponderMove: handleTouch,

    onPanResponderRelease: (evt) => {
      const endX = evt.nativeEvent.locationX;
      const delta = Math.abs(endX - startX);
      if (delta < 5) {
        // 判定为点击：清除虚线
        setTouchIndex(null);
      }
      // 否则保留虚线
    },
  });

  function handleTouch(evt) {
    const { locationX } = evt.nativeEvent;
    const relativeX = locationX;
    const index = Math.floor((relativeX / chartWidth) * 12);
    if (index >= 0 && index < 12) {
      setTouchIndex(index);
    }
  }

  const Tooltip = ({ x, y }) =>
    touchIndex !== null ? (
      <G x={x(touchIndex)}>
        <Line
          y1="0"
          y2="200"
          stroke="#aaa"
          strokeDasharray={[4, 4]}
          strokeWidth={1}
        />
        {["tutorial", "weapon", "duo"].map((key, i) => (
          <G key={key}>
            <Circle
              cy={y(data[key][touchIndex])}
              r={4}
              fill={colors[key]}
              stroke="#fff"
              strokeWidth={1}
            />
            <SvgText
              x={4}
              y={y(data[key][touchIndex]) - 6}
              fontSize="10"
              fill={colors[key]}
            >
              {data[key][touchIndex]}
            </SvgText>
          </G>
        ))}
      </G>
    ) : null;

  return (
    <View style={styles.chartWrapper}>
      <Text style={styles.title}>{year} 年记录变化趋势</Text>
      <View
        style={{ flexDirection: "row", height: 200, paddingVertical: 12 }}
        {...panResponder.panHandlers}
      >
        <YAxis
          data={[0, maxY]}
          contentInset={{ top: 10, bottom: 10 }}
          svg={{ fontSize: 10, fill: "#666" }}
          numberOfTicks={5}
        />

        <View
          style={{ flex: 1, marginLeft: 10 }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          <LineChart
            style={{ flex: 1 }}
            data={data.tutorial}
            svg={{ stroke: colors.tutorial, strokeWidth: 2 }}
            curve={shape.curveMonotoneX}
            contentInset={{ top: 10, bottom: 10 }}
            yMin={0}
            yMax={maxY}
          >
            <Grid />
            <Tooltip />
          </LineChart>

          {["weapon", "duo"].map((key) => (
            <LineChart
              key={key}
              style={StyleSheet.absoluteFill}
              data={data[key]}
              svg={{ stroke: colors[key], strokeWidth: 2 }}
              curve={shape.curveMonotoneX}
              contentInset={{ top: 10, bottom: 10 }}
              yMin={0}
              yMax={maxY}
            />
          ))}
        </View>
      </View>

      <XAxis
        style={{ marginHorizontal: -10 }}
        data={data.tutorial}
        formatLabel={(value, index) => `${index + 1}月`}
        contentInset={{ left: 25, right: 10 }}
        svg={{ fontSize: 10, fill: "#666" }}
      />

      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colors.tutorial }]} />
        <Text style={styles.legendText}>观看教程</Text>
        <View style={[styles.dot, { backgroundColor: colors.weapon }]} />
        <Text style={styles.legendText}>武器强化</Text>
        <View style={[styles.dot, { backgroundColor: colors.duo }]} />
        <Text style={styles.legendText}>双人练习</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrapper: {
    paddingHorizontal: 16,
  },
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

export default YearLineChart;
