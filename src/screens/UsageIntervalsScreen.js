/**
 * 黑名单使用时间段入口页
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import BlacklistPageHeader from '../components/BlacklistPageHeader';
import { showAppAlert } from '../utils/appAlert';
import { formatUsageDurationChinese } from '../utils/usageDurationFormat';
import { BLACKLIST_COLORS } from '../utils/usageTheme';
import {
  getExperimentalUsageKnownApps,
  getExperimentalUsageIntervals,
  mergeAdjacentUsageIntervals,
} from '../utils/usageStorage';

const showBlacklistAlert = (title, message, buttons, options = {}) => (
  showAppAlert(title, message, buttons, { ...options, theme: 'blacklist' })
);

const ExperimentalUsageIntervalsScreen = () => {
  const navigation = useNavigation();
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
    }, [loadState])
  );

  const visibleIntervals = useMemo(() => (
    mergeAdjacentUsageIntervals(intervals).sort((a, b) => b.startTime - a.startTime)
  ), [intervals]);

  const apps = useMemo(() => {
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

  const totalDuration = visibleIntervals.reduce((sum, item) => sum + item.durationMs, 0);

  const openRecords = (packageName) => {
    navigation.navigate('ExperimentalUsageIntervalRecords', { packageName });
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

  return (
    <View style={styles.container}>
      <BlacklistPageHeader title="使用时间段" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.appList}>
          <TouchableOpacity style={styles.appRow} onPress={() => openRecords('__all__')}>
            <View style={styles.allIcon}>
              <Ionicons name="layers-outline" size={20} color={BLACKLIST_COLORS.primary} />
            </View>
            <View style={styles.appTextBlock}>
              <Text style={styles.appLabel}>全部记录</Text>
              <Text style={styles.packageName}>
                {visibleIntervals.length} 条，合计 {formatUsageDurationChinese(totalDuration)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={BLACKLIST_COLORS.textMuted} />
          </TouchableOpacity>

          {apps.map((app) => (
            <TouchableOpacity
              key={app.packageName}
              style={styles.appRow}
              onPress={() => openRecords(app.packageName)}
            >
              {renderAppIcon(app)}
              <View style={styles.appTextBlock}>
                <Text style={styles.appLabel}>{app.label}</Text>
                <Text style={styles.packageName}>
                  {app.count} 条，合计 {formatUsageDurationChinese(app.durationMs)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={BLACKLIST_COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: BLACKLIST_COLORS.surface,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  appList: {
    borderWidth: 1,
    borderColor: BLACKLIST_COLORS.secondaryBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  appRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BLACKLIST_COLORS.divider,
  },
  allIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
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
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
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
    color: BLACKLIST_COLORS.text,
    marginBottom: 2,
  },
  packageName: {
    fontSize: 12,
    color: BLACKLIST_COLORS.secondary,
  },
});

export default ExperimentalUsageIntervalsScreen;
