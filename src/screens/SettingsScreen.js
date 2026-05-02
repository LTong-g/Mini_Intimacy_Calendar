/**
 * 极简武器强化日历 - 设置界面
 * 功能：展示设置项（如导入/导出），顶部带返回按钮
 * 支持导入导出打卡数据为JSON文件
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportCheckInData, importCheckInData } from '../utils/checkInStorage';

const SettingsScreen = () => {
  const navigation = useNavigation();

  // 导出打卡记录为 JSON
  const handleExport = async () => {
    try {
      const data = await exportCheckInData();
      if (Object.keys(data).length === 0) {
        Alert.alert('导出失败', '没有可导出的数据');
        return;
      }

      const uri = FileSystem.documentDirectory + 'EnhancementRecords.json';
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(data), { encoding: FileSystem.EncodingType.UTF8 });

      await Sharing.shareAsync(uri, {
        dialogTitle: '导出记录文件',
      });
    } catch (error) {
      Alert.alert('导出失败', '发生错误：' + error.message);
    }
  };

  // 导入 JSON 文件并写入本地存储
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = JSON.parse(content);

      await importCheckInData(parsed);
      Alert.alert('导入成功', '记录已导入');
    } catch (error) {
      Alert.alert('导入失败', error.message || '无法解析文件内容');
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部返回栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      {/* 导入/导出功能 */}
      <View style={styles.section}>
        <View style={styles.row}>
          <TouchableOpacity style={styles.option} onPress={handleImport}>
            <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
            <Text style={styles.optionText}>导入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={handleExport}>
            <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
            <Text style={styles.optionText}>导出</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44, // 适配顶部安全区
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  optionText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default SettingsScreen;
