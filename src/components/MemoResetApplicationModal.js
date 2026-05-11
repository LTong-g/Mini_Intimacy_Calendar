import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import BaseModal from './modals/BaseModal';
import ModalActionRow from './modals/ModalActionRow';

const MemoResetApplicationModal = ({
  visible,
  confirmText,
  value,
  onChangeText,
  onCancel,
  onConfirm,
}) => (
  <BaseModal
    visible={visible}
    title="重置应用"
    onRequestClose={onCancel}
  >
    <Text style={styles.modalText}>
      重置会清空本应用保存在本机的数据、问题日志和缓存，并恢复初始入口。此操作无法撤销。
    </Text>
    <Text style={styles.modalText}>请输入以下内容确认：</Text>
    <Text style={styles.confirmPhrase}>{confirmText}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      style={styles.input}
      placeholder="输入确认内容"
    />
    <ModalActionRow
      actions={[
        { label: '取消', variant: 'secondary', onPress: onCancel },
        { label: '确认', variant: 'danger', onPress: onConfirm },
      ]}
    />
  </BaseModal>
);

const styles = StyleSheet.create({
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
    marginBottom: 8,
  },
  confirmPhrase: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
  },
});

export default MemoResetApplicationModal;
