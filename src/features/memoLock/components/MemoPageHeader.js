import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MemoPageHeader = ({
  title,
  leftIconName = 'close',
  onLeftPress,
  rightText,
  onRightPress,
  rightDisabled = false,
}) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onLeftPress} style={styles.sideButton}>
      <Ionicons name={leftIconName} size={24} color="#007AFF" />
    </TouchableOpacity>
    <Text style={styles.title}>{title}</Text>
    {rightText ? (
      <TouchableOpacity disabled={rightDisabled} onPress={onRightPress} style={styles.sideButton}>
        <Text style={[styles.rightText, rightDisabled && styles.rightTextDisabled]}>{rightText}</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.sidePlaceholder} />
    )}
  </View>
);

const styles = StyleSheet.create({
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sideButton: {
    minWidth: 52,
  },
  sidePlaceholder: {
    width: 52,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  rightText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  rightTextDisabled: {
    opacity: 0.45,
  },
});

export default MemoPageHeader;
