/**
 * 黑名单使用时间段查看界面
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  const initialPackageName = route.params?.packageName || null;
  const [selectedPackageName, setSelectedPackageName] = useState(initialPackageName);
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
    }, [loadState])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!selectedPackageName) return;
      event.preventDefault();
      setSelectedPackageName(null);
    });

    return unsubscribe;
  }, [navigation, selectedPackageName]);

  const selectedPackages = useMemo(
    () => new Set(blacklist.map((item) => item.packageName)),
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

  const filteredIntervals = useMemo(() => (
    selectedPackageName && selectedPackageName !== '__all__'
      ? visibleIntervals.filter((item) => item.packageName === selectedPackageName)
      : visibleIntervals
  ), [selectedPackageName, visibleIntervals]);

  const totalDuration = filteredIntervals.reduce((sum, item) => sum + item.durationMs, 0);
  const intervalGroups = useMemo(
    () => groupIntervalsByDate(filteredIntervals, blacklist),
    [filteredIntervals, blacklist]
  );
  const currentApp = selectedPackageName && selectedPackageName !== '__all__'
    ? blacklist.find((item) => item.packageName === selectedPackageName)
    : null;
  const title = selectedPackageName
    ? (currentApp?.label || '全部记录')
    : '使用时间段';

  const handleBack = () => {
    if (selectedPackageName) {
      setSelectedPackageName(null);
      return;
    }
    navigation.goBack();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {selectedPackageName ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{filteredIntervals.length} 条记录</Text>
              <Text style={styles.summaryText}>合计 {formatDuration(totalDuration)}</Text>
            </View>

            {filteredIntervals.length === 0 ? (
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
          </>
        ) : (
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
        )}
      </ScrollView>
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
