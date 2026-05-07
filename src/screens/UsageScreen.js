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
const CHART_RANGE_OPTIONS = [
  { key: 'today', label: '今日' },
  { key: '7days', label: '7天' },
  { key: '30days', label: '30天' },
];

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

const getRecentUsageReadRange = () => {
  const now = moment();
  return {
    beginTime: now.clone().subtract(2, 'days').startOf('day').valueOf(),
    endTime: now.valueOf(),
  };
};

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
      color: null,
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
  const blacklistRef = useRef([]);
  const readingStateRef = useRef({ loading: false, refreshing: false });
  const silentRefreshingRef = useRef(false);
  const [blacklist, setBlacklist] = useState([]);
  const [intervals, setIntervals] = useState([]);
  const [usageGranted, setUsageGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [readResult, setReadResult] = useState(null);
  const [rangeStartDate, setRangeStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [rangeEndDate, setRangeEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [chartRangeIndex, setChartRangeIndex] = useState(1);
  const isReading = loading || refreshing;
  const currentChartRange = CHART_RANGE_OPTIONS[chartRangeIndex];

  const loadState = useCallback(async () => {
    try {
      const [status, nextBlacklist, nextIntervals] = await Promise.all([
        getUsageAccessStatus(),
        getExperimentalUsageBlacklist(),
        getExperimentalUsageIntervals(),
      ]);
      setUsageGranted(Boolean(status.usageAccessGranted));
      blacklistRef.current = nextBlacklist;
      setBlacklist(nextBlacklist);
      setIntervals(nextIntervals);
      return {
        usageGranted: Boolean(status.usageAccessGranted),
        blacklist: nextBlacklist,
        intervals: nextIntervals,
      };
    } catch (error) {
      Alert.alert('读取失败', error.message || '无法读取黑名单使用记录状态');
      return null;
    }
  }, []);

  useEffect(() => {
    blacklistRef.current = blacklist;
  }, [blacklist]);

  useEffect(() => {
    readingStateRef.current = { loading, refreshing };
  }, [loading, refreshing]);

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

  const readUsageRecords = useCallback(async (beginTime, endTime, options = {}) => {
    const {
      successTitle = '读取完成',
      showResult = true,
      targetBlacklist,
    } = options;
    const sourceBlacklist = targetBlacklist || blacklistRef.current;
    const packageNames = sourceBlacklist.map((item) => item.packageName);
    const nextIntervals = await queryUsageIntervals(packageNames, beginTime, endTime);
    const mergedReadIntervals = mergeAdjacentUsageIntervals(nextIntervals);
    const merged = await mergeExperimentalUsageIntervals(nextIntervals);
    const actualRange = getActualRecordRange(mergedReadIntervals);
    setIntervals(merged);
    if (showResult) {
      setReadResult({
        title: successTitle,
        requestRange: formatModalRange(beginTime, endTime),
        actualRange: actualRange
          ? formatModalRange(actualRange.beginTime, actualRange.endTime)
          : '无',
        count: mergedReadIntervals.length,
      });
    }
    return {
      merged,
      mergedReadIntervals,
      actualRange,
    };
  }, []);

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

    const { beginTime, endTime } = getRecentUsageReadRange();
    try {
      setRefreshing(true);
      await readUsageRecords(beginTime, endTime, { successTitle: '刷新完成' });
    } catch (error) {
      Alert.alert('刷新失败', error.message || '无法读取黑名单应用使用记录');
    } finally {
      setRefreshing(false);
    }
  }, [ensureRefreshReady, readUsageRecords]);

  const handleSilentRecentRefresh = useCallback(async (state) => {
    const readingState = readingStateRef.current;
    if (silentRefreshingRef.current || readingState.loading || readingState.refreshing) return;
    if (!state?.usageGranted || state.blacklist.length === 0) return;

    const { beginTime, endTime } = getRecentUsageReadRange();
    try {
      silentRefreshingRef.current = true;
      await readUsageRecords(beginTime, endTime, {
        showResult: false,
        targetBlacklist: state.blacklist,
      });
    } catch {
      // Silent refresh must not interrupt page entry or show an error dialog.
    } finally {
      silentRefreshingRef.current = false;
    }
  }, [readUsageRecords]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (rangePickerActiveRef.current) {
        rangePickerActiveRef.current = false;
        setRangeModalVisible(true);
      }

      loadState().then((state) => {
        if (!isActive || !state) return;
        handleSilentRecentRefresh(state);
      });

      return () => {
        isActive = false;
      };
    }, [handleSilentRecentRefresh, loadState])
  );

  const totalToday = stats.dailyRows
    .filter((item) => !item.isRemainder)
    .reduce((sum, item) => sum + item.durationMs, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F57F17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>黑名单</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRecentRefresh}
            colors={['#F57F17']}
            tintColor="#F57F17"
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
          style={[styles.primaryButton, isReading && styles.primaryButtonDisabled]}
          disabled={isReading}
          onPress={handleOpenRangeModal}
        >
          <Ionicons name="calendar-outline" size={18} color="#8A4B00" />
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
          <Ionicons name="chevron-forward" size={22} color="#A66A00" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.intervalEntry} onPress={handleOpenIntervals}>
          <View style={styles.blacklistEntryTextBlock}>
            <Text style={styles.blacklistEntryTitle}>查看使用时间段</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#A66A00" />
        </TouchableOpacity>

        <View style={styles.chartRangeBar}>
          <View style={styles.rangeGroup}>
            {CHART_RANGE_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.rangeButton,
                  option.key === currentChartRange.key && styles.rangeButtonActive,
                  index === 0 && styles.rangeButtonFirst,
                  index === CHART_RANGE_OPTIONS.length - 1 && styles.rangeButtonLast,
                ]}
                onPress={() => setChartRangeIndex(index)}
              >
                <Text
                  style={[
                    styles.rangeText,
                    option.key === currentChartRange.key && styles.rangeTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {currentChartRange.key === 'today' && <DailyUsagePieChart rows={stats.dailyRows} />}
        {currentChartRange.key === '7days' && <WeeklyUsageBarChart rows={stats.weeklyRows} />}
        {currentChartRange.key === '30days' && <MonthlyUsageLineChart rows={stats.monthlyRows} />}
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
    borderBottomColor: '#F4D79A',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5F4300',
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
    borderWidth: 1,
    borderColor: '#F4D79A',
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#8A4B00',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: '#F6E7C4',
  },
  disabledButton: {
    backgroundColor: '#F6E7C4',
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
    color: '#5F4300',
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
    borderColor: '#F4D79A',
    borderRadius: 6,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#5F4300',
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5F4300',
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
    borderColor: '#F4D79A',
  },
  secondaryActionText: {
    fontSize: 14,
    color: '#8A4B00',
  },
  confirmAction: {
    minWidth: 72,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F57F17',
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
    color: '#8A4B00',
    marginBottom: 6,
  },
  resultValue: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5F4300',
  },
  resultSummary: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5F4300',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  summaryText: {
    fontSize: 13,
    color: '#5F4300',
  },
  blacklistEntry: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F4D79A',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  intervalEntry: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F4D79A',
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
    color: '#5F4300',
  },
  blacklistEntryText: {
    fontSize: 13,
    color: '#8A4B00',
  },
  chartRangeBar: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  rangeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeButton: {
    minHeight: 28,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F4D79A',
    borderLeftWidth: 0,
    backgroundColor: '#fff',
  },
  rangeButtonFirst: {
    borderLeftWidth: 1,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rangeButtonLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  rangeButtonActive: {
    backgroundColor: '#FFF8E1',
  },
  rangeText: {
    fontSize: 13,
    color: '#A66A00',
  },
  rangeTextActive: {
    fontWeight: '700',
    color: '#8A4B00',
  },
  appList: {
    borderWidth: 1,
    borderColor: '#F4D79A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  appRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F6E7C4',
  },
  appRowSelected: {
    backgroundColor: '#FFF8E1',
  },
  appTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  appLabel: {
    fontSize: 14,
    color: '#5F4300',
    marginBottom: 2,
  },
  packageName: {
    fontSize: 11,
    color: '#A66A00',
  },
});

export default ExperimentalUsageScreen;
