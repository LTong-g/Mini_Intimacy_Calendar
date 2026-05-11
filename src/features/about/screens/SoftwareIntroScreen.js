/**
 * 极简武器强化日历 - 软件介绍界面
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const IntroListItem = ({ children }) => (
  <View style={styles.listItem}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.listItemText}>{children}</Text>
  </View>
);

const SoftwareIntroScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>软件介绍</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.paragraph}>
          极简武器强化日历是一款基于日期的记录工具，用来记录和回顾三类需要自律管理的行为。你可以按天记录次数，在日历中查看分布，并通过统计图表观察变化。
        </Text>

        <Text style={styles.sectionTitle}>记录类型</Text>
        <View style={styles.list}>
          <IntroListItem>观看教程</IntroListItem>
          <IntroListItem>武器强化</IntroListItem>
          <IntroListItem>双人练习</IntroListItem>
        </View>

        <Text style={styles.sectionTitle}>主要功能</Text>
        <View style={styles.list}>
          <IntroListItem>日历记录：通过日视图、月视图和年视图查看每天、每月和全年的记录分布。</IntroListItem>
          <IntroListItem>黑名单：授予必要权限后，可以将应用设置为黑名单，查看黑名单应用的使用时长、趋势图和热力图。黑名单应用的使用记录会按规则折算为观看教程自动记录次数。</IntroListItem>
          <IntroListItem>安全锁：可主动开启极简备忘录入口，开启后桌面名称、图标和启动页会切换为极简备忘录，启动时先进入极简备忘录，再通过你设置的密码进入记录应用。</IntroListItem>
          <IntroListItem>统计分析：查看总览、年度和自定义区间统计，并通过图表观察趋势。</IntroListItem>
          <IntroListItem>数据备份：支持导入、导出和分享本地数据，便于迁移和留存。</IntroListItem>
          <IntroListItem>关于与更新：可查看版本记录、打开项目主页，并检查、下载、安装或删除已下载的新版本安装包。</IntroListItem>
        </View>

        <Text style={styles.sectionTitle}>使用特点</Text>
        <View style={styles.list}>
          <IntroListItem>记录围绕日期展开，适合做长期回顾。</IntroListItem>
          <IntroListItem>未来日期不可记录，避免提前填写。</IntroListItem>
          <IntroListItem>统计结果按实际记录次数展示。</IntroListItem>
          <IntroListItem>数据保存在本机，由你通过设置页自行导入、导出或分享。</IntroListItem>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  list: {
    marginBottom: 24,
    marginLeft: 15,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 14,
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
});

export default SoftwareIntroScreen;
