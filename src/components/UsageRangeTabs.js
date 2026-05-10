import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UsageRangeTabs = ({
  options,
  selectedKey,
  onSelect,
  getLabel = (option) => option.label,
}) => (
  <View style={styles.rangeGroup}>
    {options.map((option, index) => {
      const active = option.key === selectedKey;
      return (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.rangeButton,
            active && styles.rangeButtonActive,
            index === 0 && styles.rangeButtonFirst,
            index === options.length - 1 && styles.rangeButtonLast,
          ]}
          onPress={() => onSelect(option, index)}
        >
          <Text
            style={[
              styles.rangeText,
              active && styles.rangeTextActive,
            ]}
          >
            {getLabel(option, index)}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  rangeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeButton: {
    minHeight: 28,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F4D79A',
    borderLeftWidth: 0,
    backgroundColor: '#fff',
  },
  rangeButtonFirst: {
    borderLeftWidth: 1,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rangeButtonLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  rangeButtonActive: {
    backgroundColor: '#FFF8E1',
  },
  rangeText: {
    fontSize: 13,
    color: '#A66A00',
  },
  rangeTextActive: {
    fontWeight: '700',
    color: '#8A4B00',
  },
});

export default UsageRangeTabs;
