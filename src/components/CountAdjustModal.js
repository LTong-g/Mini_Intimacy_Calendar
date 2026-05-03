import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const CountAdjustModal = ({
  visible,
  title = '编辑次数',
  value,
  onChangeValue,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={onChangeValue}
            keyboardType="number-pad"
            autoFocus
            style={styles.input}
            selectionColor="#007AFF"
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmText}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
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
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#444',
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default CountAdjustModal;
