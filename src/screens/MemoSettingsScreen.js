import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MemoPageHeader from '../components/MemoPageHeader';
import MemoResetApplicationModal from '../components/MemoResetApplicationModal';
import { useMemoShell } from './MemoShellContext';

const MemoSettingsScreen = () => {
  const navigation = useNavigation();
  const {
    handleImportMemos,
    handleExportMemos,
    handleShareMemos,
    resetVisible,
    setResetVisible,
    resetText,
    setResetText,
    resetConfirmText,
    handleResetApplication,
  } = useMemoShell();

  return (
    <View style={styles.container}>
      <MemoPageHeader
        title="设置"
        leftIconName="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.settingCard}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <View style={styles.optionRow}>
            <TouchableOpacity style={styles.option} onPress={handleImportMemos}>
              <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>导入</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.option, styles.optionMiddle]} onPress={handleExportMemos}>
              <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>导出</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleShareMemos}>
              <Ionicons name="share-social-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>分享</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setResetText('');
            setResetVisible(true);
          }}
        >
          <Ionicons name="warning-outline" size={18} color="#C62828" />
          <Text style={styles.resetButtonText}>重置应用</Text>
        </TouchableOpacity>
      </ScrollView>
      <MemoResetApplicationModal
        visible={resetVisible}
        confirmText={resetConfirmText}
        value={resetText}
        onChangeText={setResetText}
        onCancel={() => setResetVisible(false)}
        onConfirm={handleResetApplication}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  settingCard: {
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  optionMiddle: {
    marginHorizontal: 8,
  },
  optionText: {
    marginLeft: 6,
    color: '#007AFF',
    fontSize: 14,
  },
  resetButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  resetButtonText: {
    marginLeft: 6,
    color: '#C62828',
    fontSize: 14,
  },
});

export default MemoSettingsScreen;
