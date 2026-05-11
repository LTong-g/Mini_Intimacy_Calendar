import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BaseModal = ({
  visible,
  placement = 'center',
  title,
  children,
  onRequestClose,
  closeOnBackdropPress = true,
  animationType = 'fade',
  panelStyle,
  titleStyle,
}) => {
  const isBottom = placement === 'bottom';
  const handleBackdropPress = closeOnBackdropPress ? onRequestClose : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <View style={[styles.overlay, isBottom ? styles.bottomOverlay : styles.centerOverlay]}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
        <View style={[
          styles.panel,
          isBottom ? styles.bottomPanel : styles.centerPanel,
          panelStyle,
        ]}>
          {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  centerOverlay: {
    justifyContent: 'center',
    padding: 20,
  },
  bottomOverlay: {
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  centerPanel: {
    borderRadius: 8,
    padding: 16,
  },
  bottomPanel: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
  },
});

export default BaseModal;
