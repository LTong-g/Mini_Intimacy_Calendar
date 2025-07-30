/**
 * 极简武器强化日历 - 日视图页面
 * 
 * 功能描述：
 * - 显示单日的详细信息
 * - 展示记录状态和图标
 * - 计算并显示坚持天数
 * - 支持左右滑动切换日期
 * - 支持手势操作
 * 
 * @component
 * @author Lyu Jiongrui
 * @version 1.0.0
 * @date 2025.7.25
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Header from '../components/Header';
import { getCheckInStatus, getCheckInIcons } from '../utils/checkInStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 日视图组件
 * 
 * @param {moment} selectedDate - 当前选中的日期
 * @param {Function} onDateChange - 日期变更回调函数
 * @param {Function} onViewChange - 视图切换回调函数
 * @returns {React.Component} 日视图组件
 */
const DayView = ({ selectedDate, onDateChange, onViewChange }) => {
  const [checkInStatus, setCheckInStatus] = useState(0);
  const [checkInIcons, setCheckInIcons]     = useState([]);
  const [breakDays, setBreakDays]           = useState(0);

  useEffect(() => {
    loadCheckInStatus();
    const interval = setInterval(loadCheckInStatus, 1000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  /**
   * 加载记录状态和历史记录
   * 获取当前日期的记录状态、图标和坚持天数
   */
  const loadCheckInStatus = async () => {
      const status = await getCheckInStatus(selectedDate);
      setCheckInStatus(status);
      setCheckInIcons(getCheckInIcons(status));
      
      try {
        const stored = await AsyncStorage.getItem('checkin_status');
        const checkInData = stored ? JSON.parse(stored) : {};
        
        const checkInDates = Object.keys(checkInData)
          .filter(date => checkInData[date] && checkInData[date] > 0)
          .sort((a, b) => new Date(b) - new Date(a));
        
        if (checkInDates.length === 0) {
          setBreakDays('--');
          return;
        }
        
        const selectedDateStr = selectedDate.format('YYYY-MM-DD');
        if (checkInDates.includes(selectedDateStr)) {
          setBreakDays(0);
        } else {
          let lastCheckInDate = null;
          for (const dateStr of checkInDates) {
            if (new Date(dateStr) <= new Date(selectedDateStr)) {
              lastCheckInDate = dateStr;
              break;
            }
          }
          
          if (!lastCheckInDate) {
            setBreakDays('--');
          } else {
            const d1 = new Date(selectedDateStr);
            const d2 = new Date(lastCheckInDate);
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
            setBreakDays(diffDays);
          }
        }
      } catch (error) {
        console.error('Error loading check-in history:', error);
        setBreakDays('∞');
      }
    };

  // 图标对应的状态位掩码
  const iconMaskMap = {
    desktop: 1,
    airplane: 2,
    heart: 4,
  };

  /**
   * 长按图标时震动并取消对应记录
   * @param {string} iconName - 图标名称
   */
  const handleCancelIcon = async (iconName) => {
    Vibration.vibrate(30);
    try {
      const dateKey = selectedDate.format('YYYY-MM-DD');
      const stored  = await AsyncStorage.getItem('checkin_status');
      const data    = stored ? JSON.parse(stored) : {};
      const oldStatus = data[dateKey] || 0;
      const mask      = iconMaskMap[iconName] || 0;
      const newStatus = oldStatus & ~mask;

      if (newStatus > 0) {
        data[dateKey] = newStatus;
      } else {
        delete data[dateKey];
      }
      await AsyncStorage.setItem('checkin_status', JSON.stringify(data));
      loadCheckInStatus();
    } catch (error) {
      console.error('取消记录失败：', error);
    }
  };

  /**
   * 切换到前一天
   */
  const handlePreviousDay = () => {
    onDateChange(selectedDate.clone().subtract(1, 'day'));
  };

  /**
   * 切换到后一天
   */
  const handleNextDay = () => {
    const nextDay = selectedDate.clone().add(1, 'day').startOf('day');
    if (nextDay.isAfter(moment().startOf('day'))) return;
    onDateChange(nextDay);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gs) => {
      const { dx, dy } = gs;
      return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
    },
    onPanResponderRelease: (evt, gs) => {
      const { dx } = gs;
      const threshold = 50;
      if (dx > threshold) {
        handlePreviousDay();
      } else if (dx < -threshold) {
        handleNextDay();
      }
    },
  });

  const isNextDayDisabled = selectedDate.clone().add(1, 'day').isAfter(moment().startOf('day'));

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Header
        title={selectedDate.format('YYYY年MM月DD日')}
        onPrevious={handlePreviousDay}
        onNext={handleNextDay}
        disableNext={isNextDayDisabled}
      />
      
      <View style={styles.dateInfo}>
        <Text style={styles.weekdayText}>{selectedDate.format('dddd')}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.checkInContainer}>
          <Text style={styles.checkInTitle}>
            {checkInStatus > 0 ? '今日记录' : '已经坚持'}
          </Text>
          {checkInIcons.length === 0 ? (
            <View style={styles.breakContainer}>
              <Text style={styles.breakDaysText}>{breakDays}</Text>
              <Text style={styles.breakDaysUnit}>天</Text>
            </View>
          ) : (
            <View style={styles.circleContainer}>
              {checkInIcons.map((item, index) => {
                let positionStyle = {};
                if (checkInIcons.length === 1) {
                  positionStyle = styles.singlePosition;
                } else if (checkInIcons.length === 2) {
                  positionStyle = index === 0
                    ? styles.leftPosition
                    : styles.rightPosition;
                } else {
                  positionStyle = [
                    styles.trianglePosition,
                    index === 0
                      ? styles.topPosition
                      : index === 1
                        ? styles.leftBottom
                        : styles.rightBottom
                  ];
                }
                const bgColors = {
                  desktop: '#FFE082',
                  airplane: '#B3E5FC',
                  heart: '#FFCDD2'
                };
                return (
                  <Pressable
                    key={index}
                    onLongPress={() => handleCancelIcon(item.icon)}
                    delayLongPress={500}
                    style={[
                      styles.checkInIconWrapper,
                      positionStyle,
                      { backgroundColor: bgColors[item.icon] }
                    ]}
                  >
                    <Ionicons name={item.icon} size={48} color={item.color} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dateInfo: {
    backgroundColor: '#fff',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekdayText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  checkInContainer: {
    alignItems: 'center',
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  breakContainer: {
    width: '70%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  breakDaysText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FF5252',
    lineHeight: 72,
  },
  breakDaysUnit: {
    fontSize: 24,
    color: '#FF5252',
    marginLeft: 8,
    marginTop: 24,
  },
  circleContainer: {
    width: '70%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkInIconWrapper: {
    margin: 8,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  singlePosition: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -48,
    marginTop: -48,
  },
  leftPosition: {
    position: 'absolute',
    top: '50%',
    left: '25%',
    marginLeft: -48,
    marginTop: -48,
  },
  rightPosition: {
    position: 'absolute',
    top: '50%',
    right: '25%',
    marginRight: -48,
    marginTop: -48,
  },
  trianglePosition: {
    position: 'absolute',
  },
  topPosition: {
    top: '10%',
    left: '50%',
    marginLeft: -48,
  },
  leftBottom: {
    bottom: '10%',
    left: '29%',
    marginLeft: -48,
  },
  rightBottom: {
    bottom: '10%',
    right: '29%',
    marginRight: -48,
  },
});

export default DayView;
