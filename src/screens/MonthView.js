/**
 * 极简武器强化日历 - 月份视图组件
 * 显示月度日历，支持记录状态显示和日期选择
 * @author Lyu Jiongrui
 * @version 1.0.0
 * @date 2025.7.25
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, PanResponder } from 'react-native';
import moment from 'moment';
import Header from '../components/Header';
import { getCheckInStatus, CheckInTypes, getCheckInIcons } from '../utils/checkInStorage';
import { Svg, Path } from 'react-native-svg';

/**
 * 月份视图组件
 * @param {Object} selectedDate - 当前选中的日期 (moment对象)
 * @param {Function} onDateChange - 日期改变回调函数
 * @param {Function} onViewChange - 视图切换回调函数
 * @param {number} refreshKey - 刷新键，用于强制重新加载数据
 * @returns {JSX.Element} 月份视图组件
 */
const MonthView = ({ selectedDate, onDateChange, onViewChange, refreshKey = 0 }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.clone());
  const [checkInData, setCheckInData] = useState({});

  useEffect(() => {
    loadCheckInData();
  }, [currentMonth, refreshKey]);

  /**
   * 加载当月的记录数据
   * 获取整个月份每一天的记录状态
   */
  const loadCheckInData = async () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const data = {};
    
    let current = startOfMonth.clone();
    while (current.isSameOrBefore(endOfMonth, 'day')) {
      const status = await getCheckInStatus(current);
      data[current.format('YYYY-MM-DD')] = status;
      current.add(1, 'day');
    }
    
    setCheckInData(data);
  };

  /**
   * 生成日历天数数据
   * 包括当前月份的所有天数，以及前后补全的日期
   * @returns {Array} 日历天数数组，包含日期、是否当月、是否今天、记录状态等信息
   */
  const generateCalendarDays = () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDate = startOfMonth.clone().startOf('week');
    const endDate = endOfMonth.clone().endOf('week');

    const days = [];
    let current = startDate.clone();

    while (current.isSameOrBefore(endDate, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');
      const status = checkInData[dateStr] || CheckInTypes.NONE;
      days.push({
        date: current.clone(),
        isCurrentMonth: current.month() === currentMonth.month(),
        isToday: current.isSame(moment(), 'day'),
        checkInStatus: status,
      });
      current.add(1, 'day');
    }

    return days;
  };

  const [showTodayButton, setShowTodayButton] = useState(false);

  useEffect(() => {
    setCurrentMonth(selectedDate.clone());
  }, [selectedDate]);

  useEffect(() => {
    const today = moment();
    setShowTodayButton(!selectedDate.isSame(today, 'day'));
  }, [selectedDate]);

  const calendarDays = generateCalendarDays();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  /**
   * 切换到上个月
   */
  const handlePreviousMonth = () => {
    setCurrentMonth(currentMonth.clone().subtract(1, 'month'));
  };

  /**
   * 切换到下个月
   * 如果下个月是未来月份，则不允许切换
   */
  const handleNextMonth = () => {
    const nextMonth = currentMonth.clone().add(1, 'month');
    
    // 如果下一个月是未来月份，不允许切换
    if (nextMonth.isAfter(moment(), 'month')) {
      return;
    }
    
    setCurrentMonth(nextMonth);
  };

  const handleDatePress = (date) => {
    if (date.month() === currentMonth.month()) {
      onDateChange(date);
    }
  };

  const handleTodayPress = () => {
    const today = moment();
    setCurrentMonth(today);
    onDateChange(today);
  };

  const CheckInDay = ({ item }) => {
    const { checkInStatus } = item;
    const hasType1 = checkInStatus & CheckInTypes.TYPE1;
    const hasType2 = checkInStatus & CheckInTypes.TYPE2;
    const hasType3 = checkInStatus & CheckInTypes.TYPE3;
    
    const totalTypes = (hasType1 ? 1 : 0) + (hasType2 ? 1 : 0) + (hasType3 ? 1 : 0);
    
    const renderCheckInColors = () => {
      if (totalTypes === 0) return null;
      
      const colors = [];
      if (hasType1) colors.push('#FFD54F');  // 略微加深的工作类型颜色
      if (hasType2) colors.push('#81D4FA');  // 略微加深的出行类型颜色
      if (hasType3) colors.push('#F48FB1');  // 略微加深的健康类型颜色
      
      if (totalTypes === 1) {
        return <View style={[styles.checkInBackground, { backgroundColor: colors[0] }]} />;
      }
      
      if (totalTypes === 2) {
        return (
          <View style={styles.checkInBackground}>
            <View style={[styles.halfColor, { backgroundColor: colors[0], left: 0 }]} />
            <View style={[styles.halfColor, { backgroundColor: colors[1], right: 0 }]} />
          </View>
        );
      }
      
      if (totalTypes === 3) {
        return (
          <View style={StyleSheet.absoluteFillObject}>
            <Svg width="100%" height="100%" viewBox="0 0 36 36">
              <Path d={describeArc(18, 18, 18, 0, 120)} fill={colors[1]} />
              <Path d={describeArc(18, 18, 18, 120, 240)} fill={colors[2]} />
              <Path d={describeArc(18, 18, 18, 240, 360)} fill={colors[0]} />
            </Svg>
          </View>
        );
      }

    };

    return (
      <TouchableOpacity
        style={[
          styles.dayContainer,
          !item.isCurrentMonth && styles.inactiveDay,
          item.isToday && styles.todayContainer,
          item.date.isSame(selectedDate, 'day') && styles.selectedDay,
        ]}
        onPress={() => handleDatePress(item.date)}
      >
        {renderCheckInColors()}
        <Text
          style={[
            styles.dayText,
            !item.isCurrentMonth && styles.inactiveText,
            item.isToday && styles.todayText,
            item.date.isSame(selectedDate, 'day') && styles.selectedText,
            totalTypes > 0 && styles.checkInText,
          ]}
        >
          {item.date.date()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDay = ({ item }) => <CheckInDay item={item} />;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx } = gestureState;
      const swipeThreshold = 50;
      
      if (dx > swipeThreshold) {
        handlePreviousMonth();
      } else if (dx < -swipeThreshold) {
        handleNextMonth();
      }
    },
  });

  const isNextMonthDisabled = currentMonth.clone().add(1, 'month').isAfter(moment(), 'month');

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Header
        title={currentMonth.format('YYYY年MM月')}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
        disableNext={isNextMonthDisabled}
      />
      
      <View style={styles.weekDaysContainer}>
        {weekDays.map(day => (
          <Text key={day} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>
      
      <FlatList
        data={calendarDays}
        renderItem={renderDay}
        keyExtractor={(item) => item.date.format('YYYY-MM-DD')}
        numColumns={7}
        scrollEnabled={false}
      />
      
      {showTodayButton && (
        <TouchableOpacity style={styles.todayButton} onPress={handleTodayPress}>
          <View style={styles.calendarBox}>
            <Text style={styles.todayNumber}>{moment().date()}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// 极坐标转换为笛卡尔坐标
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

// 描述一个扇形路径
const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  const d = [
    `M ${x} ${y}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');

  return d;
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekDayText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
    width: `${100/7}%`,
    textAlign: 'center',
  },
  dayContainer: {
    width: `${100/7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  inactiveDay: {
    opacity: 0.3,
  },
  inactiveText: {
    color: '#999',
  },
  todayContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 1000,
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedDay: {
    backgroundColor: '#34C759',
    borderRadius: 1000,
  },
  checkInBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 1000, // Large value to make it circular
    overflow: 'hidden',
  },
  halfColor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  triangleShape: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  segmentShape: {
    position: 'absolute',
  },
  colorSegment: {
    position: 'absolute',
  },
  checkInText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    width: 56,
    height: 56,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calendarBox: {
    width: 36,
    height: 32,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  todayNumber: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default MonthView;