// StatsTable.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const StatsTable = ({ rows }) => (
  <ScrollView style={styles.container}>
    <View style={[styles.row, styles.header]}>
      <Text style={styles.cellLabel}>日期</Text>
      <Text style={styles.cell}>观看教程</Text>
      <Text style={styles.cell}>武器强化</Text>
      <Text style={styles.cell}>双人练习</Text>
    </View>
    {rows.map((row, idx) => (
      <View key={idx} style={styles.row}>
        <Text style={styles.cellLabel}>{row.label}</Text>
        <Text style={styles.cell}>{row.tutorial}</Text>
        <Text style={styles.cell}>{row.weapon}</Text>
        <Text style={styles.cell}>{row.duo}</Text>
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
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

export default StatsTable;
