import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const CHECKIN_KEY = 'checkin_status';

/**
 * CustomStatsTable
 * 显示自定义时间范围内的统计：总计、日均；跨度>30天时增加月均；>365天时再增加年均
 * @param {{ startDate: string, endDate: string }} props
 */
const CustomStatsTable = ({ startDate, endDate }) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  const loadStats = async () => {
    const stored = await AsyncStorage.getItem(CHECKIN_KEY);
    const data = stored ? JSON.parse(stored) : {};

    const start = moment(startDate, 'YYYY-MM-DD');
    const end = moment(endDate, 'YYYY-MM-DD');
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      setRows([]);
      return;
    }

    // 统计总计
    let total = { tutorial: 0, weapon: 0, duo: 0 };
    Object.entries(data).forEach(([dateStr, status]) => {
      const m = moment(dateStr, 'YYYY-MM-DD');
      if (!m.isValid() || m.isBefore(start) || m.isAfter(end)) return;
      if (status & 1) total.tutorial += 1;
      if (status & 2) total.weapon += 1;
      if (status & 4) total.duo += 1;
    });

    // 计算天数
    const days = end.diff(start, 'days') + 1;
    // 日均
    const daily = {
      tutorial: (total.tutorial / days).toFixed(2),
      weapon:   (total.weapon   / days).toFixed(2),
      duo:      (total.duo      / days).toFixed(2),
    };

    // 构建行
    const newRows = [
      { label: '总计', ...total },
      { label: '日均', ...daily },
    ];

    // 跨度 >30天 时月均
    if (days > 30) {
      const monthAvg = {
        tutorial: (daily.tutorial * 30).toFixed(2),
        weapon:   (daily.weapon   * 30).toFixed(2),
        duo:      (daily.duo      * 30).toFixed(2),
      };
      newRows.push({ label: '月均', ...monthAvg });
    }

    // 跨度 >365天 时年均
    if (days > 365) {
      const yearlyAvg = {
        tutorial: (daily.tutorial * 365).toFixed(2),
        weapon:   (daily.weapon   * 365).toFixed(2),
        duo:      (daily.duo      * 365).toFixed(2),
      };
      newRows.push({ label: '年均', ...yearlyAvg });
    }

    setRows(newRows);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={styles.cellLabel}>日期</Text>
      <Text style={styles.cell}>观看教程</Text>
      <Text style={styles.cell}>武器强化</Text>
      <Text style={styles.cell}>双人练习</Text>
    </View>
  );

  const renderRow = (row, idx) => (
    <View key={idx} style={styles.row}>
      <Text style={styles.cellLabel}>{row.label}</Text>
      <Text style={styles.cell}>{row.tutorial}</Text>
      <Text style={styles.cell}>{row.weapon}</Text>
      <Text style={styles.cell}>{row.duo}</Text>
    </View>
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {renderHeader()}
      {rows.map(renderRow)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12 },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
  },
  header: {
    borderBottomWidth: 1,
    backgroundColor: '#f0f0f0',
  },
  cellLabel: {
    flex: 1.2,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: '#333',
  },
});

export default CustomStatsTable;
