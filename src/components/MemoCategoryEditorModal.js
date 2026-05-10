import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import BaseModal from './modals/BaseModal';
import ModalActionRow from './modals/ModalActionRow';
import MemoColorPicker from './MemoColorPicker';

const DEFAULT_CATEGORY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#8E8E93'];

const MemoCategoryEditorModal = ({
  visible,
  name,
  color,
  onNameChange,
  onColorChange,
  onCancel,
  onSave,
}) => (
  <BaseModal
    visible={visible}
    title="新建分类"
    onRequestClose={onCancel}
  >
    <TextInput
      value={name}
      onChangeText={onNameChange}
      style={styles.input}
      placeholder="分类名称"
    />
    <View style={styles.colorRow}>
      {DEFAULT_CATEGORY_COLORS.map((item) => (
        <TouchableOpacity
          key={item}
          style={[styles.colorButton, { backgroundColor: item }, color === item && styles.colorButtonSelected]}
          onPress={() => onColorChange(item)}
        />
      ))}
    </View>
    <MemoColorPicker value={color} onChange={onColorChange} />
    <ModalActionRow
      actions={[
        { label: '取消', variant: 'secondary', onPress: onCancel },
        { label: '保存', onPress: onSave },
      ]}
    />
  </BaseModal>
);

const styles = StyleSheet.create({
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 10,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#222',
  },
});

export default MemoCategoryEditorModal;
