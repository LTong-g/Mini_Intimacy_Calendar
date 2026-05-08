/**
 * 黑名单使用记录界面
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import moment from 'moment';
import {
  DailyUsagePieChart,
  getUsageHeatmapVisibleWeeks,
  UsageHeatmapChart,
  MonthlyUsageLineChart,
  WeeklyUsageBarChart,
} from '../components/UsageCharts';
import BaseModal from '../components/modals/BaseModal';
import ModalActionRow from '../components/modals/ModalActionRow';
import { showAppAlert } from '../utils/appAlert';
import {
  getExperimentalUsageBlacklist,
  getExperimentalUsageKnownApps,
  getExperimentalUsageIntervals,
  mergeAdjacentUsageIntervals,
} from '../utils/usageStorage';
import {
  getUsageAccessStatus,
  refreshUsageRecords,
} from '../utils/usageAccessNative';

const msPerDay = 24 * 60 * 60 * 1000;
const msPerMinute = 60 * 1000;
const CHART_RANGE_OPTIONS = [
  { key: 'today', label: '今日' },
  { key: '7days', label: '7天' },
  { key: '30days', label: '30天' },
  { key: 'heatmap', label: '热图' },
];
const BLACKLIST_MODAL_THEME = {
  primary: '#F57F17',
  primaryDisabled: '#F6E7C4',
  secondary: '#8A4B00',
  secondaryBorder: '#F4D79A',
  secondaryBackground: '#fff',
};
const AUTO_RECORD_RULES = [
  '黑名单应用的使用时间段会保存到本地，并用于动态计算观看教程自动记录次数。',
  '同一应用的碎片使用记录会先合并：前后间隔不超过 2 分钟，且中间没有其他黑名单应用使用时，视为同一段。',
  '合并后的所有黑名单使用时间段按开始时间排序，前一段结束到后一段开始间隔不超过 1 小时时，视为同一次观看教程自动记录。',
  '同一次自动记录可以跨日，跨日时按开始时间所在日期计入。',
  '同一次自动记录的已保存使用时长合计少于 5 分钟时，不计入自动记录次数。',
  '自动记录次数不单独保存，会从已保存的黑名单使用时间段动态计算，并作为日历和统计中的观看教程次数下限。',
  '手动修改观看教程次数时，不能低于当天的自动记录次数。',
];
const showBlacklistAlert = (title, message, buttons, options = {}) => (
  showAppAlert(title, message, buttons, { ...options, theme: 'blacklist' })
);

const formatDuration = (durationMs) => {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};

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

const showDateError = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  showBlacklistAlert('提示', message);
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
  const { width: windowWidth } = useWindowDimensions();
  const rangePickerActiveRef = useRef(false);
  const lastDatePickerResultRef = useRef(null);
  const blacklistRef = useRef([]);
  const readingStateRef = useRef({ loading: false, refreshing: false });
  const silentRefreshingRef = useRef(false);
  const [blacklist, setBlacklist] = useState([]);
  const [knownApps, setKnownApps] = useState([]);
  const [intervals, setIntervals] = useState([]);
  const [usageGranted, setUsageGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [autoRecordRulesVisible, setAutoRecordRulesVisible] = useState(false);
  const [readResult, setReadResult] = useState(null);
  const [rangeStartDate, setRangeStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [rangeEndDate, setRangeEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [chartRangeIndex, setChartRangeIndex] = useState(1);
  const [heatmapVisibleWeeks, setHeatmapVisibleWeeks] = useState(() => getUsageHeatmapVisibleWeeks());
  const isReading = loading || refreshing;
  const currentChartRange = CHART_RANGE_OPTIONS[chartRangeIndex];

  useEffect(() => {
    setHeatmapVisibleWeeks(getUsageHeatmapVisibleWeeks(windowWidth - 40));
  }, [windowWidth]);

  const loadState = useCallback(async () => {
    try {
      const [status, nextBlacklist, nextIntervals] = await Promise.all([
        getUsageAccessStatus(),
        getExperimentalUsageBlacklist(),
        getExperimentalUsageIntervals(),
      ]);
      const nextKnownApps = await getExperimentalUsageKnownApps();
      setUsageGranted(Boolean(status.usageAccessGranted));
      blacklistRef.current = nextBlacklist;
      setBlacklist(nextBlacklist);
      setKnownApps(nextKnownApps);
      setIntervals(nextIntervals);
      return {
        usageGranted: Boolean(status.usageAccessGranted),
        blacklist: nextBlacklist,
        knownApps: nextKnownApps,
        intervals: nextIntervals,
      };
    } catch (error) {
      showBlacklistAlert('读取失败', error.message || '无法读取黑名单使用记录状态');
      return null;
    }
  }, []);

  useEffect(() => {
    blacklistRef.current = blacklist;
  }, [blacklist]);

  useEffect(() => {
    readingStateRef.current = { loading, refreshing };
  }, [loading, refreshing]);

  const visibleIntervals = useMemo(() => (
    mergeAdjacentUsageIntervals(intervals).sort((a, b) => b.startTime - a.startTime)
  ), [intervals]);

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
        knownApps,
        todayStart.valueOf(),
        todayEnd.valueOf(),
        elapsedTodayMs
      ),
      weeklyRows: buildRangeRows(visibleIntervals, recent7Start, 7),
      monthlyRows: buildRangeRows(visibleIntervals, recent30Start, 30),
    };
  }, [visibleIntervals, knownApps]);

  const handleOpenBlacklistSettings = () => {
    navigation.navigate('ExperimentalUsageBlacklist');
  };

  const handleOpenIntervals = () => {
    navigation.navigate('ExperimentalUsageIntervals');
  };

  const handleShowAutoRecordRules = () => {
    setAutoRecordRulesVisible(true);
  };

  const handleHeatmapVisibleWeeksChange = useCallback((weeks) => {
    setHeatmapVisibleWeeks((current) => (current === weeks ? current : weeks));
  }, []);

  const ensureRefreshReady = useCallback(() => {
    if (loading || refreshing) {
      return false;
    }
    if (!usageGranted) {
      showBlacklistAlert(
        '需要使用情况访问权限',
        '请先在系统设置中授予本应用使用情况访问权限。',
        [
          { text: '知道了' },
        ]
      );
      return false;
    }
    return true;
  }, [loading, refreshing, usageGranted]);

  const readUsageRecords = useCallback(async (beginTime, endTime, options = {}) => {
    const {
      successTitle = '读取完成',
      showResult = true,
      reason = 'app_manual',
    } = options;
    const result = await refreshUsageRecords(beginTime, endTime, reason);
    if (result.selectedCount === 0) {
      throw new Error('所选时间范围内没有处于黑名单状态的应用');
    }
    const nextIntervals = await getExperimentalUsageIntervals();
    setIntervals(nextIntervals);
    if (showResult) {
      setReadResult({
        title: successTitle,
        requestRange: formatModalRange(beginTime, endTime),
        actualRange: result.actualBeginTime !== null && result.actualEndTime !== null
          ? formatModalRange(result.actualBeginTime, result.actualEndTime)
          : '无',
        count: result.readIntervalCount || 0,
      });
    }
    return {
      intervals: nextIntervals,
      result,
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
      showBlacklistAlert('日期无效', '请选择有效的起止日期');
      return;
    }
    if (start.isAfter(end, 'day')) {
      showBlacklistAlert('日期无效', '开始日期不能晚于结束日期');
      return;
    }
    if (start.isAfter(today) || end.isAfter(today)) {
      showBlacklistAlert('日期无效', '不能读取未来日期的使用记录');
      return;
    }

    const beginTime = start.startOf('day').valueOf();
    const endTime = Math.min(end.endOf('day').valueOf(), Date.now());
    try {
      setLoading(true);
      await readUsageRecords(beginTime, endTime);
      setRangeModalVisible(false);
    } catch (error) {
      showBlacklistAlert('读取失败', error.message || '无法读取黑名单应用使用记录');
    } finally {
      setLoading(false);
    }
  };

  const handleRecentRefresh = useCallback(async () => {
    if (!ensureRefreshReady()) return;

    const { beginTime, endTime } = getRecentUsageReadRange();
    try {
      setRefreshing(true);
      await readUsageRecords(beginTime, endTime, {
        successTitle: '刷新完成',
        reason: 'app_pull_refresh',
      });
    } catch (error) {
      showBlacklistAlert('刷新失败', error.message || '无法读取黑名单应用使用记录');
    } finally {
      setRefreshing(false);
    }
  }, [ensureRefreshReady, readUsageRecords]);

  const handleSilentRecentRefresh = useCallback(async (state) => {
    const readingState = readingStateRef.current;
    if (silentRefreshingRef.current || readingState.loading || readingState.refreshing) return;
    if (!state?.usageGranted) return;

    const { beginTime, endTime } = getRecentUsageReadRange();
    try {
      silentRefreshingRef.current = true;
      await readUsageRecords(beginTime, endTime, {
        showResult: false,
        reason: 'app_silent_recent',
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
          <View style={styles.noticeHeader}>
            <Text style={styles.noticeTitle}>观看教程自动记录</Text>
            <TouchableOpacity
              onPress={handleShowAutoRecordRules}
              style={styles.noticeInfoButton}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel="查看观看教程自动记录规则"
            >
              <Ionicons name="information-circle-outline" size={20} color="#A66A00" />
            </TouchableOpacity>
          </View>
          <Text style={styles.noticeText}>
            黑名单应用的使用时间段会按规则折算为观看教程自动记录次数，并作为日历和统计中的观看教程次数下限。
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
                  {option.key === 'heatmap' ? `${heatmapVisibleWeeks}周` : option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {currentChartRange.key === 'today' && <DailyUsagePieChart rows={stats.dailyRows} />}
        {currentChartRange.key === '7days' && <WeeklyUsageBarChart rows={stats.weeklyRows} />}
        {currentChartRange.key === '30days' && <MonthlyUsageLineChart rows={stats.monthlyRows} />}
        {currentChartRange.key === 'heatmap' && (
          <UsageHeatmapChart
            intervals={visibleIntervals}
            onVisibleWeeksChange={handleHeatmapVisibleWeeksChange}
          />
        )}
      </ScrollView>

      <BaseModal
        visible={rangeModalVisible}
        onRequestClose={handleCloseRangeModal}
        title="读取使用记录"
        titleStyle={styles.modalTitle}
      >
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
        <ModalActionRow
          theme={BLACKLIST_MODAL_THEME}
          actions={[
            {
              label: '取消',
              variant: 'secondary',
              onPress: handleCloseRangeModal,
              disabled: isReading,
            },
            {
              label: isReading ? '读取中' : '确认',
              onPress: handleConfirmRangeRead,
              disabled: isReading,
            },
          ]}
        />
      </BaseModal>

      <BaseModal
        visible={autoRecordRulesVisible}
        onRequestClose={() => setAutoRecordRulesVisible(false)}
        closeOnBackdropPress
        title="观看教程自动记录规则"
        titleStyle={styles.modalTitle}
      >
        <View style={styles.ruleList}>
          {AUTO_RECORD_RULES.map((rule, index) => (
            <View key={rule} style={styles.ruleRow}>
              <Text style={styles.ruleNumber}>{index + 1}.</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
        <ModalActionRow
          theme={BLACKLIST_MODAL_THEME}
          actions={[
            { label: '知道了', onPress: () => setAutoRecordRulesVisible(false) },
          ]}
        />
      </BaseModal>

      <BaseModal
        visible={Boolean(readResult)}
        onRequestClose={() => setReadResult(null)}
        closeOnBackdropPress={false}
        title={readResult?.title || '读取完成'}
        titleStyle={styles.modalTitle}
      >
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
        <ModalActionRow
          theme={BLACKLIST_MODAL_THEME}
          actions={[
            { label: '知道了', onPress: () => setReadResult(null) },
          ]}
        />
      </BaseModal>

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
  noticeHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noticeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#8A4B00',
    marginRight: 8,
  },
  noticeInfoButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  ruleList: {
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ruleNumber: {
    width: 18,
    fontSize: 14,
    lineHeight: 22,
    color: '#8A4B00',
    fontWeight: '600',
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#5F4300',
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
