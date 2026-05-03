/**
 * 极简武器强化日历 - 软件介绍界面
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
          极简武器强化日历是一款基于日期的记录工具，用于记录三类需要自律管理的行为，并通过日历和统计视图帮助回顾频率变化。
        </Text>

        <Text style={styles.sectionTitle}>记录类型</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>- 观看教程：记录教程相关行为。</Text>
          <Text style={styles.listItem}>- 武器强化：记录武器强化相关行为。</Text>
          <Text style={styles.listItem}>- 双人练习：记录双人练习相关行为。</Text>
        </View>

        <Text style={styles.sectionTitle}>主要功能</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>- 日视图：查看当天记录、图标状态和间隔天数。</Text>
          <Text style={styles.listItem}>- 月视图：按月查看每天是否存在记录。</Text>
          <Text style={styles.listItem}>- 年视图：按全年维度查看记录分布。</Text>
          <Text style={styles.listItem}>- 统计分析：查看总览、年度和自定义区间统计。</Text>
          <Text style={styles.listItem}>- 数据管理：支持 JSON 数据导入、导出和分享。</Text>
        </View>

        <Text style={styles.sectionTitle}>记录规则</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>- 同一天同一类型可以记录多次。</Text>
          <Text style={styles.listItem}>- 未来日期不可编辑。</Text>
          <Text style={styles.listItem}>- 统计结果按实际次数累计。</Text>
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
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    marginBottom: 6,
  },
});

export default SoftwareIntroScreen;
