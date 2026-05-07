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
import DateQuickPickerModal from '../components/DateQuickPickerModal';
import { getCachedCheckInStatusMap, getCheckInStatusMap, CheckInTypes } from '../utils/checkInStorage';
import { Svg, Path } from 'react-native-svg';

const getMonthKey = (date) => date.format('YYYY-MM');

const getMonthRange = (date) => ({
  start: date.clone().startOf('month'),
  end: date.clone().endOf('month'),
});

const getCachedMonthCheckInDataState = (targetMonth) => {
  const { start, end } = getMonthRange(targetMonth);
  const data = getCachedCheckInStatusMap(start, end);
  return data ? { key: getMonthKey(targetMonth), data } : null;
};

/**
 * 月份视图组件
 * @param {Object} selectedDate - 当前选中的日期 (moment对象)
 * @param {Function} onDateChange - 日期改变回调函数
 * @param {Function} onViewChange - 视图切换回调函数
 * @param {number} refreshKey - 刷新键，用于强制重新加载数据
 * @returns {JSX.Element} 月份视图组件
 */
const MonthView = ({
  selectedDate,
  onDateChange,
  onViewChange,
  refreshKey = 0,
  onQuickMonthChange = null,
}) => {
  const initialMonth = selectedDate.clone();
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [checkInDataState, setCheckInDataState] = useState(() =>
    getCachedMonthCheckInDataState(initialMonth)
  );
  const [quickPickerVisible, setQuickPickerVisible] = useState(false);
  const currentMonthKey = getMonthKey(currentMonth);
  const checkInDataReady = checkInDataState?.key === currentMonthKey;
  const checkInData = checkInDataReady ? checkInDataState.data : null;

  const applyCurrentMonth = (targetMonth) => {
    setCheckInDataState(getCachedMonthCheckInDataState(targetMonth));
    setCurrentMonth(targetMonth);
  };

  useEffect(() => {
    let cancelled = false;
    const targetMonthKey = getMonthKey(currentMonth);

    loadCheckInData(currentMonth).then((data) => {
      if (!cancelled) {
        setCheckInDataState({ key: targetMonthKey, data });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentMonth, refreshKey]);

  /**
   * 加载当月的记录数据
   * 获取整个月份每一天的记录状态
   */
  const loadCheckInData = async (targetMonth) => {
    const { start, end } = getMonthRange(targetMonth);
    return getCheckInStatusMap(start, end);
  };

  /**
   * 生成日历天数数据
   * 包括当前月份的所有天数，以及前后补全的日期
   * @returns {Array} 日历天数数组，包含日期、是否当月、是否今天、记录状态等信息
   */
  const generateCalendarDays = () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    // const startDate = startOfMonth.clone().startOf('week');
    // const endDate = endOfMonth.clone().endOf('week');
    const startDate = startOfMonth.clone().startOf('day').subtract(startOfMonth.day(), 'days');
    const endDate = endOfMonth.clone().endOf('day').add(6 - endOfMonth.day(), 'days');

    const days = [];
    let current = startDate.clone();

    while (current.isSameOrBefore(endDate, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');
      const status = checkInData?.[dateStr] || CheckInTypes.NONE;
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
    applyCurrentMonth(selectedDate.clone());
  }, [selectedDate]);

  useEffect(() => {
    const today = moment();
    setShowTodayButton(
      !selectedDate.isSame(today, 'day') || !currentMonth.isSame(today, 'month')
    );
  }, [selectedDate, currentMonth]);

  const calendarDays = generateCalendarDays();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  /**
   * 切换到上个月
   */
  const handlePreviousMonth = () => {
    applyCurrentMonth(currentMonth.clone().subtract(1, 'month'));
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
    
    applyCurrentMonth(nextMonth);
  };

  const handleDatePress = (date) => {
    const today = moment().startOf('day');
    const pressedDay = date.clone().startOf('day');
    const selectedDay = selectedDate.clone().startOf('day');

    const isOutsideCurrentMonth =
      pressedDay.isBefore(currentMonth.clone().startOf('month'), 'day') ||
      pressedDay.isAfter(currentMonth.clone().endOf('month'), 'day');

    if (isOutsideCurrentMonth) {
      if (pressedDay.isAfter(today, 'day')) {
        return;
      }

      applyCurrentMonth(pressedDay.clone().startOf('month'));
      onDateChange(pressedDay);
      return;
    }

    onDateChange(pressedDay);
    if (pressedDay.isSame(selectedDay, 'day') && !pressedDay.isAfter(today, 'day')) {
      onViewChange('Day', pressedDay);
    }
  };

  const handleTodayPress = () => {
    const today = moment().startOf('day');
    applyCurrentMonth(today);
    onDateChange(today);
  };

  const handleQuickPickerConfirm = (date) => {
    setQuickPickerVisible(false);

    const targetMonth = date.clone().startOf('month');
    const targetDate = targetMonth
      .clone()
      .date(Math.min(selectedDate.date(), targetMonth.daysInMonth()))
      .startOf('day');

    applyCurrentMonth(targetMonth);
    if (onQuickMonthChange) {
      onQuickMonthChange(targetDate);
    } else {
      onDateChange(targetDate);
    }
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
      if (hasType1) colors.push('#FFD54F');  // 略微加深的观看教程类型颜色
      if (hasType2) colors.push('#81D4FA');  // 略微加深的武器强化类型颜色
      if (hasType3) colors.push('#F48FB1');  // 略微加深的双人练习类型颜色
      
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
          item.date.isSame(selectedDate, 'day') && styles.selectedDay,
          item.isToday && styles.todayContainer,
        ]}
        onPress={() => handleDatePress(item.date)}
      >
        {renderCheckInColors()}
        <Text
          style={[
            styles.dayText,
            !item.isCurrentMonth && styles.inactiveText,
            item.date.isSame(selectedDate, 'day') && styles.selectedText,
            item.isToday && styles.todayText,
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
        onTitlePress={() => setQuickPickerVisible(true)}
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

      <DateQuickPickerModal
        visible={quickPickerVisible}
        mode="month"
        value={currentMonth}
        onConfirm={handleQuickPickerConfirm}
        onCancel={() => setQuickPickerVisible(false)}
      />
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
  // 容器样式，整个页面占满全屏，背景为浅灰色
  container: {
    flex: 1, // 占据所有可用空间
    backgroundColor: '#fff',
  },

  // 月份文字样式
  monthText: {
    fontSize: 20, // 字体大小
    fontWeight: 'bold', // 粗体
    color: '#333', // 深灰色字体
  },

  // 星期标题栏容器（如“日一二三四五六”）
  weekDaysContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row', // 子元素横向排列
    justifyContent: 'space-around', // 子元素均匀分布
    paddingVertical: 10, // 上下内边距
    borderBottomWidth: 1, // 下边框线宽度
    borderBottomColor: '#e0e0e0', // 下边框颜色
  },

  // 单个星期文字样式（如“日”）
  weekDayText: {
    fontSize: 14, // 字体大小
    color: '#666', // 中灰色
    fontWeight: 'bold', // 粗体
    width: `${100/7}%`, // 平均分配一周七天宽度
    textAlign: 'center', // 居中对齐
  },

  // 每天格子的容器样式
  dayContainer: {
    width: `${100/7}%`, // 每列宽度占 1/7
    aspectRatio: 1, // 保持正方形比例（宽高相等）
    justifyContent: 'center', // 垂直居中
    alignItems: 'center', // 水平居中
    marginVertical: 2, // 上下间距
  },

  // 每天数字的样式
  dayText: {
    fontSize: 16, // 字号
    color: '#333', // 字体颜色为深灰
  },

  // 非当前月份的日期格子样式（变暗）
  inactiveDay: {
    opacity: 0.3, // 透明度降低，视觉上淡化
  },

  // 非当前月份的日期文字样式
  inactiveText: {
    color: '#999', // 更浅的灰色字体
  },

  // 今天日期的容器样式（圆形背景色）
  todayContainer: {
    backgroundColor: '#007AFF', // 蓝色背景
    borderRadius: 1000, // 大圆角，形成圆形
  },

  // 今天的文字样式
  todayText: {
    color: '#fff', // 白色文字
    fontWeight: 'bold', // 粗体
  },

  // 被选中的日期样式
  selectedDay: {
    borderRadius: 1000, // 圆形边框
    borderWidth: 2, // 边框宽度
    borderColor: '#007AFF', // 边框为蓝色
    backgroundColor: 'rgba(0,122,255,0)', // 背景透明但保留结构
  },

  // 打卡背景容器（用于实现彩色底色圆）
  checkInBackground: {
    position: 'absolute', // 绝对定位覆盖在格子上
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 1000, // 圆形
    overflow: 'hidden', // 限制子元素超出
  },

  // 半圆颜色块样式（打卡底色之一）
  halfColor: {
    position: 'absolute', // 绝对定位
    top: 0,
    bottom: 0,
    width: '50%', // 一半宽度（左或右半圆）
  },

  // 打卡日期文字样式（通常为白色）
  checkInText: {
    color: '#fff', // 白色文字
  },

  // 被选中日期的文字样式
  selectedText: {
    color: '#000', // 黑色文字
    fontWeight: 'bold', // 加粗
  },

  // “返回今天”按钮的容器样式（右下角浮动按钮）
  todayButton: {
    position: 'absolute', // 绝对定位
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28, // 圆形按钮
    backgroundColor: '#FFFFFF', // 白底
    elevation: 8, // 安卓投影高度
    shadowColor: '#000', // iOS 阴影颜色
    shadowOffset: { width: 0, height: 4 }, // iOS 阴影偏移
    shadowOpacity: 0.3, // iOS 阴影透明度
    shadowRadius: 8, // iOS 阴影半径
    justifyContent: 'center', // 垂直居中
    alignItems: 'center', // 水平居中
  },

  // “返回今天”按钮内部图标样式
  todayIcon: {
    justifyContent: 'center', // 垂直居中
    alignItems: 'center', // 水平居中
    backgroundColor: '#fff', // 白底
    borderRadius: 28, // 圆形
    width: 56,
    height: 56,
    elevation: 8, // 安卓阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // iOS 阴影偏移
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // 日历中某个特殊显示格子的边框样式（如小正方框）
  calendarBox: {
    width: 36,
    height: 32,
    borderWidth: 1.5, // 边框宽度
    borderColor: '#007AFF', // 蓝色边框
    borderRadius: 6, // 圆角矩形
    justifyContent: 'center', // 垂直居中
    alignItems: 'center', // 水平居中
    backgroundColor: '#FFFFFF', // 白色背景
  },

  // 今日数字样式（用于强调当天）
  todayNumber: {
    color: '#007AFF', // 蓝色
    fontSize: 14,
    fontWeight: 'bold',
  },
});


export default MonthView;
