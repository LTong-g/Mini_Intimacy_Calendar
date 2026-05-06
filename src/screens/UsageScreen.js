/**
 * 黑名单使用记录界面
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import moment from 'moment';
import {
  DailyUsagePieChart,
  MonthlyUsageLineChart,
  WeeklyUsageBarChart,
} from '../components/UsageCharts';
import {
  getExperimentalUsageBlacklist,
  getExperimentalUsageIntervals,
  mergeAdjacentUsageIntervals,
  mergeExperimentalUsageIntervals,
} from '../utils/usageStorage';
import {
  getUsageAccessStatus,
  queryUsageIntervals,
} from '../utils/usageAccessNative';

const msPerDay = 24 * 60 * 60 * 1000;
const msPerMinute = 60 * 1000;

const formatDuration = (durationMs) => {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};

const formatRange = (beginTime, endTime) => (
  `${moment(beginTime).format('YYYY-MM-DD HH:mm')} 至 ${moment(endTime).format('YYYY-MM-DD HH:mm')}`
);

const formatModalRange = (beginTime, endTime) => (
  `${moment(beginTime).format('YYYY-MM-DD HH:mm')} -- ${moment(endTime).format('YYYY-MM-DD HH:mm')}`
);

const getActualRecordRange = (records) => {
  if (!records.length) return null;
  return records.reduce((range, item) => ({
    beginTime: Math.min(range.beginTime, item.startTime),
    endTime: Math.max(range.endTime, item.endTime),
  }), {
    beginTime: records[0].startTime,
    endTime: records[0].endTime,
  });
};

const showDateError = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('提示', message);
};

const overlapDuration = (interval, rangeStart, rangeEnd) => {
  const start = Math.max(interval.startTime, rangeStart);
  const end = Math.min(interval.endTime, rangeEnd);
  return Math.max(0, end - start);
};

const buildDailyRows = (intervals, blacklist, dayStart, dayEnd, elapsedMs) => {
  const apps = new Map(blacklist.map((item) => [item.packageName, item]));
  const byPackage = new Map();
  intervals.forEach((interval) => {
    const duration = overlapDuration(interval, dayStart, dayEnd);
    if (duration <= 0) return;
    byPackage.set(interval.packageName, (byPackage.get(interval.packageName) || 0) + duration);
  });
  const usageRows = Array.from(byPackage.entries())
    .map(([packageName, durationMs]) => ({
      packageName,
      label: apps.get(packageName)?.label || packageName,
      color: apps.get(packageName)?.color || null,
      durationMs,
      isRemainder: false,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  const usedMs = usageRows.reduce((sum, item) => sum + item.durationMs, 0);
  const remainingMs = Math.max(0, elapsedMs - usedMs);
  if (remainingMs > 0) {
    usageRows.push({
      packageName: '__remaining_today__',
      label: '今日已过时间中未使用黑名单应用',
      durationMs: remainingMs,
      isRemainder: true,
    });
  }

  return usageRows;
};

const buildRangeRows = (intervals, startMoment, days) => (
  Array.from({ length: days }, (_, index) => {
    const day = startMoment.clone().add(index, 'days');
    const start = day.valueOf();
    const end = start + msPerDay;
    const durationMs = intervals.reduce((sum, interval) => (
      sum + overlapDuration(interval, start, end)
    ), 0);
    return {
      key: day.format('YYYY-MM-DD'),
      label: day.format('MM-DD'),
      durationMs,
    };
  })
);

const ExperimentalUsageScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const rangePickerActiveRef = useRef(false);
  const lastDatePickerResultRef = useRef(null);
  const [blacklist, setBlacklist] = useState([]);
  const [intervals, setIntervals] = useState([]);
  const [usageGranted, setUsageGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [readResult, setReadResult] = useState(null);
  const [rangeStartDate, setRangeStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [rangeEndDate, setRangeEndDate] = useState(moment().format('YYYY-MM-DD'));
  const isReading = loading || refreshing;

  const loadState = useCallback(async () => {
    try {
      const [status, nextBlacklist, nextIntervals] = await Promise.all([
        getUsageAccessStatus(),
        getExperimentalUsageBlacklist(),
        getExperimentalUsageIntervals(),
      ]);
      setUsageGranted(Boolean(status.usageAccessGranted));
      setBlacklist(nextBlacklist);
      setIntervals(nextIntervals);
    } catch (error) {
      Alert.alert('读取失败', error.message || '无法读取黑名单使用记录状态');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
      if (rangePickerActiveRef.current) {
        rangePickerActiveRef.current = false;
        setRangeModalVisible(true);
      }
    }, [loadState])
  );

  const selectedPackages = useMemo(
    () => new Set(blacklist.map((item) => item.packageName)),
    [blacklist]
  );

  const visibleIntervals = useMemo(() => (
    mergeAdjacentUsageIntervals(
      intervals.filter((item) => selectedPackages.has(item.packageName))
    ).sort((a, b) => b.startTime - a.startTime)
  ), [intervals, selectedPackages]);

  const stats = useMemo(() => {
    const now = moment();
    const todayStart = now.clone().startOf('day');
    const todayEnd = now;
    const recent7Start = todayStart.clone().subtract(6, 'days');
    const recent30Start = todayStart.clone().subtract(29, 'days');
    const elapsedTodayMs = Math.max(msPerMinute, now.valueOf() - todayStart.valueOf());

    return {
      dailyRows: buildDailyRows(
        visibleIntervals,
        blacklist,
        todayStart.valueOf(),
        todayEnd.valueOf(),
        elapsedTodayMs
      ),
      weeklyRows: buildRangeRows(visibleIntervals, recent7Start, 7),
      monthlyRows: buildRangeRows(visibleIntervals, recent30Start, 30),
    };
  }, [visibleIntervals, blacklist]);

  const handleOpenBlacklistSettings = () => {
    navigation.navigate('ExperimentalUsageBlacklist');
  };

  const handleOpenIntervals = () => {
    navigation.navigate('ExperimentalUsageIntervals');
  };

  const ensureRefreshReady = useCallback(() => {
    if (loading || refreshing) {
      return false;
    }
    if (!usageGranted) {
      Alert.alert(
        '需要使用情况访问权限',
        '请先在系统设置中授予本应用使用情况访问权限。',
        [
          { text: '知道了' },
        ]
      );
      return false;
    }
    if (blacklist.length === 0) {
      Alert.alert('无法刷新', '请先选择至少一个黑名单应用');
      return false;
    }
    return true;
  }, [blacklist.length, loading, refreshing, usageGranted]);

  const readUsageRecords = useCallback(async (beginTime, endTime, successTitle = '读取完成') => {
    const packageNames = blacklist.map((item) => item.packageName);
    const nextIntervals = await queryUsageIntervals(packageNames, beginTime, endTime);
    const mergedReadIntervals = mergeAdjacentUsageIntervals(nextIntervals);
    const merged = await mergeExperimentalUsageIntervals(nextIntervals);
    const actualRange = getActualRecordRange(mergedReadIntervals);
    setIntervals(merged);
    setReadResult({
      title: successTitle,
      requestRange: formatModalRange(beginTime, endTime),
      actualRange: actualRange
        ? formatModalRange(actualRange.beginTime, actualRange.endTime)
        : '无',
      count: mergedReadIntervals.length,
    });
  }, [blacklist]);

  const handleOpenRangeModal = () => {
    const today = moment().format('YYYY-MM-DD');
    setRangeStartDate(today);
    setRangeEndDate(today);
    setRangeModalVisible(true);
  };

  const handleCloseRangeModal = () => {
    if (isReading) return;
    setRangeModalVisible(false);
  };

  const handlePickDate = (field) => {
    setRangeModalVisible(false);
    rangePickerActiveRef.current = true;
    navigation.navigate('DatePicker', {
      mode: field,
      returnTo: 'ExperimentalUsage',
      returnKey: route.key,
    });
  };

  useEffect(() => {
    const result = route.params?.datePickerResult;
    if (!result || lastDatePickerResultRef.current === result.requestId) return;
    lastDatePickerResultRef.current = result.requestId;

    if (result.mode === 'start') {
      if (rangeEndDate && moment(result.date).isAfter(rangeEndDate)) {
        showDateError('开始日期不能晚于结束日期');
      } else {
        setRangeStartDate(result.date);
      }
    } else {
      if (rangeStartDate && moment(result.date).isBefore(rangeStartDate)) {
        showDateError('结束日期不能早于开始日期');
      } else {
        setRangeEndDate(result.date);
      }
    }
    navigation.setParams({ datePickerResult: undefined });
  }, [navigation, rangeEndDate, rangeStartDate, route.params?.datePickerResult]);

  const handleConfirmRangeRead = async () => {
    if (!ensureRefreshReady()) return;

    const start = moment(rangeStartDate, 'YYYY-MM-DD', true);
    const end = moment(rangeEndDate, 'YYYY-MM-DD', true);
    const today = moment().endOf('day');
    if (!start.isValid() || !end.isValid()) {
      Alert.alert('日期无效', '请选择有效的起止日期');
      return;
    }
    if (start.isAfter(end, 'day')) {
      Alert.alert('日期无效', '开始日期不能晚于结束日期');
      return;
    }
    if (start.isAfter(today) || end.isAfter(today)) {
      Alert.alert('日期无效', '不能读取未来日期的使用记录');
      return;
    }

    const beginTime = start.startOf('day').valueOf();
    const endTime = Math.min(end.endOf('day').valueOf(), Date.now());
    try {
      setLoading(true);
      await readUsageRecords(beginTime, endTime);
      setRangeModalVisible(false);
    } catch (error) {
      Alert.alert('读取失败', error.message || '无法读取黑名单应用使用记录');
    } finally {
      setLoading(false);
    }
  };

  const handleRecentRefresh = useCallback(async () => {
    if (!ensureRefreshReady()) return;

    const now = moment();
    const beginTime = now.clone().subtract(2, 'days').startOf('day').valueOf();
    const endTime = now.valueOf();
    try {
      setRefreshing(true);
      await readUsageRecords(beginTime, endTime, '刷新完成');
    } catch (error) {
      Alert.alert('刷新失败', error.message || '无法读取黑名单应用使用记录');
    } finally {
      setRefreshing(false);
    }
  }, [ensureRefreshReady, readUsageRecords]);

  const totalToday = stats.dailyRows
    .filter((item) => !item.isRemainder)
    .reduce((sum, item) => sum + item.durationMs, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>黑名单</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRecentRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        )}
      >
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>实验性功能</Text>
          <Text style={styles.noticeText}>
            这里仅统计黑名单应用的系统使用时间段，不会自动写入日历打卡记录。
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isReading && styles.disabledButton]}
          disabled={isReading}
          onPress={handleOpenRangeModal}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>{isReading ? '读取中' : '按日期读取记录'}</Text>
        </TouchableOpacity>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>黑名单：{blacklist.length} 个应用</Text>
          <Text style={styles.summaryText}>今日合计：{formatDuration(totalToday)}</Text>
        </View>

        <TouchableOpacity style={styles.blacklistEntry} onPress={handleOpenBlacklistSettings}>
          <View style={styles.blacklistEntryTextBlock}>
            <Text style={styles.blacklistEntryTitle}>设置黑名单应用</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.intervalEntry} onPress={handleOpenIntervals}>
          <View style={styles.blacklistEntryTextBlock}>
            <Text style={styles.blacklistEntryTitle}>查看使用时间段</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#777" />
        </TouchableOpacity>

        <DailyUsagePieChart rows={stats.dailyRows} />
        <WeeklyUsageBarChart rows={stats.weeklyRows} />
        <MonthlyUsageLineChart rows={stats.monthlyRows} />
      </ScrollView>

      <Modal
        visible={rangeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseRangeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseRangeModal} />
          <View style={styles.rangeModal}>
            <Text style={styles.modalTitle}>读取使用记录</Text>
            <View style={styles.dateRangeRow}>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => handlePickDate('start')}
              >
                <Text style={styles.dateText}>{rangeStartDate}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>-</Text>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => handlePickDate('end')}
              >
                <Text style={styles.dateText}>{rangeEndDate}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={handleCloseRangeModal}
                disabled={isReading}
              >
                <Text style={styles.secondaryActionText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmAction, isReading && styles.disabledButton]}
                onPress={handleConfirmRangeRead}
                disabled={isReading}
              >
                <Text style={styles.confirmActionText}>{isReading ? '读取中' : '确认'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(readResult)}
        animationType="fade"
        transparent
        onRequestClose={() => setReadResult(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultModal}>
            <Text style={styles.modalTitle}>{readResult?.title || '读取完成'}</Text>
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>请求读取范围：</Text>
              <Text style={styles.resultValue}>{readResult?.requestRange}</Text>
            </View>
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>实际读取到记录：</Text>
              <Text style={styles.resultValue}>{readResult?.actualRange}</Text>
            </View>
            <Text style={styles.resultSummary}>
              读取到 {readResult?.count || 0} 条使用时间段
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmAction}
                onPress={() => setReadResult(null)}
              >
                <Text style={styles.confirmActionText}>知道了</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  notice: {
    borderWidth: 1,
    borderColor: '#F57F17',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF8E1',
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A4B00',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5F4300',
  },
  primaryButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: '#8fbff4',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  rangeModal: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  resultModal: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dateBox: {
    width: 120,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#000',
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  secondaryAction: {
    minWidth: 72,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8d8d8',
  },
  secondaryActionText: {
    fontSize: 14,
    color: '#555',
  },
  confirmAction: {
    minWidth: 72,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  confirmActionText: {
    fontSize: 14,
    color: '#fff',
  },
  resultBlock: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  resultValue: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  resultSummary: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  summaryText: {
    fontSize: 13,
    color: '#444',
  },
  blacklistEntry: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  intervalEntry: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  blacklistEntryTextBlock: {
    flex: 1,
  },
  blacklistEntryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  blacklistEntryText: {
    fontSize: 13,
    color: '#666',
  },
  appList: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  appRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  appRowSelected: {
    backgroundColor: '#eef6ff',
  },
  appTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  appLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  packageName: {
    fontSize: 11,
    color: '#777',
  },
});

export default ExperimentalUsageScreen;
