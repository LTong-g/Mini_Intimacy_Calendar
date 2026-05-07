import React from 'react';
import {
  TextInput,
  StyleSheet,
} from 'react-native';
import BaseModal from './modals/BaseModal';
import ModalActionRow from './modals/ModalActionRow';

const CountAdjustModal = ({
  visible,
  title = '编辑次数',
  value,
  onChangeValue,
  onConfirm,
  onCancel,
}) => {
  return (
    <BaseModal
      visible={visible}
      onRequestClose={onCancel}
      title={title}
      panelStyle={styles.card}
      titleStyle={styles.title}
    >
      <TextInput
        value={value}
        onChangeText={onChangeValue}
        keyboardType="number-pad"
        autoFocus
        style={styles.input}
        selectionColor="#007AFF"
      />
      <ModalActionRow
        style={styles.actions}
        buttonStyle={styles.actionButton}
        textStyle={styles.actionText}
        actions={[
          { label: '取消', variant: 'secondary', onPress: onCancel, flex: true },
          { label: '确认', onPress: onConfirm, flex: true },
        ]}
      />
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    color: '#111',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    marginTop: 18,
  },
  actionButton: {
    borderRadius: 10,
    minHeight: 44,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CountAdjustModal;
