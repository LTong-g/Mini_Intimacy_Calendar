/**
 * 极简武器强化日历 - 设置界面
 * 功能：展示设置项（如导入/导出），顶部带返回按钮
 * 支持导入导出打卡数据为JSON文件
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportCheckInData, importCheckInData } from '../utils/checkInStorage';
import {
  clearStoredUsageRecords,
  getUsageAccessStatus,
  isUsageAccessNativeAvailable,
  openAppDetailsSettings,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  openUsageAccessSettings,
  requestIgnoreBatteryOptimizations,
  setUsageAccessFeatureEnabled,
} from '../utils/usageAccessNative';

const EXPORT_FILE_BASENAME = 'EnhancementRecords';
const EXPORT_MIME_TYPE = 'application/json';
const SWITCH_COLORS = {
  track: {
    false: '#D1D5DB',
    true: '#8EC5FF',
  },
  thumb: {
    false: '#F8F9FA',
    true: '#007AFF',
  },
  iosBackground: '#D1D5DB',
};

const getSwitchColorProps = (enabled) => ({
  trackColor: SWITCH_COLORS.track,
  thumbColor: enabled ? SWITCH_COLORS.thumb.true : SWITCH_COLORS.thumb.false,
  ios_backgroundColor: SWITCH_COLORS.iosBackground,
});

const buildExportFileName = () => {
  const ts = new Date().toISOString().replace(/[.:]/g, '-');
  return `${EXPORT_FILE_BASENAME}_${ts}.json`;
};

const saveExportToAndroidSharedStorage = async (content) => {
  const { StorageAccessFramework } = FileSystem;
  if (!StorageAccessFramework) return { saved: false, reason: 'unavailable' };

  const downloadRootUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadRootUri);

  if (!permission.granted || !permission.directoryUri) {
    return { saved: false, reason: 'canceled' };
  }

  const targetUri = await StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    buildExportFileName(),
    EXPORT_MIME_TYPE
  );

  await FileSystem.writeAsStringAsync(targetUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { saved: true, reason: 'saved' };
};

const createTempExportFileForSharing = async (content) => {
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('无法获取导出目录');
  }

  const uri = baseDir + buildExportFileName();
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return uri;
};

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [usageStatus, setUsageStatus] = useState({
    featureEnabled: false,
    usageAccessGranted: false,
    ignoringBatteryOptimizations: false,
    canScheduleExactAlarms: false,
    canRevokeUsageAccessInApp: false,
  });
  const [usageStatusLoading, setUsageStatusLoading] = useState(false);
  const [usageAccessPending, setUsageAccessPending] = useState(null);
  const usageAccessAvailable = isUsageAccessNativeAvailable();
  const usageSwitchOn = usageAccessPending ?? usageStatus.usageAccessGranted;

  const refreshUsageStatus = useCallback(async () => {
    if (!usageAccessAvailable) return;
    try {
      setUsageStatusLoading(true);
      const nextStatus = await getUsageAccessStatus();
      setUsageAccessPending(null);
      if (nextStatus.featureEnabled && !nextStatus.usageAccessGranted) {
        const disabledStatus = await setUsageAccessFeatureEnabled(false);
        setUsageStatus(disabledStatus);
        return;
      }
      if (!nextStatus.featureEnabled && nextStatus.usageAccessGranted) {
        const enabledStatus = await setUsageAccessFeatureEnabled(true);
        setUsageStatus(enabledStatus);
        return;
      }
      setUsageStatus(nextStatus);
    } catch (error) {
      Alert.alert('状态读取失败', error.message || '无法读取使用记录权限状态');
    } finally {
      setUsageStatusLoading(false);
    }
  }, [usageAccessAvailable]);

  useEffect(() => {
    refreshUsageStatus();
  }, [refreshUsageStatus]);

  useFocusEffect(
    useCallback(() => {
      refreshUsageStatus();
    }, [refreshUsageStatus])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshUsageStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshUsageStatus]);

  const buildExportContent = async () => {
    const data = await exportCheckInData();
    if (Object.keys(data).length === 0) {
      return null;
    }
    return JSON.stringify(data, null, 2);
  };

  // 导出打卡记录为 JSON
  const handleExport = async () => {
    try {
      const content = await buildExportContent();
      if (!content) {
        Alert.alert('导出失败', '没有可导出的数据');
        return;
      }

      if (Platform.OS === 'android') {
        const saveResult = await saveExportToAndroidSharedStorage(content);
        if (saveResult.saved) {
          Alert.alert('导出成功', '文件已保存到你选择的目录');
          return;
        }
        if (saveResult.reason === 'canceled') {
          return;
        }
      }

      const shareUri = await createTempExportFileForSharing(content);
      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        Alert.alert('导出失败', '当前设备不支持系统分享');
        return;
      }

      await Sharing.shareAsync(shareUri, {
        dialogTitle: '导出记录文件',
        mimeType: EXPORT_MIME_TYPE,
      });
    } catch (error) {
      Alert.alert('导出失败', '发生错误：' + error.message);
    }
  };

  // 分享导出的 JSON 文件
  const handleShare = async () => {
    try {
      const content = await buildExportContent();
      if (!content) {
        Alert.alert('分享失败', '没有可分享的数据');
        return;
      }

      const shareUri = await createTempExportFileForSharing(content);
      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        Alert.alert('分享失败', '当前设备不支持系统分享');
        return;
      }

      await Sharing.shareAsync(shareUri, {
        dialogTitle: '分享记录文件',
        mimeType: EXPORT_MIME_TYPE,
      });
    } catch (error) {
      Alert.alert('分享失败', '发生错误：' + error.message);
    }
  };

  // 导入 JSON 文件并写入本地存储
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = JSON.parse(content);

      await importCheckInData(parsed);
      Alert.alert('导入成功', '记录已导入');
    } catch (error) {
      Alert.alert('导入失败', error.message || '无法解析文件内容');
    }
  };

  const handleEnableUsageAccess = async () => {
    try {
      setUsageAccessPending(true);
      await openUsageAccessSettings();
    } catch (error) {
      setUsageAccessPending(null);
      Alert.alert('开启失败', error.message || '无法开启使用记录辅助功能');
    }
  };

  const handleDisableUsageAccess = async () => {
    try {
      setUsageAccessPending(false);
      await openUsageAccessSettings();
    } catch (error) {
      setUsageAccessPending(null);
      Alert.alert('打开失败', error.message || '无法打开使用情况访问权限设置');
    }
  };

  const handleToggleUsageAccess = (enabled) => {
    if (enabled) {
      handleEnableUsageAccess();
    } else {
      handleDisableUsageAccess();
    }
  };

  const handleToggleBatteryOptimization = async (enabled) => {
    try {
      if (enabled) {
        await requestIgnoreBatteryOptimizations();
      } else {
        await openBatteryOptimizationSettings();
      }
    } catch (error) {
      Alert.alert('打开失败', error.message || '无法打开电池优化设置');
    }
  };

  const handleOpenExactAlarmSettings = async () => {
    try {
      await openExactAlarmSettings();
      refreshUsageStatus();
    } catch (error) {
      Alert.alert('打开失败', error.message || '无法打开精确闹钟设置');
    }
  };

  const handleOpenAppSettings = async () => {
    try {
      await openAppDetailsSettings();
    } catch (error) {
      Alert.alert('打开失败', error.message || '无法打开应用详情设置');
    }
  };

  const handleClearUsageRecords = () => {
    Alert.alert(
      '删除应用使用记录',
      '将删除本应用已保存的应用使用记录和刷新结果。此操作不会关闭系统使用情况访问权限，也不会删除手动打卡记录。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const nextStatus = await clearStoredUsageRecords();
              setUsageStatus(nextStatus);
              Alert.alert('删除完成', '已删除本应用保存的应用使用记录');
            } catch (error) {
              Alert.alert('删除失败', error.message || '无法删除应用使用记录');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部返回栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      {/* 导入/导出/分享功能 */}
      <View style={styles.section}>
        <View style={styles.settingCard}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.option} onPress={handleImport}>
              <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>导入</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.option, styles.optionMiddle]} onPress={handleExport}>
              <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>导出</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>分享</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {Platform.OS === 'android' && (
        <View style={styles.section}>
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingTitleRow}>
                <Ionicons name="shield-half-outline" size={20} color="#333" />
                <Text style={styles.settingTitle}>使用记录辅助</Text>
              </View>
              <Switch
                value={usageSwitchOn}
                disabled={!usageAccessAvailable || usageStatusLoading}
                onValueChange={handleToggleUsageAccess}
                {...getSwitchColorProps(usageSwitchOn)}
              />
            </View>
            <Text style={styles.settingDescription}>
              开启后应用会准备读取系统使用记录，并安排每天 23:55 至 23:59 同步使用记录。
            </Text>
            {!usageAccessAvailable && (
              <Text style={styles.warningText}>
                当前运行环境不支持原生使用记录模块，请使用 Android 开发构建或安装包。
              </Text>
            )}
            {usageAccessAvailable && usageSwitchOn && (
              <View style={styles.permissionList}>
                <Text style={styles.statusText}>
                  使用情况访问权限：{usageStatus.usageAccessGranted ? '已授权' : '未授权'}
                </Text>
                <Text style={styles.statusText}>
                  忽略电池优化：{usageStatus.ignoringBatteryOptimizations ? '已允许' : '未允许'}
                </Text>
                <Text style={styles.statusText}>
                  精确定时能力：{usageStatus.canScheduleExactAlarms ? '可用' : '未允许'}
                </Text>
                <View style={styles.permissionSwitchList}>
                  <View style={styles.permissionSwitchRow}>
                    <View style={styles.permissionSwitchTextBlock}>
                      <Text style={styles.permissionSwitchTitle}>忽略电池优化</Text>
                      <Text style={styles.permissionSwitchDescription}>
                        提高晚间刷新使用记录的稳定性
                      </Text>
                    </View>
                    <Switch
                      value={usageStatus.ignoringBatteryOptimizations}
                      onValueChange={handleToggleBatteryOptimization}
                      {...getSwitchColorProps(usageStatus.ignoringBatteryOptimizations)}
                    />
                  </View>
                  <View style={styles.permissionSwitchRow}>
                    <View style={styles.permissionSwitchTextBlock}>
                      <Text style={styles.permissionSwitchTitle}>精确定时权限</Text>
                      <Text style={styles.permissionSwitchDescription}>
                        支持 23:55 至 23:59 的定时同步
                      </Text>
                    </View>
                    <Switch
                      value={usageStatus.canScheduleExactAlarms}
                      onValueChange={handleOpenExactAlarmSettings}
                      {...getSwitchColorProps(usageStatus.canScheduleExactAlarms)}
                    />
                  </View>
                </View>
                <TouchableOpacity style={styles.linkButton} onPress={handleOpenAppSettings}>
                  <Text style={styles.linkButtonText}>打开应用详情设置</Text>
                </TouchableOpacity>
              </View>
            )}
            {usageAccessAvailable && (
              <TouchableOpacity
                style={[
                  styles.deleteUsageButton,
                  usageSwitchOn && styles.deleteUsageButtonDisabled,
                ]}
                disabled={usageSwitchOn}
                onPress={handleClearUsageRecords}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={usageSwitchOn ? '#999' : '#C62828'}
                />
                <Text
                  style={[
                    styles.deleteUsageButtonText,
                    usageSwitchOn && styles.deleteUsageButtonTextDisabled,
                  ]}
                >
                  删除应用使用记录
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44, // 适配顶部安全区
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
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  optionMiddle: {
    marginHorizontal: 8,
  },
  optionText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
  settingCard: {
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    padding: 14,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
    marginTop: 10,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#C62828',
    marginTop: 10,
  },
  permissionList: {
    marginTop: 12,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#444',
  },
  permissionSwitchList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  permissionSwitchRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  permissionSwitchTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  permissionSwitchTitle: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  permissionSwitchDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  linkButtonText: {
    color: '#007AFF',
    fontSize: 13,
  },
  deleteUsageButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  deleteUsageButtonDisabled: {
    borderColor: '#cfcfcf',
    backgroundColor: '#f4f4f4',
  },
  deleteUsageButtonText: {
    color: '#C62828',
    fontSize: 13,
    marginLeft: 6,
  },
  deleteUsageButtonTextDisabled: {
    color: '#999',
  },
});

export default SettingsScreen;
