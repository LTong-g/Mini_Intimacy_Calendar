/**
 * 极简武器强化日历 - 记录数据存储工具
 * 提供记录状态的读写和管理功能
 * @author Lyu Jiongrui
 * @version 1.0.0
 * @date 2025.7.25
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 存储键名
 * @constant {string}
 */
export const CHECKIN_KEY = 'checkin_status';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
let cachedCheckInData = null;

export const CheckInCountKeys = {
  TYPE1: 'tutorial',
  TYPE2: 'weapon',
  TYPE3: 'duo',
};

/**
 * 记录类型枚举（使用位运算）
 * @enum {number}
 * @readonly
 */
export const CheckInTypes = {
  NONE: 0,     // 无记录
  TYPE1: 1,    // 观看教程
  TYPE2: 2,    // 武器强化
  TYPE3: 4,    // 联机训练
  TYPE12: 3,   // 观看教程+武器强化组合
  TYPE13: 5,   // 观看教程+联机训练组合
  TYPE23: 6,   // 武器强化+联机训练组合
  TYPE123: 7,  // 全部记录类型
};

const TYPE_TO_COUNT_KEY = {
  [CheckInTypes.TYPE1]: CheckInCountKeys.TYPE1,
  [CheckInTypes.TYPE2]: CheckInCountKeys.TYPE2,
  [CheckInTypes.TYPE3]: CheckInCountKeys.TYPE3,
};

const CHECKIN_COUNT_KEY_VALUES = Object.values(CheckInCountKeys);

const createEmptyCheckInRecord = () => ({
  [CheckInCountKeys.TYPE1]: 0,
  [CheckInCountKeys.TYPE2]: 0,
  [CheckInCountKeys.TYPE3]: 0,
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeCount = (value, strict = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    if (strict) throw new Error('记录次数必须是数字');
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    if (strict) throw new Error('记录次数必须是非负整数');
    return Math.max(0, Math.floor(value));
  }

  return value;
};

const getRecordCount = (record, key, strict = false) => {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return 0;
  return normalizeCount(record[key], strict);
};

const resolveCheckInCountKey = (typeOrKey) => {
  if (CHECKIN_COUNT_KEY_VALUES.includes(typeOrKey)) return typeOrKey;
  return TYPE_TO_COUNT_KEY[typeOrKey];
};

export const hasAnyCheckIn = (record) =>
  record[CheckInCountKeys.TYPE1] > 0 ||
  record[CheckInCountKeys.TYPE2] > 0 ||
  record[CheckInCountKeys.TYPE3] > 0;

export const bitmaskToCheckInRecord = (status) => {
  const flag = typeof status === 'number' ? status : parseInt(status, 10) || 0;
  return {
    [CheckInCountKeys.TYPE1]: flag & CheckInTypes.TYPE1 ? 1 : 0,
    [CheckInCountKeys.TYPE2]: flag & CheckInTypes.TYPE2 ? 1 : 0,
    [CheckInCountKeys.TYPE3]: flag & CheckInTypes.TYPE3 ? 1 : 0,
  };
};

export const normalizeCheckInRecord = (value, options = {}) => {
  const { strict = false } = options;

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || value > CheckInTypes.TYPE123) {
      if (strict) throw new Error('旧格式记录值必须是0到7之间的整数');
      return createEmptyCheckInRecord();
    }
    return bitmaskToCheckInRecord(value);
  }

  if (!isPlainObject(value)) {
    if (strict) throw new Error('记录值格式无效');
    return createEmptyCheckInRecord();
  }

  return {
    [CheckInCountKeys.TYPE1]: getRecordCount(value, CheckInCountKeys.TYPE1, strict),
    [CheckInCountKeys.TYPE2]: getRecordCount(value, CheckInCountKeys.TYPE2, strict),
    [CheckInCountKeys.TYPE3]: getRecordCount(value, CheckInCountKeys.TYPE3, strict),
  };
};

export const checkInRecordToBitmask = (record) => {
  const normalized = normalizeCheckInRecord(record);
  let status = CheckInTypes.NONE;
  if (normalized[CheckInCountKeys.TYPE1] > 0) status |= CheckInTypes.TYPE1;
  if (normalized[CheckInCountKeys.TYPE2] > 0) status |= CheckInTypes.TYPE2;
  if (normalized[CheckInCountKeys.TYPE3] > 0) status |= CheckInTypes.TYPE3;
  return status;
};

export const normalizeCheckInData = (raw, options = {}) => {
  const { strict = false } = options;
  if (!isPlainObject(raw)) {
    if (strict) throw new Error('数据格式必须是对象');
    return { data: {}, migrated: true };
  }

  const data = {};
  let migrated = false;

  Object.entries(raw).forEach(([dateStr, value]) => {
    if (!DATE_KEY_RE.test(dateStr)) {
      if (strict) throw new Error('日期格式必须为YYYY-MM-DD');
      migrated = true;
      return;
    }

    const record = normalizeCheckInRecord(value, { strict });
    if (hasAnyCheckIn(record)) {
      data[dateStr] = record;
    } else if (value !== undefined) {
      migrated = true;
    }

    if (typeof value === 'number') {
      migrated = true;
    } else if (!isPlainObject(value)) {
      migrated = true;
    } else {
      const keys = Object.keys(value).sort().join(',');
      if (keys !== 'duo,tutorial,weapon') migrated = true;
    }
  });

  return { data, migrated };
};

