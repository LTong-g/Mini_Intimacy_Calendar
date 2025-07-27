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
const CHECKIN_KEY = 'checkin_status';

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

/**
 * 获取指定日期的记录状态
 * @param {moment} date - 要查询的日期
 * @returns {Promise<number>} 返回记录状态值，失败返回CheckInTypes.NONE
 */
export const getCheckInStatus = async (date) => {
  try {
    const dateStr = date.format('YYYY-MM-DD');
    const stored = await AsyncStorage.getItem(CHECKIN_KEY);
    const data = stored ? JSON.parse(stored) : {};
    return data[dateStr] || CheckInTypes.NONE;
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
    const dateStr = date.format('YYYY-MM-DD');
    const stored = await AsyncStorage.getItem(CHECKIN_KEY);
    const data = stored ? JSON.parse(stored) : {};
    
    if (status === CheckInTypes.NONE) {
      delete data[dateStr];
    } else {
      data[dateStr] = status;
    }
    
    await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(data));
    return true;
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

/**
 * 根据记录状态获取对应的图标配置
 * @param {number} status - 记录状态
 * @returns {Array<Object>} 图标配置数组，包含icon和color属性
 */
export const getCheckInIcons = (status) => {
  const icons = [];
  if (status & CheckInTypes.TYPE1) icons.push({ icon: 'desktop', color: '#F57F17' });
  if (status & CheckInTypes.TYPE2) icons.push({ icon: 'airplane', color: '#0277BD' });
  if (status & CheckInTypes.TYPE3) icons.push({ icon: 'heart', color: '#C62828' });
  return icons;
};