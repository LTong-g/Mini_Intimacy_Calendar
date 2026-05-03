/**
 * 极简武器强化日历 - 设置界面
 * 功能：展示设置项（如导入/导出），顶部带返回按钮
 * 支持导入导出打卡数据为JSON文件
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportCheckInData, importCheckInData } from '../utils/checkInStorage';

const EXPORT_FILE_BASENAME = 'EnhancementRecords';
const EXPORT_MIME_TYPE = 'application/json';

const buildExportFileName = () => {
  const ts = new Date().toISOString().replace(/[.:]/g, '-');
  return `${EXPORT_FILE_BASENAME}_${ts}.json`;
};

const saveExportToAndroidSharedStorage = async (content) => {
  const { StorageAccessFramework } = FileSystem;
  if (!StorageAccessFramework) return { saved: false, reason: 'unavailable' };

  const downloadRootUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadRootUri);

  if (!permission.granted || !permission.directoryUri) {
    return { saved: false, reason: 'canceled' };
  }

  const targetUri = await StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    buildExportFileName(),
    EXPORT_MIME_TYPE
  );

  await FileSystem.writeAsStringAsync(targetUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { saved: true, reason: 'saved' };
};

const createTempExportFileForSharing = async (content) => {
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('无法获取导出目录');
  }

  const uri = baseDir + buildExportFileName();
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return uri;
};

const SettingsScreen = () => {
  const navigation = useNavigation();

  const buildExportContent = async () => {
    const data = await exportCheckInData();
    if (Object.keys(data).length === 0) {
      return null;
    }
    return JSON.stringify(data, null, 2);
  };

  // 导出打卡记录为 JSON
  const handleExport = async () => {
    try {
      const content = await buildExportContent();
      if (!content) {
        Alert.alert('导出失败', '没有可导出的数据');
        return;
      }

      if (Platform.OS === 'android') {
        const saveResult = await saveExportToAndroidSharedStorage(content);
        if (saveResult.saved) {
          Alert.alert('导出成功', '文件已保存到你选择的目录');
          return;
        }
        if (saveResult.reason === 'canceled') {
          return;
        }
      }

      const shareUri = await createTempExportFileForSharing(content);
      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        Alert.alert('导出失败', '当前设备不支持系统分享');
        return;
      }

      await Sharing.shareAsync(shareUri, {
        dialogTitle: '导出记录文件',
        mimeType: EXPORT_MIME_TYPE,
      });
    } catch (error) {
      Alert.alert('导出失败', '发生错误：' + error.message);
    }
  };

  // 分享导出的 JSON 文件
  const handleShare = async () => {
    try {
      const content = await buildExportContent();
      if (!content) {
        Alert.alert('分享失败', '没有可分享的数据');
        return;
      }

      const shareUri = await createTempExportFileForSharing(content);
      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        Alert.alert('分享失败', '当前设备不支持系统分享');
        return;
      }

      await Sharing.shareAsync(shareUri, {
        dialogTitle: '分享记录文件',
        mimeType: EXPORT_MIME_TYPE,
      });
    } catch (error) {
      Alert.alert('分享失败', '发生错误：' + error.message);
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

  const handleOpenAbout = () => {
    navigation.navigate('About');
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

      {/* 导入/导出/分享功能 */}
      <View style={styles.section}>
        <View style={styles.row}>
          <TouchableOpacity style={styles.option} onPress={handleImport}>
            <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
            <Text style={styles.optionText}>导入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.option, styles.optionMiddle]} onPress={handleExport}>
            <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
            <Text style={styles.optionText}>导出</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#007AFF" />
            <Text style={styles.optionText}>分享</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.fullWidthOption} onPress={handleOpenAbout}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.optionText}>关于</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  optionMiddle: {
    marginHorizontal: 8,
  },
  fullWidthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
  },
  optionText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default SettingsScreen;
