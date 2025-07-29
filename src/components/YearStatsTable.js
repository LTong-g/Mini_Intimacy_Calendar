import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";

const CHECKIN_KEY = "checkin_status";

const YearStatsTable = ({ year }) => {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    loadStats();
  }, [year]);

  const loadStats = async () => {
    const stored = await AsyncStorage.getItem(CHECKIN_KEY);
    const data = stored ? JSON.parse(stored) : {};

    const monthMap = {};
    let total = { tutorial: 0, weapon: 0, duo: 0 };

    for (let i = 1; i <= 12; i++) {
      monthMap[i] = { tutorial: 0, weapon: 0, duo: 0 };
    }

    Object.entries(data).forEach(([dateStr, status]) => {
      const m = moment(dateStr);
      if (m.year() !== year) return;
      const month = m.month() + 1;

      if (status & 1) {
        monthMap[month].tutorial += 1;
        total.tutorial += 1;
      }
      if (status & 2) {
        monthMap[month].weapon += 1;
        total.weapon += 1;
      }
      if (status & 4) {
        monthMap[month].duo += 1;
        total.duo += 1;
      }
    });

    const average = {
      tutorial: (total.tutorial / 12).toFixed(2),
      weapon: (total.weapon / 12).toFixed(2),
      duo: (total.duo / 12).toFixed(2),
    };

    const rows = [
      { label: "总计", ...total },
      { label: "月均", ...average },
      ...Array.from({ length: 12 }, (_, i) => {
        const m = 12 - i;
        return {
          label: `${m.toString()}月`,
          ...monthMap[m],
        };
      }),
    ];

    setStats(rows);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={styles.cellLabel}>日期</Text>
      <Text style={styles.cell}>观看教程</Text>
      <Text style={styles.cell}>武器强化</Text>
      <Text style={styles.cell}>双人练习</Text>
    </View>
  );

  const renderRow = (row, index) => (
    <View key={index} style={styles.row}>
      <Text style={styles.cellLabel}>{row.label}</Text>
      <Text style={styles.cell}>{row.tutorial}</Text>
      <Text style={styles.cell}>{row.weapon}</Text>
      <Text style={styles.cell}>{row.duo}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderHeader()}
      {stats.map(renderRow)}
    </ScrollView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
  },
  header: {
    borderBottomWidth: 1,
    textAlign: "center",
    backgroundColor: "#f0f0f0",
  },
  cellLabel: {
    flex: 1.2,
    textAlign: "center",
    fontWeight: "bold",
    color: "#333",
  },
  cell: {
    flex: 1,
    textAlign: "center",
    color: "#333",
  },
});

export default YearStatsTable;
