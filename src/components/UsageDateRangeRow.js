import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UsageDateRangeRow = ({
  startDate,
  endDate,
  onStartPress,
  onEndPress,
}) => (
  <View style={styles.dateRangeRow}>
    <TouchableOpacity style={styles.dateBox} onPress={onStartPress}>
      <Text style={styles.dateText}>{startDate}</Text>
    </TouchableOpacity>
    <Text style={styles.dateSeparator}>-</Text>
    <TouchableOpacity style={styles.dateBox} onPress={onEndPress}>
      <Text style={styles.dateText}>{endDate}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
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
    borderColor: '#F4D79A',
    borderRadius: 6,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#5F4300',
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5F4300',
    marginHorizontal: 12,
  },
});

export default UsageDateRangeRow;
