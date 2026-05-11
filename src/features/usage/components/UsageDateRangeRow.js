import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BLACKLIST_COLORS } from '../utils/usageTheme';

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
    borderColor: BLACKLIST_COLORS.secondaryBorder,
    borderRadius: 6,
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: BLACKLIST_COLORS.text,
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BLACKLIST_COLORS.text,
    marginHorizontal: 12,
  },
});

export default UsageDateRangeRow;
