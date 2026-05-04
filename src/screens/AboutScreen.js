/**
 * 极简武器强化日历 - 关于界面
 */

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import pkg from '../../package.json';

const appIcon = require('../../assets/icon.png');

const AboutScreen = () => {
  const navigation = useNavigation();

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
            style={styles.fullWidthButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SoftwareIntro')}
          >
            <Ionicons name="document-text-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>软件介绍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullWidthButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('UsageHelp')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>使用帮助</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullWidthButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VersionHistory')}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>版本记录</Text>
          </TouchableOpacity>
        </View>
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
    gap: 12,
  },
  fullWidthButton: {
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
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 8,
  },
});

export default AboutScreen;
