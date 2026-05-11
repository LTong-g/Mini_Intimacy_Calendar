/**
 * 黑名单使用时间段详情页
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
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
import BlacklistPageHeader from '../components/BlacklistPageHeader';
import UsageDateRangeRow from '../components/UsageDateRangeRow';
import UsageRangeTabs from '../components/UsageRangeTabs';
import BaseModal from '../components/modals/BaseModal';
import ModalActionRow from '../components/modals/ModalActionRow';
import { showAppAlert } from '../utils/appAlert';
import { formatUsageDurationChinese } from '../utils/usageDurationFormat';
import {
  BLACKLIST_COLORS,
  BLACKLIST_MODAL_THEME,
} from '../utils/usageTheme';
import {
  getExperimentalUsageKnownApps,
  getExperimentalUsageIntervals,
  mergeAdjacentUsageIntervals,
} from '../utils/usageStorage';

const RANGE_OPTIONS = [
  { key: 'today', label: '今日', days: 1 },
  { key: '7days', label: '7天', days: 7 },
  { key: '30days', label: '30天', days: 30 },
];

const showBlacklistAlert = (title, message, buttons, options = {}) => (
  showAppAlert(title, message, buttons, { ...options, theme: 'blacklist' })
);

const showDateError = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  showBlacklistAlert('提示', message);
};

const groupIntervalsByDate = (intervals, blacklist) => {
  const appsByPackage = new Map(blacklist.map((item) => [item.packageName, item]));
  const groups = [];
  const byDate = new Map();

  intervals.forEach((item) => {
    const key = moment(item.startTime).format('YYYY-MM-DD');
    if (!byDate.has(key)) {
      const group = {
        key,
        label: moment(item.startTime).format('YYYY年MM月DD日'),
        durationMs: 0,
        intervals: [],
      };
      byDate.set(key, group);
      groups.push(group);
    }
    const app = appsByPackage.get(item.packageName);
    const group = byDate.get(key);
    group.durationMs += item.durationMs;
    group.intervals.push({
      ...item,
      app,
      appLabel: app?.label || item.packageName,
    });
  });

  return groups;
};

const ExperimentalUsageIntervalRecordsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { width: windowWidth } = useWindowDimensions();
  const filterPickerActiveRef = useRef(false);
  const lastDatePickerResultRef = useRef(null);
  const selectedPackageName = route.params?.packageName || '__all__';
  const initialFilterDate = route.params?.filterDate || null;
  const initialFilterDateRange = initialFilterDate
    ? { startDate: initialFilterDate, endDate: initialFilterDate }
    : null;
  const [rangeIndex, setRangeIndex] = useState(1);
  const [filterDateRange, setFilterDateRange] = useState(initialFilterDateRange);
  const [filterPackageNames, setFilterPackageNames] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appFilterModalVisible, setAppFilterModalVisible] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [pendingEndDate, setPendingEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [pendingPackageNames, setPendingPackageNames] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [intervals, setIntervals] = useState([]);

  const loadState = useCallback(async () => {
    try {
      const [nextBlacklist, nextIntervals] = await Promise.all([
        getExperimentalUsageKnownApps(),
        getExperimentalUsageIntervals(),
      ]);
      setBlacklist(nextBlacklist);
      setIntervals(nextIntervals);
    } catch (error) {
      showBlacklistAlert('读取失败', error.message || '无法读取使用时间段');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
      if (filterPickerActiveRef.current) {
        filterPickerActiveRef.current = false;
        setFilterModalVisible(true);
      }
    }, [loadState])
  );

  const allPackageNames = useMemo(
    () => blacklist.map((item) => item.packageName),
    [blacklist]
  );

  const visibleIntervals = useMemo(() => (
    mergeAdjacentUsageIntervals(intervals).sort((a, b) => b.startTime - a.startTime)
  ), [intervals]);

  const currentRange = RANGE_OPTIONS[rangeIndex];
  const activeDateRange = useMemo(() => {
    if (filterDateRange) return filterDateRange;
    return {
      startDate: moment().startOf('day').subtract(currentRange.days - 1, 'days').format('YYYY-MM-DD'),
      endDate: moment().format('YYYY-MM-DD'),
    };
  }, [currentRange.days, filterDateRange]);
  const activeAppPackages = useMemo(() => {
    if (selectedPackageName !== '__all__') {
      return new Set([selectedPackageName]);
    }
    return new Set(filterPackageNames || allPackageNames);
  }, [allPackageNames, filterPackageNames, selectedPackageName]);
  const filteredIntervals = useMemo(() => (
    visibleIntervals.filter((item) => activeAppPackages.has(item.packageName))
  ), [activeAppPackages, visibleIntervals]);
  const rangedIntervals = useMemo(() => {
    const rangeStart = moment(activeDateRange.startDate, 'YYYY-MM-DD').startOf('day').valueOf();
    const rangeEnd = moment(activeDateRange.endDate, 'YYYY-MM-DD').endOf('day').valueOf();
    return filteredIntervals.filter((item) => (
      item.startTime <= rangeEnd && item.endTime >= rangeStart
    ));
  }, [activeDateRange.endDate, activeDateRange.startDate, filteredIntervals]);

  const totalDuration = rangedIntervals.reduce((sum, item) => sum + item.durationMs, 0);
  const intervalGroups = useMemo(
    () => groupIntervalsByDate(rangedIntervals, blacklist),
    [rangedIntervals, blacklist]
  );
  const currentApp = selectedPackageName !== '__all__'
    ? blacklist.find((item) => item.packageName === selectedPackageName)
    : null;
  const title = selectedPackageName === '__all__'
    ? '全部记录'
    : currentApp?.label || '使用记录';
  const isAllDetail = selectedPackageName === '__all__';
  const hasAppFilter = isAllDetail && Boolean(filterPackageNames);
  const hasAnyFilter = Boolean(filterDateRange) || hasAppFilter;
  const activeDateRangeLabel = activeDateRange.startDate === activeDateRange.endDate
    ? activeDateRange.startDate
    : `${activeDateRange.startDate} - ${activeDateRange.endDate}`;
  const pendingSelectedPackages = useMemo(
    () => new Set(pendingPackageNames),
    [pendingPackageNames]
  );
  const pendingSelectedApps = useMemo(
    () => blacklist.filter((app) => pendingSelectedPackages.has(app.packageName)),
    [blacklist, pendingSelectedPackages]
  );
  const pendingUnselectedApps = useMemo(
    () => blacklist.filter((app) => !pendingSelectedPackages.has(app.packageName)),
    [blacklist, pendingSelectedPackages]
  );
  const previewIconCount = Math.max(1, Math.floor((windowWidth - 112) / 40) - 1);
  const previewApps = pendingSelectedApps.slice(0, previewIconCount);

  const handleOpenFilterModal = () => {
    setPendingStartDate(activeDateRange.startDate);
    setPendingEndDate(activeDateRange.endDate);
    setPendingPackageNames(filterPackageNames || allPackageNames);
    setFilterModalVisible(true);
  };

  const handleCloseFilterModal = () => {
    setFilterModalVisible(false);
  };

  const handlePickDate = (field) => {
    setFilterModalVisible(false);
    filterPickerActiveRef.current = true;
    navigation.navigate('DatePicker', {
      mode: field,
      returnTo: 'ExperimentalUsageIntervalRecords',
      returnKey: route.key,
    });
  };

  useEffect(() => {
    const result = route.params?.datePickerResult;
    if (!result || lastDatePickerResultRef.current === result.requestId) return;
    lastDatePickerResultRef.current = result.requestId;

    if (result.mode === 'filterStart') {
      if (pendingEndDate && moment(result.date).isAfter(pendingEndDate)) {
        showDateError('开始日期不能晚于结束日期');
      } else {
        setPendingStartDate(result.date);
      }
    } else if (result.mode === 'filterEnd') {
      if (pendingStartDate && moment(result.date).isBefore(pendingStartDate)) {
        showDateError('结束日期不能早于开始日期');
      } else {
        setPendingEndDate(result.date);
      }
    }
    navigation.setParams({ datePickerResult: undefined });
  }, [navigation, pendingEndDate, pendingStartDate, route.params?.datePickerResult]);

  const handleConfirmFilter = () => {
    const start = moment(pendingStartDate, 'YYYY-MM-DD', true);
    const end = moment(pendingEndDate, 'YYYY-MM-DD', true);
    if (!start.isValid() || !end.isValid()) {
      showBlacklistAlert('日期无效', '请选择有效的起止日期');
      return;
    }
    if (start.isAfter(end, 'day')) {
      showBlacklistAlert('日期无效', '开始日期不能晚于结束日期');
      return;
    }
    setFilterDateRange({
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    });
    if (isAllDetail) {
      setFilterPackageNames(pendingPackageNames.length === allPackageNames.length
        ? null
        : pendingPackageNames);
    }
    setFilterModalVisible(false);
  };

  const handleClearFilter = () => {
    setFilterPackageNames(null);
    setFilterDateRange(null);
    setPendingPackageNames(allPackageNames);
    setFilterModalVisible(false);
  };

  const movePendingPackage = (packageName, selected) => {
    setPendingPackageNames((current) => {
      const currentSet = new Set(current);
      if (selected) {
        currentSet.add(packageName);
      } else {
        currentSet.delete(packageName);
      }
      return allPackageNames.filter((item) => currentSet.has(item));
    });
  };

  const renderAppIcon = (app) => (
    <View style={styles.appIconWrap}>
      {app?.icon ? (
        <Image source={{ uri: app.icon }} style={styles.appIcon} />
      ) : (
        <View style={styles.appIconFallback}>
          <Ionicons name="apps-outline" size={18} color={BLACKLIST_COLORS.textMuted} />
        </View>
      )}
    </View>
  );

  const renderFilterAppIcon = (app, onPress) => (
    <TouchableOpacity
      key={app?.packageName || 'unknown-app'}
      style={styles.filterAppIconButton}
      onPress={onPress}
    >
      {app?.icon ? (
        <Image source={{ uri: app.icon }} style={styles.filterAppIcon} />
      ) : (
        <View style={styles.filterAppIconFallback}>
          <Ionicons name="apps-outline" size={18} color={BLACKLIST_COLORS.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BlacklistPageHeader title={title} onBack={() => navigation.goBack()} />

      <View style={styles.detailContent}>
        <View style={styles.fixedDetailHeader}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{rangedIntervals.length} 条记录</Text>
            <Text style={styles.summaryText}>合计 {formatUsageDurationChinese(totalDuration)}</Text>
          </View>

          <View style={styles.filterBar}>
            {filterDateRange ? (
              <Text style={styles.customRangeText} numberOfLines={1}>
                {activeDateRangeLabel}
              </Text>
            ) : (
              <UsageRangeTabs
                options={RANGE_OPTIONS}
                selectedKey={currentRange.key}
                onSelect={(_option, index) => setRangeIndex(index)}
              />
            )}
            <TouchableOpacity style={styles.filterButton} onPress={handleOpenFilterModal}>
              <Ionicons name="filter-outline" size={18} color={BLACKLIST_COLORS.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.recordsScroll} contentContainerStyle={styles.recordsContent}>
          {rangedIntervals.length === 0 ? (
            <Text style={styles.emptyText}>暂无使用时间段</Text>
          ) : (
            intervalGroups.map((group) => (
              <View key={group.key} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateTitle} numberOfLines={1}>{group.label}</Text>
                  <Text style={styles.dateDuration} numberOfLines={1}>
                    {formatUsageDurationChinese(group.durationMs)}
                  </Text>
                </View>
                {group.intervals.map((item) => (
                  <View key={`${item.packageName}-${item.startTime}-${item.endTime}`} style={styles.intervalRow}>
                    {isAllDetail && renderAppIcon(item.app)}
                    <View style={styles.intervalTextBlock}>
                      <Text style={styles.intervalTitle} numberOfLines={1}>
                        {isAllDetail ? item.appLabel : '使用记录'}
                      </Text>
                    </View>
                    <View style={styles.intervalMeta}>
                      <Text style={styles.intervalTime}>
                        {moment(item.startTime).format('HH:mm')} - {moment(item.endTime).format('HH:mm')}
                      </Text>
                      <Text style={styles.intervalDuration}>{formatUsageDurationChinese(item.durationMs)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <BaseModal
        visible={filterModalVisible}
        onRequestClose={handleCloseFilterModal}
      >
        <View style={styles.filterAppPreviewRow}>
          {isAllDetail ? (
            <>
              <View style={styles.previewIconStrip}>
                {previewApps.map((app) => renderFilterAppIcon(app, undefined))}
              </View>
              <TouchableOpacity
                style={styles.filterEditButton}
                onPress={() => setAppFilterModalVisible(true)}
              >
                <Ionicons name="create-outline" size={20} color={BLACKLIST_COLORS.secondary} />
              </TouchableOpacity>
            </>
          ) : (
            renderFilterAppIcon(currentApp, undefined)
          )}
        </View>

        <UsageDateRangeRow
          startDate={pendingStartDate}
          endDate={pendingEndDate}
          onStartPress={() => handlePickDate('filterStart')}
          onEndPress={() => handlePickDate('filterEnd')}
        />

        <ModalActionRow
          theme={BLACKLIST_MODAL_THEME}
          actions={[
            {
              label: hasAnyFilter ? '清除筛选' : '取消',
              variant: 'secondary',
              onPress: hasAnyFilter ? handleClearFilter : handleCloseFilterModal,
            },
            { label: '确定', onPress: handleConfirmFilter },
          ]}
        />
      </BaseModal>

      <BaseModal
        visible={appFilterModalVisible}
        onRequestClose={() => setAppFilterModalVisible(false)}
      >
        <View style={styles.appFilterSection}>
          <Text style={styles.appFilterSectionTitle}>显示</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.appFilterIconRow}>
              {pendingSelectedApps.map((app) => renderFilterAppIcon(
                app,
                () => movePendingPackage(app.packageName, false)
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={styles.appFilterSection}>
          <Text style={styles.appFilterSectionTitle}>隐藏</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.appFilterIconRow}>
              {pendingUnselectedApps.map((app) => renderFilterAppIcon(
                app,
                () => movePendingPackage(app.packageName, true)
              ))}
            </View>
          </ScrollView>
        </View>
        <ModalActionRow
          theme={BLACKLIST_MODAL_THEME}
          actions={[
            { label: '确定', onPress: () => setAppFilterModalVisible(false) },
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
    backgroundColor: BLACKLIST_COLORS.surface,
  },
  detailContent: {
    flex: 1,
  },
  fixedDetailHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: BLACKLIST_COLORS.surface,
  },
  recordsScroll: {
    flex: 1,
  },
  recordsContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BLACKLIST_COLORS.secondaryBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: BLACKLIST_COLORS.secondary,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: BLACKLIST_COLORS.text,
  },
  filterBar: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  customRangeText: {
    flex: 1,
    paddingRight: 12,
    fontSize: 13,
    fontWeight: '700',
    color: BLACKLIST_COLORS.secondary,
  },
  filterButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterAppPreviewRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  previewIconStrip: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  filterEditButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterAppIconButton: {
    width: 36,
    height: 36,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterAppIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  filterAppIconFallback: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appFilterSection: {
    marginBottom: 14,
  },
  appFilterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BLACKLIST_COLORS.text,
    marginBottom: 8,
  },
  appFilterIconRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconWrap: {
    width: 36,
    height: 36,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  appIconFallback: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: BLACKLIST_COLORS.textMuted,
    lineHeight: 22,
  },
  dateGroup: {
    marginTop: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 2,
  },
  dateTitle: {
    flex: 1,
    paddingRight: 10,
    fontSize: 13,
    fontWeight: '600',
    color: BLACKLIST_COLORS.secondary,
  },
  dateDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: BLACKLIST_COLORS.secondary,
  },
  intervalRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: BLACKLIST_COLORS.divider,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  intervalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BLACKLIST_COLORS.text,
  },
  intervalMeta: {
    alignItems: 'flex-end',
  },
  intervalTime: {
    fontSize: 13,
    color: BLACKLIST_COLORS.secondary,
    marginBottom: 2,
  },
  intervalDuration: {
    fontSize: 12,
    color: BLACKLIST_COLORS.textMuted,
  },
});

export default ExperimentalUsageIntervalRecordsScreen;