export const getAllCheckInData = async () => {
  const stored = await AsyncStorage.getItem(CHECKIN_KEY);
  const raw = stored ? JSON.parse(stored) : {};
  const { data, migrated } = normalizeCheckInData(raw);

  if (migrated) {
    await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(data));
  }

  cachedCheckInData = data;
  return data;
};

export const importCheckInData = async (raw) => {
  const { data } = normalizeCheckInData(raw, { strict: true });
  await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(data));
  cachedCheckInData = data;
  return data;
};

export const exportCheckInData = async () => {
  return getAllCheckInData();
};

export const getCheckInRecord = async (date) => {
  try {
    const dateStr = date.format('YYYY-MM-DD');
    const data = await getAllCheckInData();
    return data[dateStr] || createEmptyCheckInRecord();
  } catch (error) {
    console.error('Error getting check-in record:', error);
    return createEmptyCheckInRecord();
  }
};

const buildCheckInStatusMap = (data, startDate, endDate) => {
  const statusMap = {};
  const current = startDate.clone().startOf('day');
  const end = endDate.clone().startOf('day');

  while (current.isSameOrBefore(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    statusMap[dateStr] = data[dateStr]
      ? checkInRecordToBitmask(data[dateStr])
      : CheckInTypes.NONE;
    current.add(1, 'day');
  }

  return statusMap;
};

export const getCachedCheckInStatusMap = (startDate, endDate) => {
  if (!cachedCheckInData) return null;
  return buildCheckInStatusMap(cachedCheckInData, startDate, endDate);
};

export const getCheckInStatusMap = async (startDate, endDate) => {
  try {
    const data = await getAllCheckInData();
    return buildCheckInStatusMap(data, startDate, endDate);
  } catch (error) {
    console.error('Error getting check-in status map:', error);
    return {};
  }
};

export const setCheckInRecord = async (date, record) => {
  try {
    const dateStr = date.format('YYYY-MM-DD');
    const data = await getAllCheckInData();
    const normalized = normalizeCheckInRecord(record);

    if (hasAnyCheckIn(normalized)) {
      data[dateStr] = normalized;
    } else {
      delete data[dateStr];
    }

    await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(data));
    cachedCheckInData = data;
    return true;
  } catch (error) {
    console.error('Error setting check-in record:', error);
    return false;
  }
};

export const incrementCheckInType = async (date, typeKey, amount = 1) => {
  const resolvedKey = resolveCheckInCountKey(typeKey);
  if (!resolvedKey) return false;

  const record = await getCheckInRecord(date);
  const next = { ...record };
  next[resolvedKey] = normalizeCount((next[resolvedKey] || 0) + amount);
  return setCheckInRecord(date, next);
};

export const decrementCheckInType = async (date, typeKey, amount = 1) => {
  const resolvedKey = resolveCheckInCountKey(typeKey);
  if (!resolvedKey) return false;

  const record = await getCheckInRecord(date);
  const next = { ...record };
  next[resolvedKey] = Math.max(0, normalizeCount(next[resolvedKey] || 0) - amount);
  return setCheckInRecord(date, next);
};

/**
 * 获取指定日期的记录状态
 * @param {moment} date - 要查询的日期
 * @returns {Promise<number>} 返回记录状态值，失败返回CheckInTypes.NONE
 */
export const getCheckInStatus = async (date) => {
  try {
    const record = await getCheckInRecord(date);
    return checkInRecordToBitmask(record);
  } catch (error) {
    console.error('Error getting check-in status:', error);
    return CheckInTypes.NONE;
  }
};

/**
 * 设置指定日期的记录状态
 * @param {moment} date - 要设置的日期
 * @param {number} status - 记录状态值
 * @returns {Promise<boolean>} 是否设置成功
 */
export const setCheckInStatus = async (date, status) => {
  try {
    return setCheckInRecord(date, bitmaskToCheckInRecord(status));
  } catch (error) {
    console.error('Error setting check-in status:', error);
    return false;
  }
};

/**
 * 切换指定类型的记录状态（使用位运算）
 * @param {number} currentStatus - 当前记录状态
 * @param {number} type - 要切换的记录类型
 * @returns {number} 新的记录状态
 */
export const toggleCheckInType = (currentStatus, type) => {
  return currentStatus ^ type;
};

export const checkInTypeToCountKey = (type) => resolveCheckInCountKey(type);

/**
 * 根据记录状态获取对应的图标配置
 * @param {number|Object} status - 记录状态或新格式记录对象
 * @returns {Array<Object>} 图标配置数组，包含icon和color属性
 */
export const getCheckInIcons = (status) => {
  const normalizedStatus = checkInRecordToBitmask(status);
  const icons = [];
  if (normalizedStatus & CheckInTypes.TYPE1) icons.push({ icon: 'desktop', color: '#F57F17' });
  if (normalizedStatus & CheckInTypes.TYPE2) icons.push({ icon: 'airplane', color: '#0277BD' });
  if (normalizedStatus & CheckInTypes.TYPE3) icons.push({ icon: 'heart', color: '#C62828' });
  return icons;
};

export const getCheckInRecordCount = (record, typeKey) => {
  const normalized = normalizeCheckInRecord(record);
  const key = resolveCheckInCountKey(typeKey);
  if (!key) return 0;
  return normalized[key] || 0;
};
