/**
 * 极简武器强化日历 - 隐私政策界面
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const sections = [
  {
    title: '数据记录范围',
    items: [
      '本应用只记录用户主动输入的日期记录数据，包括日期、记录类型和对应次数。',
      '本应用不要求注册账号，不收集姓名、手机号、邮箱、身份证号等身份信息。',
      '本应用不记录精确位置、通讯录、相册、麦克风、摄像头等设备隐私信息。',
    ],
  },
  {
    title: '本地存储',
    items: [
      '记录数据保存在当前设备的本地存储中，用于日历展示、统计分析和数据管理。',
      '卸载应用或清除应用数据可能导致本地记录被删除。',
      '本应用不提供云同步服务，也不会主动把记录上传到服务器。',
    ],
  },
  {
    title: '导入、导出与分享',
    items: [
      '导出和分享会生成包含记录数据的 JSON 文件，文件内容由用户自行保存、转移或发送。',
      '导入只读取用户选择的 JSON 文件，并在校验通过后写入本地记录。',
      '通过系统分享、文件管理器或其他应用转移数据时，对方应用的隐私规则由对应应用负责。',
    ],
  },
  {
    title: '权限与联网',
    items: [
      '应用基础记录功能不需要账号登录或联网同步。',
      '选择导入、导出或分享时，系统可能展示文件选择、目录选择或分享面板。',
      '如运行环境或系统组件产生崩溃日志、安装日志等信息，该类信息不属于本应用主动收集的记录数据。',
    ],
  },
  {
    title: '用户控制',
    items: [
      '用户可以在应用内修改记录，或通过系统设置清除应用数据。',
      '导出的 JSON 文件由用户自行保管；如文件包含敏感记录，应避免发送给不可信对象。',
      '本页面用于解释当前应用的隐私信息处理方式，不构成对第三方应用或系统服务的隐私承诺。',
    ],
  },
];

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>隐私政策</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.paragraph}>
          极简武器强化日历以本地记录为核心，以下内容说明应用如何处理与隐私相关的信息。
        </Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.list}>
              {section.items.map((item) => (
                <Text key={item} style={styles.listItem}>
                  - {item}
                </Text>
              ))}
            </View>
          </View>
        ))}
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  list: {
    gap: 6,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
});

export default PrivacyPolicyScreen;
