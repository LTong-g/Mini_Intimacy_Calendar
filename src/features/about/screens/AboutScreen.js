/**
 * 极简武器强化日历 - 关于界面
 */

import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { showAppAlert } from '../../../shared/utils/appAlert';
import { checkForAppUpdate } from '../../../shared/utils/updateChecker';
import pkg from '../../../../package.json';

const appIcon = require('../../../../assets/icon.png');
const GITHUB_URL = 'https://github.com/LTong-g/Mini_Intimacy_Calendar';

const AboutScreen = () => {
  const navigation = useNavigation();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleOpenGitHub = async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch (error) {
      showAppAlert('打开失败', error.message || '无法打开 GitHub 项目主页');
    }
  };

  const handleOpenRelease = async (releaseUrl) => {
    try {
      await Linking.openURL(releaseUrl);
    } catch (error) {
      showAppAlert('打开失败', error.message || '无法打开版本下载页面');
    }
  };

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;

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
          { text: '前往下载', onPress: () => handleOpenRelease(result.releaseUrl) },
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
            style={[styles.fullWidthButton, styles.lastButton, isCheckingUpdate && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={isCheckingUpdate}
            onPress={handleCheckUpdate}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
            )}
            <Text style={styles.buttonText}>
              {isCheckingUpdate ? '正在检查' : '检查更新'}
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
