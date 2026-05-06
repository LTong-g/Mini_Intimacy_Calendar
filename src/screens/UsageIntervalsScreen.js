/**
 * 黑名单使用时间段查看界面
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
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
  getExperimentalUsageBlacklist,
  getExperimentalUsageIntervals,
  mergeAdjacentUsageIntervals,
} from '../utils/usageStorage';

const formatDuration = (durationMs) => {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};

const RANGE_OPTIONS = [
  { key: 'today', label: '今日', days: 1 },
  { key: '7days', label: '7天', days: 7 },
  { key: '30days', label: '30天', days: 30 },
];

const showDateError = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('提示', message);
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

const ExperimentalUsageIntervalsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { width: windowWidth } = useWindowDimensions();
  const filterPickerActiveRef = useRef(false);
  const lastDatePickerResultRef = useRef(null);
  const initialPackageName = route.params?.packageName || null;
  const [selectedPackageName, setSelectedPackageName] = useState(initialPackageName);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [filterDateRange, setFilterDateRange] = useState(null);
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
        getExperimentalUsageBlacklist(),
        getExperimentalUsageIntervals(),
      ]);
      setBlacklist(nextBlacklist);
      setIntervals(nextIntervals);
    } catch (error) {
      Alert.alert('读取失败', error.message || '无法读取使用时间段');
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!selectedPackageName) return;
      if (filterPickerActiveRef.current) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      setSelectedPackageName(null);
    });

    return unsubscribe;
  }, [navigation, selectedPackageName]);

  const selectedPackages = useMemo(
    () => new Set(blacklist.map((item) => item.packageName)),
    [blacklist]
  );
  const allPackageNames = useMemo(
    () => blacklist.map((item) => item.packageName),
    [blacklist]
  );

  const visibleIntervals = useMemo(() => (
    mergeAdjacentUsageIntervals(
      intervals.filter((item) => selectedPackages.has(item.packageName))
    ).sort((a, b) => b.startTime - a.startTime)
  ), [intervals, selectedPackages]);

  const apps = useMemo(() => {
    const byPackage = new Map(blacklist.map((item) => [item.packageName, item]));
    const durationByPackage = new Map();
    const countByPackage = new Map();
    visibleIntervals.forEach((item) => {
      durationByPackage.set(
        item.packageName,
        (durationByPackage.get(item.packageName) || 0) + item.durationMs
      );
      countByPackage.set(item.packageName, (countByPackage.get(item.packageName) || 0) + 1);
    });

    return blacklist
      .map((app) => ({
        ...app,
        durationMs: durationByPackage.get(app.packageName) || 0,
        count: countByPackage.get(app.packageName) || 0,
      }))
      .sort((a, b) => b.durationMs - a.durationMs || a.label.localeCompare(b.label));
  }, [blacklist, visibleIntervals]);

  const currentRange = RANGE_OPTIONS[rangeIndex];
  const activeDateRange = useMemo(() => {
    if (filterDateRange) return filterDateRange;
    return {
      startDate: moment().startOf('day').subtract(currentRange.days - 1, 'days').format('YYYY-MM-DD'),
      endDate: moment().format('YYYY-MM-DD'),
    };
  }, [currentRange.days, filterDateRange]);
  const activeAppPackages = useMemo(() => {
    if (selectedPackageName && selectedPackageName !== '__all__') {
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
  const currentApp = selectedPackageName && selectedPackageName !== '__all__'
    ? blacklist.find((item) => item.packageName === selectedPackageName)
    : null;
  const title = selectedPackageName
    ? (currentApp?.label || '全部记录')
    : '使用时间段';
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

  const handleBack = () => {
    if (selectedPackageName) {
      setSelectedPackageName(null);
      return;
    }
    navigation.goBack();
  };

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
      returnTo: 'ExperimentalUsageIntervals',
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
      Alert.alert('日期无效', '请选择有效的起止日期');
      return;
    }
    if (start.isAfter(end, 'day')) {
      Alert.alert('日期无效', '开始日期不能晚于结束日期');
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
          <Ionicons name="apps-outline" size={18} color="#7A7A7A" />
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
          <Ionicons name="apps-outline" size={18} color="#7A7A7A" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </View>

      {selectedPackageName ? (
        <View style={styles.detailContent}>
          <View style={styles.fixedDetailHeader}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{rangedIntervals.length} 条记录</Text>
              <Text style={styles.summaryText}>合计 {formatDuration(totalDuration)}</Text>
            </View>

            <View style={styles.filterBar}>
              {filterDateRange ? (
                <Text style={styles.customRangeText} numberOfLines={1}>
                  {activeDateRangeLabel}
                </Text>
              ) : (
                <View style={styles.rangeGroup}>
                  {RANGE_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.rangeButton,
                        option.key === currentRange.key && styles.rangeButtonActive,
                        index === 0 && styles.rangeButtonFirst,
                        index === RANGE_OPTIONS.length - 1 && styles.rangeButtonLast,
                      ]}
                      onPress={() => setRangeIndex(index)}
                    >
                      <Text
                        style={[
                          styles.rangeText,
                          option.key === currentRange.key && styles.rangeTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.filterButton} onPress={handleOpenFilterModal}>
                <Ionicons name="filter-outline" size={18} color="#8A4B00" />
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
                      {formatDuration(group.durationMs)}
                    </Text>
                  </View>
                  {group.intervals.map((item) => (
                    <View key={`${item.packageName}-${item.startTime}-${item.endTime}`} style={styles.intervalRow}>
                      {selectedPackageName === '__all__' && renderAppIcon(item.app)}
                      <View style={styles.intervalTextBlock}>
                        <Text style={styles.intervalTitle} numberOfLines={1}>
                          {selectedPackageName === '__all__' ? item.appLabel : '使用记录'}
                        </Text>
                      </View>
                      <View style={styles.intervalMeta}>
                        <Text style={styles.intervalTime}>
                          {moment(item.startTime).format('HH:mm')} - {moment(item.endTime).format('HH:mm')}
                        </Text>
                        <Text style={styles.intervalDuration}>{formatDuration(item.durationMs)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <>
            <View style={styles.appList}>
              <TouchableOpacity style={styles.appRow} onPress={() => setSelectedPackageName('__all__')}>
                <View style={styles.allIcon}>
                  <Ionicons name="layers-outline" size={20} color="#F57F17" />
                </View>
                <View style={styles.appTextBlock}>
                  <Text style={styles.appLabel}>全部记录</Text>
                  <Text style={styles.packageName}>
                    {visibleIntervals.length} 条，合计 {formatDuration(visibleIntervals.reduce((sum, item) => sum + item.durationMs, 0))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#777" />
              </TouchableOpacity>

              {apps.map((app) => (
                <TouchableOpacity
                  key={app.packageName}
                  style={styles.appRow}
                  onPress={() => setSelectedPackageName(app.packageName)}
                >
                  {renderAppIcon(app)}
                  <View style={styles.appTextBlock}>
                    <Text style={styles.appLabel}>{app.label}</Text>
                    <Text style={styles.packageName}>
                      {app.count} 条，合计 {formatDuration(app.durationMs)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#777" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        </ScrollView>
      )}

      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseFilterModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseFilterModal} />
          <View style={styles.filterModal}>
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
                    <Ionicons name="create-outline" size={20} color="#8A4B00" />
                  </TouchableOpacity>
                </>
              ) : (
                renderFilterAppIcon(currentApp, undefined)
              )}
            </View>

            <View style={styles.dateRangeRow}>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => handlePickDate('filterStart')}
              >
                <Text style={styles.dateText}>{pendingStartDate}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>-</Text>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => handlePickDate('filterEnd')}
              >
                <Text style={styles.dateText}>{pendingEndDate}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={hasAnyFilter ? handleClearFilter : handleCloseFilterModal}
              >
                <Text style={styles.secondaryActionText}>
                  {hasAnyFilter ? '清除筛选' : '取消'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmAction} onPress={handleConfirmFilter}>
                <Text style={styles.confirmActionText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={appFilterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAppFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setAppFilterModalVisible(false)}
          />
          <View style={styles.appFilterModal}>
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
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmAction}
                onPress={() => setAppFilterModalVisible(false)}
              >
                <Text style={styles.confirmActionText}>确定</Text>
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
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  detailContent: {
    flex: 1,
  },
  fixedDetailHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
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
    borderColor: '#ECEFF3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFF8E1',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A4B00',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#5F4300',
  },
  filterBar: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    color: '#777',
  },
  rangeTextActive: {
    fontWeight: '700',
    color: '#8A4B00',
  },
  customRangeText: {
    flex: 1,
    paddingRight: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#8A4B00',
  },
  filterButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  filterModal: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  appFilterModal: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
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
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
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
  appFilterSection: {
    marginBottom: 14,
  },
  appFilterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  appFilterIconRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appList: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  appRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  allIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  appLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  packageName: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    lineHeight: 22,
  },
  dateGroup: {
    marginTop: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E1',
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
    color: '#8A4B00',
  },
  dateDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A4B00',
  },
  intervalRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: '#333',
  },
  intervalMeta: {
    alignItems: 'flex-end',
  },
  intervalTime: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  intervalDuration: {
    fontSize: 12,
    color: '#777',
  },
});

export default ExperimentalUsageIntervalsScreen;
