/**
 * 极简武器强化日历 - 年份视图组件（底色整合自月视图）
 * 显示年度概览，包含12个月份的迷你日历，支持三种打卡类型底色（svg三等分圆）
 * @author Lyu Jiongrui
 * @version 1.0.0
 * @date 2025.7.25
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  PanResponder,
  Dimensions,
} from "react-native";
import moment from "moment";
import Header from "../components/Header";
import { Svg, Path } from "react-native-svg";
import { getCheckInStatus, CheckInTypes } from "../utils/checkInStorage";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
const monthWidth = (screenWidth - 3 * 2 * 8 - 2 * 10) / 3; // 3列 + 3个间距 + 2个10px间距
const dayDotSize = (monthWidth - 2 * 6 - 2 * 4) / 7 - 2; // 每行7个点，减去间距
const monthHeight = monthWidth;

const YearView = ({ onDateChange, onViewChange, selectedDate }) => {
  const [currentYear, setCurrentYear] = useState(selectedDate.year());
  const [checkInData, setCheckInData] = useState({});

  const months = [
    { name: "一月", month: 0 },
    { name: "二月", month: 1 },
    { name: "三月", month: 2 },
    { name: "四月", month: 3 },
    { name: "五月", month: 4 },
    { name: "六月", month: 5 },
    { name: "七月", month: 6 },
    { name: "八月", month: 7 },
    { name: "九月", month: 8 },
    { name: "十月", month: 9 },
    { name: "十一月", month: 10 },
    { name: "十二月", month: 11 },
  ];

  useEffect(() => {
    loadYearCheckInData();
  }, [currentYear]);

  const loadYearCheckInData = async () => {
    const start = moment().year(currentYear).startOf("year");
    const end = moment().year(currentYear).endOf("year");
    const data = {};
    let current = start.clone();
    while (current.isSameOrBefore(end, "day")) {
      const status = await getCheckInStatus(current);
      data[current.format("YYYY-MM-DD")] = status;
      current.add(1, "day");
    }
    setCheckInData(data);
  };

  const generateMonthPreview = (monthIndex) => {
    const month = moment().year(currentYear).month(monthIndex).date(1);
    const firstDay = month.day();
    const daysInMonth = month.daysInMonth();
    const preview = [];
    for (let i = 0; i < firstDay; i++) {
      preview.push({ key: `empty-${i}`, type: "empty" });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = month.clone().date(day);
      const status =
        checkInData[date.format("YYYY-MM-DD")] || CheckInTypes.NONE;
      preview.push({
        key: `day-${day}`,
        type: "day",
        day,
        date,
        checkInStatus: status,
        isToday: date.isSame(moment(), "day"),
        isSelected: date.isSame(selectedDate, "day"),
      });
    }
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - preview.length;
    for (let i = 0; i < remainingCells; i++) {
      preview.push({ key: `trailing-${i}`, type: "empty" });
    }
    return preview;
  };

  const renderCheckInDot = (cell) => {
    const status = cell.checkInStatus;
    const hasType1 = status & CheckInTypes.TYPE1;
    const hasType2 = status & CheckInTypes.TYPE2;
    const hasType3 = status & CheckInTypes.TYPE3;
    const colors = [];
    if (hasType2) colors.push("#81D4FA");
    if (hasType3) colors.push("#F48FB1");
    if (hasType1) colors.push("#FFD54F");
    const total = colors.length;
    if (total === 0) return <View style={[styles.dayDot, styles.realDay]} />;
    if (total === 1)
      return <View style={[styles.dayDot, { backgroundColor: colors[0] }]} />;
    return (
      <Svg width={dayDotSize} height={dayDotSize} viewBox="0 0 36 36">
        {colors.map((color, index) => (
          <Path
            key={index}
            d={describeArc(
              18,
              18,
              18,
              (index * 360) / total,
              ((index + 1) * 360) / total
            )}
            fill={color}
          />
        ))}
      </Svg>
    );
  };

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (x, y, r, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      `M ${x} ${y}`,
      `L ${start.x} ${start.y}`,
      `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  };

  const handlePreviousYear = () => setCurrentYear(currentYear - 1);
  const handleNextYear = () => {
    if (currentYear < moment().year()) setCurrentYear(currentYear + 1);
  };

  const handleMonthPress = (monthIndex) => {
    const newDate = moment(selectedDate).year(currentYear).month(monthIndex);
    if (newDate.isAfter(moment(), "month")) return;
    onDateChange(newDate);
    onViewChange("Month");
  };

  // 辅助函数：将数组按 size 切块为二维数组
  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  // 月份渲染函数
  const renderMonth = ({ item }) => {
    const monthPreview = generateMonthPreview(item.month);
    const currentDate = moment();
    const isFutureMonth =
      currentYear > currentDate.year() ||
      (currentYear === currentDate.year() && item.month > currentDate.month());

    return (
      <TouchableOpacity
        style={[styles.monthContainer, isFutureMonth && styles.disabledMonth]}
        onPress={() => !isFutureMonth && handleMonthPress(item.month)}
        disabled={isFutureMonth}
      >
        <Text
          style={[styles.monthName, isFutureMonth && styles.disabledMonthText]}
        >
          {item.name}
        </Text>

        <View style={styles.monthGrid}>
          {chunkArray(monthPreview, 7).map((weekRow, rowIdx) => (
            <View key={rowIdx} style={styles.weekRow}>
              {weekRow.map((cell) => (
                <View key={cell.key} style={styles.dayDotWrapper}>
                  {cell.type === "day" ? (
                    renderCheckInDot(cell)
                  ) : (
                    <View style={[styles.dayDot, styles.emptyDot]} />
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx } = gestureState;
      const swipeThreshold = 50;
      if (dx > swipeThreshold) handlePreviousYear();
      else if (dx < -swipeThreshold) handleNextYear();
    },
  });

  const isNextYearDisabled = currentYear >= moment().year();
  const isNotCurrentYear = currentYear !== moment().year();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Header
        title={`${currentYear}年`}
        onPrevious={handlePreviousYear}
        onNext={handleNextYear}
        disableNext={isNextYearDisabled}
      />
      <FlatList
        data={months}
        renderItem={renderMonth}
        keyExtractor={(item) => `${currentYear}-${item.month}`}
        contentContainerStyle={styles.monthsContainer}
      />

      {isNotCurrentYear && (
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => {
            // 切回今天
            const today = moment().startOf("day");
            onDateChange(today);
            setCurrentYear(today.year());
          }}
        >
          <View style={styles.calendarBox}>
            <Text style={styles.todayNumber}>{moment().date()}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  monthsContainer: {
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthContainer: {
    flex: 1,
    margin: 8,
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: monthWidth,
    height: monthHeight,
  },
  disabledMonth: {
    backgroundColor: "#f5f5f5",
    elevation: 0,
    shadowOpacity: 0,
  },
  monthName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
    paddingLeft: 3,
  },
  disabledMonthText: {
    color: "#999",
  },
  monthGrid: {
    flexDirection: "column", // 原来是 'row'
    flexWrap: "nowrap", // 原来是 'wrap'
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  realDay: {
    backgroundColor: "#ddd",
  },
  emptyDot: {
    backgroundColor: "transparent",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  dayDotWrapper: {
    width: dayDotSize,
    height: dayDotSize,
    marginHorizontal: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayDot: {
    width: dayDotSize,
    height: dayDotSize,
    borderRadius: 100,
  },
  todayButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarBox: {
    width: 36,
    height: 32,
    borderWidth: 1.5,
    borderColor: "#007AFF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  todayNumber: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default YearView;
