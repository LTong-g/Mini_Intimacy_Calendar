/**
 * 极简武器强化日历 - 日视图页面
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Pressable,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/zh-cn';
import Header from '../components/Header';
import CountAdjustModal from '../components/CountAdjustModal';
import DateQuickPickerModal from '../../../shared/components/DateQuickPickerModal';
import { showAppAlert } from '../../../shared/utils/appAlert';
import {
  CheckInCountKeys,
  getAutoTutorialMinimum,
  getEffectiveCheckInData,
  getCheckInRecord,
  getCheckInRecordCount,
  normalizeCheckInRecord,
  setCheckInRecord,
} from '../utils/checkInStorage';

const VIBRATION_MS = 30;
const LONG_PRESS_TICK_MS = 1000;
const LONG_PRESS_CONFIRM_TICKS = 3;

const TYPE_META = [
  {
    key: CheckInCountKeys.TYPE1,
    icon: 'desktop',
    color: '#F57F17',
    bgColor: '#FFE082',
  },
  {
    key: CheckInCountKeys.TYPE2,
    icon: 'airplane',
    color: '#0277BD',
    bgColor: '#B3E5FC',
  },
  {
    key: CheckInCountKeys.TYPE3,
    icon: 'heart',
    color: '#C62828',
    bgColor: '#FFCDD2',
  },
];

const clampInteger = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const recordHasAnyCheckIn = (item) => {
  const record = normalizeCheckInRecord(item);
  return record.tutorial > 0 || record.weapon > 0 || record.duo > 0;
};

const calculateBreakDays = (data, selectedDateStr) => {
  const checkInDates = Object.keys(data)
    .filter((dateStr) => recordHasAnyCheckIn(data[dateStr]))
    .sort((a, b) => new Date(b) - new Date(a));

  if (checkInDates.length === 0) {
    return '--';
  }

  if (checkInDates.includes(selectedDateStr)) {
    return 0;
  }

  const lastCheckInDate = checkInDates.find((dateStr) => new Date(dateStr) <= new Date(selectedDateStr));

  if (!lastCheckInDate) {
    return '--';
  }

  const d1 = new Date(selectedDateStr);
  const d2 = new Date(lastCheckInDate);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
};

const DayView = ({ selectedDate, onDateChange, refreshKey = 0 }) => {
  const navigation = useNavigation();
  const [record, setRecord] = useState({
    tutorial: 0,
    weapon: 0,
    duo: 0,
  });
  const [breakDays, setBreakDays] = useState('--');
  const [editingVisible, setEditingVisible] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editingValue, setEditingValue] = useState('0');
  const [tutorialMinimum, setTutorialMinimum] = useState(0);
  const [quickPickerVisible, setQuickPickerVisible] = useState(false);
  const liveRecordRef = useRef({
    tutorial: 0,
    weapon: 0,
    duo: 0,
  });
  const manualRecordRef = useRef({
    tutorial: 0,
    weapon: 0,
    duo: 0,
  });
  const allDataRef = useRef({});
  const tutorialMinimumRef = useRef(0);

  const holdRef = useRef({
    active: false,
    typeKey: null,
    direction: 0,
    ticks: 0,
    timer: null,
    baseline: null,
  });

  const loadState = async () => {
    try {
      const [data, minimum, manualRecord] = await Promise.all([
        getEffectiveCheckInData(),
        getAutoTutorialMinimum(selectedDate),
        getCheckInRecord(selectedDate),
      ]);
      allDataRef.current = data;
      tutorialMinimumRef.current = minimum;
      setTutorialMinimum(minimum);
      const selectedDateStr = selectedDate.format('YYYY-MM-DD');
      const currentRecord = normalizeCheckInRecord(data[selectedDateStr]);
      manualRecordRef.current = normalizeCheckInRecord(manualRecord);
      const nextBreakDays = calculateBreakDays(data, selectedDateStr);
      setBreakDays(nextBreakDays);
      setRecord(currentRecord);
      liveRecordRef.current = currentRecord;
    } catch (error) {
      console.error('Error loading day view state:', error);
      setBreakDays('∞');
    }
  };

  useEffect(() => {
    loadState();
    return () => clearHoldTimer();
  }, [selectedDate, refreshKey]);

  const totalCount = record.tutorial + record.weapon + record.duo;

  const clearHoldTimer = () => {
    if (holdRef.current.timer) {
      clearInterval(holdRef.current.timer);
      holdRef.current.timer = null;
    }
  };

  const resetHoldState = () => {
    clearHoldTimer();
    holdRef.current = {
      active: false,
      typeKey: null,
      direction: 0,
      ticks: 0,
      timer: null,
      baseline: null,
    };
  };

  const finishHoldToModal = () => {
    clearHoldTimer();
    const typeKey = holdRef.current.typeKey;
    if (!typeKey) {
      resetHoldState();
      return;
    }

    setEditingType(typeKey);
    setEditingValue(String(getCheckInRecordCount(liveRecordRef.current, typeKey)));
    setEditingVisible(true);
    holdRef.current.active = false;
  };

  const showAutoMinimumNotice = () => {
    const selectedDateStr = selectedDate.format('YYYY-MM-DD');
    showAppAlert(
      '无法取消自动记录',
      '该观看教程记录由黑名单应用使用记录自动生成，当前次数不能低于自动记录次数。',
      [
        {
          text: '查看记录',
          onPress: () => {
            navigation.navigate('ExperimentalUsageIntervalRecords', {
              packageName: '__all__',
              filterDate: selectedDateStr,
            });
          },
        },
        { text: '知道了' },
      ]
    );
  };

  const runHoldStep = () => {
    const { typeKey, direction } = holdRef.current;
    if (!typeKey) return;

    const current = clampInteger(liveRecordRef.current[typeKey]);
    const minimum = typeKey === CheckInCountKeys.TYPE1 ? tutorialMinimumRef.current : 0;

    if (direction < 0 && minimum > 0 && current <= minimum) {
      Vibration.vibrate(VIBRATION_MS);
      clearHoldTimer();
      holdRef.current.active = false;
      showAutoMinimumNotice();
      return;
    }

    const next = {
      ...liveRecordRef.current,
      [typeKey]: Math.max(minimum, current + direction),
    };
    const nextTotal = next.tutorial + next.weapon + next.duo;
    const selectedDateStr = selectedDate.format('YYYY-MM-DD');
    const nextData = { ...allDataRef.current };
    if (nextTotal > 0) {
      nextData[selectedDateStr] = next;
    } else {
      delete nextData[selectedDateStr];
      setBreakDays(calculateBreakDays(nextData, selectedDateStr));
    }
    allDataRef.current = nextData;
    liveRecordRef.current = next;
    setRecord(next);
    const nextManualRecord = {
      ...normalizeCheckInRecord(manualRecordRef.current),
      [typeKey]: next[typeKey],
    };
    manualRecordRef.current = nextManualRecord;
    const saveTask = setCheckInRecord(selectedDate, nextManualRecord);
    Vibration.vibrate(VIBRATION_MS);

    if (direction < 0 && next[typeKey] === 0) {
      clearHoldTimer();
      holdRef.current.active = false;
      if (nextTotal === 0) {
        void saveTask.then(loadState);
      }
      return;
    }

    holdRef.current.ticks += 1;
    if (holdRef.current.ticks >= LONG_PRESS_CONFIRM_TICKS) {
      finishHoldToModal();
    }
  };

  const startHold = (typeKey, direction) => {
    if (holdRef.current.active) return;

    holdRef.current = {
      active: true,
      typeKey,
      direction,
      ticks: 0,
      timer: null,
      baseline: normalizeCheckInRecord(liveRecordRef.current),
    };

    runHoldStep();
    if (!holdRef.current.active) return;

    holdRef.current.timer = setInterval(runHoldStep, LONG_PRESS_TICK_MS);
  };

  const handleHoldPressOut = () => {
    if (!holdRef.current.active || editingVisible) return;
    clearHoldTimer();
    holdRef.current.active = false;
  };

  const handleConfirmEdit = async (selectedValue) => {
    if (!editingType) return;
    const minimum = editingType === CheckInCountKeys.TYPE1 ? tutorialMinimumRef.current : 0;
    const targetValue = selectedValue ?? editingValue;

    const nextRecord = {
      ...normalizeCheckInRecord(manualRecordRef.current),
      [editingType]: Math.max(minimum, clampInteger(targetValue)),
    };

    await setCheckInRecord(selectedDate, nextRecord);
    setEditingVisible(false);
    setEditingType(null);
    setEditingValue('0');
    await loadState();
    resetHoldState();
  };

  const handleCancelEdit = async () => {
    setEditingVisible(false);
    setEditingType(null);
    setEditingValue('0');
    await loadState();
    resetHoldState();
  };

  const handlePreviousDay = () => {
    onDateChange(selectedDate.clone().subtract(1, 'day').startOf('day'));
  };

  const handleNextDay = () => {
    const nextDay = selectedDate.clone().add(1, 'day').startOf('day');
    if (nextDay.isAfter(moment(), 'day')) return;
    onDateChange(nextDay);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
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
      }),
    [selectedDate]
  );

  const isNextDayDisabled = selectedDate
    .clone()
    .add(1, 'day')
    .isAfter(moment(), 'day');
  const isToday = selectedDate.isSame(moment(), 'day');

  const activeTypes = TYPE_META.filter((item) => getCheckInRecordCount(record, item.key) > 0);

  const getPositionStyle = (index, total) => {
    if (total === 1) return styles.singlePosition;
    if (total === 2) {
      return index === 0 ? styles.leftPosition : styles.rightPosition;
    }
    return [
      styles.trianglePosition,
      index === 0
        ? styles.topPosition
        : index === 1
          ? styles.leftBottom
          : styles.rightBottom,
    ];
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Header
        title={selectedDate.format('YYYY年MM月DD日')}
        onPrevious={handlePreviousDay}
        onNext={handleNextDay}
        onTitlePress={() => setQuickPickerVisible(true)}
        disableNext={isNextDayDisabled}
      />

      <View style={styles.dateInfo}>
        <Text style={styles.weekdayText}>{selectedDate.locale('zh-cn').format('dddd')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.checkInContainer}>
          <Text style={styles.checkInTitle}>
            {totalCount > 0 ? '今日记录' : '已经坚持'}
          </Text>
          {totalCount === 0 ? (
            <View style={styles.breakContainer}>
              <Text style={styles.breakDaysText}>{breakDays}</Text>
              <Text style={styles.breakDaysUnit}>天</Text>
            </View>
          ) : (
            <View style={styles.circleContainer}>
              {activeTypes.map((item, index) => {
                const count = getCheckInRecordCount(record, item.key);
                return (
                  <Pressable
                    key={item.key}
                    onLongPress={() => startHold(item.key, -1)}
                    onPressOut={handleHoldPressOut}
                    delayLongPress={500}
                    style={[
                      styles.checkInIconWrapper,
                      getPositionStyle(index, activeTypes.length),
                      { backgroundColor: item.bgColor },
                    ]}
                  >
                    {count <= 1 ? (
                      <Ionicons name={item.icon} size={48} color={item.color} />
                    ) : (
                      <Text style={[styles.countText, { color: item.color }]}>
                        {count}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <CountAdjustModal
        visible={editingVisible}
        title="编辑次数"
        value={editingValue}
        minValue={editingType === CheckInCountKeys.TYPE1 ? tutorialMinimum : 0}
        onChangeValue={(text) => {
          if (text === '') {
            setEditingValue('');
            return;
          }
          if (/^\d+$/.test(text)) {
            setEditingValue(text);
          }
        }}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
      />

      <DateQuickPickerModal
        visible={quickPickerVisible}
        mode="day"
        value={selectedDate}
        onConfirm={(date) => {
          setQuickPickerVisible(false);
          onDateChange(date);
        }}
        onCancel={() => setQuickPickerVisible(false)}
      />

      {!isToday && (
        <Pressable style={styles.todayButton} onPress={() => onDateChange(moment().startOf('day'))}>
          <View style={styles.calendarBox}>
            <Text style={styles.todayNumber}>{moment().date()}</Text>
          </View>
        </Pressable>
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  countText: {
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 40,
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
