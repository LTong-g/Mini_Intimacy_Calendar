import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BLACKLIST_COLORS } from '../utils/usageTheme';

const BlacklistPageHeader = ({
  title,
  onBack,
  right,
}) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={BLACKLIST_COLORS.primary} />
    </TouchableOpacity>
    <Text style={styles.title} numberOfLines={1}>{title}</Text>
    {right ? (
      <View style={styles.rightSlot}>{right}</View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BLACKLIST_COLORS.secondaryBorder,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: BLACKLIST_COLORS.text,
  },
  rightSlot: {
    marginLeft: 12,
  },
});

export default BlacklistPageHeader;
