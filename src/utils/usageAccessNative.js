import { NativeModules, Platform } from 'react-native';

const { UsageAccessModule } = NativeModules;

export const isUsageAccessNativeAvailable = () =>
  Platform.OS === 'android' && Boolean(UsageAccessModule);

const unavailableStatus = {
  featureEnabled: false,
  usageAccessGranted: false,
  ignoringBatteryOptimizations: false,
  canScheduleExactAlarms: false,
  canRevokeUsageAccessInApp: false,
};

export const getUsageAccessStatus = async () => {
  if (!isUsageAccessNativeAvailable()) return unavailableStatus;
  return UsageAccessModule.getStatus();
};

export const setUsageAccessFeatureEnabled = async (enabled) => {
  if (!isUsageAccessNativeAvailable()) return unavailableStatus;
  return UsageAccessModule.setFeatureEnabled(enabled);
};

export const openUsageAccessSettings = async () => {
  if (!isUsageAccessNativeAvailable()) return false;
  return UsageAccessModule.openUsageAccessSettings();
};

export const openAppDetailsSettings = async () => {
  if (!isUsageAccessNativeAvailable()) return false;
  return UsageAccessModule.openAppDetailsSettings();
};

export const openExactAlarmSettings = async () => {
  if (!isUsageAccessNativeAvailable()) return false;
  return UsageAccessModule.openExactAlarmSettings();
};

export const openBatteryOptimizationSettings = async () => {
  if (!isUsageAccessNativeAvailable()) return false;
  return UsageAccessModule.openBatteryOptimizationSettings();
};

export const requestIgnoreBatteryOptimizations = async () => {
  if (!isUsageAccessNativeAvailable()) return false;
  return UsageAccessModule.requestIgnoreBatteryOptimizations();
};

export const clearStoredUsageRecords = async () => {
  if (!isUsageAccessNativeAvailable()) return unavailableStatus;
  return UsageAccessModule.clearStoredUsageRecords();
};

export const getLaunchableApplications = async () => {
  if (!isUsageAccessNativeAvailable()) return [];
  return UsageAccessModule.getLaunchableApplications();
};

export const refreshUsageRecords = async (beginTime, endTime, reason = 'app_manual') => {
  if (!isUsageAccessNativeAvailable()) {
    throw new Error('当前平台不支持读取使用记录');
  }
  return UsageAccessModule.refreshUsageRecords(beginTime, endTime, reason);
};
