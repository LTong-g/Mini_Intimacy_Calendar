/**
 * 极简武器强化日历 - 关于界面
 */

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { showAppAlert } from '../../../shared/utils/appAlert';
import { checkForAppUpdate } from '../../../shared/utils/updateChecker';
import {
  deleteDownloadedUpdatePackage,
  downloadUpdatePackage,
  getDownloadedUpdatePackage,
  installUpdatePackage,
} from '../../../shared/utils/updatePackageNative';
import pkg from '../../../../package.json';

const appIcon = require('../../../../assets/icon.png');
const GITHUB_URL = 'https://github.com/LTong-g/Mini_Intimacy_Calendar';

const AboutScreen = () => {
  const navigation = useNavigation();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadedUpdate, setDownloadedUpdate] = useState(null);

  const refreshDownloadedUpdate = useCallback(async () => {
    try {
      const update = await getDownloadedUpdatePackage();
      setDownloadedUpdate(update);
      return update;
    } catch {
      setDownloadedUpdate(null);
      return null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDownloadedUpdate();
    }, [refreshDownloadedUpdate])
  );

  const handleOpenGitHub = async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch (error) {
      showAppAlert('打开失败', error.message || '无法打开 GitHub 项目主页');
    }
  };

  const handleOpenDownload = async (downloadUrl) => {
    try {
      await Linking.openURL(downloadUrl);
    } catch (error) {
      showAppAlert('打开失败', error.message || '无法打开安装包下载链接');
    }
  };

  const handleInstallUpdate = async (update) => {
    if (!update?.fileName) return;
    try {
      const result = await installUpdatePackage(update.fileName);
      if (result?.permissionRequired) {
        showAppAlert(
          '允许安装更新',
          '请在系统设置中允许本应用安装未知应用，返回后再次点击已下载新版本继续安装。'
        );
      }
    } catch (error) {
      showAppAlert('安装失败', error.message || '无法打开系统安装器');
    }
  };

  const handleDeleteDownloadedUpdate = async (update) => {
    if (!update?.fileName) return;
    try {
      const deleted = await deleteDownloadedUpdatePackage(update.fileName);
      setDownloadedUpdate(null);
      if (!deleted) {
        showAppAlert('删除失败', '未能删除已下载的安装包，请稍后重试。');
        return;
      }
      showAppAlert('已删除安装包', '已删除下载的新版本安装包，可重新检查更新。');
    } catch (error) {
      showAppAlert('删除失败', error.message || '无法删除已下载的安装包');
    }
  };

  const showDownloadedUpdateAlert = (update) => {
    if (!update) return;
    showAppAlert(
      '已下载新版本',
      `已下载版本：v${update.versionName}\n可立即安装，也可删除安装包后重新检查更新。`,
      [
        { text: '稍后', style: 'cancel' },
        { text: '删除安装包', style: 'destructive', onPress: () => handleDeleteDownloadedUpdate(update) },
        { text: '立即安装', onPress: () => handleInstallUpdate(update) },
      ]
    );
  };

  const handleDownloadUpdate = async (updateInfo) => {
    if (isDownloadingUpdate) return;

    if (!updateInfo.apkUrl) {
      showAppAlert('无法下载', '该版本未提供 Android 安装包附件。', [
        { text: '稍后', style: 'cancel' },
        { text: '打开发布页', onPress: () => handleOpenDownload(updateInfo.releaseUrl) },
      ]);
      return;
    }

    setIsDownloadingUpdate(true);
    try {
      const update = await downloadUpdatePackage({
        downloadUrl: updateInfo.apkUrl,
        fileName: updateInfo.apkName,
        expectedVersion: updateInfo.latestVersion,
      });
      setDownloadedUpdate(update);
      showDownloadedUpdateAlert(update);
    } catch (error) {
      showAppAlert('下载失败', error.message || '无法下载更新安装包');
    } finally {
      setIsDownloadingUpdate(false);
    }
  };

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate || isDownloadingUpdate) return;

    const existingUpdate = downloadedUpdate || await refreshDownloadedUpdate();
    if (existingUpdate) {
      showDownloadedUpdateAlert(existingUpdate);
      return;
    }

    setIsCheckingUpdate(true);
    try {
      const result = await checkForAppUpdate();
      if (result.hasUpdate) {
        const notes = result.releaseNotes.trim();
        const messageParts = [
          `当前版本：v${result.currentVersion}`,
          `最新版本：v${result.latestVersion}`,
        ];
        if (notes) {
          messageParts.push('', notes);
        }
        if (result.apkName) {
          messageParts.push('', `安装包：${result.apkName}`);
        }

        showAppAlert('发现新版本', messageParts.join('\n'), [
          { text: '稍后', style: 'cancel' },
          { text: '立即下载', onPress: () => handleDownloadUpdate(result) },
        ]);
        return;
      }

      showAppAlert(
        '已是最新版本',
        `当前版本：v${result.currentVersion}\n最新版本：v${result.latestVersion}`
      );
    } catch (error) {
      showAppAlert('检查失败', error.message || '无法获取最新版本信息');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>关于</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.appInfo}>
          <Image source={appIcon} style={styles.appIcon} />
          <Text style={styles.versionText}>版本：v{pkg.version}</Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.fullWidthButton, styles.firstButton]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SoftwareIntro')}
          >
            <Ionicons name="document-text-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>软件介绍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fullWidthButton, styles.middleButton]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('UsageHelp')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>使用帮助</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fullWidthButton, styles.middleButton]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>隐私政策</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fullWidthButton, styles.middleButton]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VersionHistory')}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>版本记录</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fullWidthButton, styles.lastButton, (isCheckingUpdate || isDownloadingUpdate) && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={isCheckingUpdate || isDownloadingUpdate}
            onPress={handleCheckUpdate}
          >
            {isCheckingUpdate || isDownloadingUpdate ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
            )}
            <Text style={styles.buttonText}>
              {isDownloadingUpdate
                ? '正在下载'
                : isCheckingUpdate
                  ? '正在检查'
                  : downloadedUpdate
                    ? '已下载新版本'
                    : '检查更新'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.githubButton}
          activeOpacity={0.8}
          onPress={handleOpenGitHub}
        >
          <Ionicons name="logo-github" size={20} color="#007AFF" />
          <Text style={styles.buttonText}>GitHub</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 36,
  },
  appIcon: {
    width: 144,
    height: 144,
    borderRadius: 30,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 16,
    color: '#333',
  },
  buttonGroup: {
    width: '100%',
  },
  githubButton: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 'auto',
    marginBottom: 24,
  },
  fullWidthButton: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  firstButton: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  middleButton: {
    marginTop: -1,
  },
  lastButton: {
    marginTop: -1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#f7f9fc',
  },
});

export default AboutScreen;
