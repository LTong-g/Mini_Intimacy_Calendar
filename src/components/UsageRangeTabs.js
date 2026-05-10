import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BLACKLIST_COLORS } from '../utils/usageTheme';

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
    borderColor: BLACKLIST_COLORS.secondaryBorder,
    borderLeftWidth: 0,
    backgroundColor: BLACKLIST_COLORS.surface,
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
    backgroundColor: BLACKLIST_COLORS.selectedBackground,
  },
  rangeText: {
    fontSize: 13,
    color: BLACKLIST_COLORS.textMuted,
  },
  rangeTextActive: {
    fontWeight: '700',
    color: BLACKLIST_COLORS.secondary,
  },
});

export default UsageRangeTabs;
