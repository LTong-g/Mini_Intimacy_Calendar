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
      '基础记录功能会保存用户主动输入的日期记录数据，包括日期、记录类型和对应次数。',
      '当用户主动开启使用记录辅助功能并授予系统使用情况访问权限后，应用会读取设备上的应用使用记录，用于后续黑名单应用记录与统计能力。',
      '使用记录辅助功能可能读取应用包名、应用使用时长、最近使用时间和近期前后台切换事件；应用不会读取其他应用的屏幕内容、聊天内容、输入文字、私有文件或账号信息。',
      '黑名单功能会保存曾加入黑名单的应用包名、应用名称、图标、主色、当前安装状态、黑名单生效时间段，以及读取和合并后的黑名单应用使用开始时间、结束时间和使用时长；这些使用记录会用于动态计算观看教程记录次数下限。',
      '进入黑名单主页时，应用会在已获得使用情况访问权限且存在黑名单生效时间段的前提下，静默读取最近三天内处于黑名单状态的应用使用记录并保存到本地。',
      '当应用发生未捕获异常、未处理的 Promise 错误、原生崩溃或主线程长时间无响应时，应用会在本机问题日志文件夹中保存诊断日志，用于定位异常。',
      '本应用不要求注册账号，不收集姓名、手机号、邮箱、身份证号等身份信息。',
      '本应用不记录精确位置、通讯录、相册、麦克风、摄像头等设备隐私信息。',
    ],
  },
  {
    title: '本地存储',
    items: [
      '打卡数据、黑名单数据和用户配置数据保存在当前设备的本地存储中，用于日历展示、统计分析和数据管理。',
      '问题日志仅在异常发生时保存在当前设备本地，正常运行时不会持续记录日志。',
      '使用记录辅助功能的开关状态、权限状态和刷新计划仅在当前设备上处理。',
      '黑名单使用记录仅保存在当前设备本地，并会在日历展示和统计时动态形成观看教程记录次数下限。',
      '卸载应用或清除应用数据可能导致本地记录被删除。',
      '本应用不提供云同步服务，也不会主动把记录上传到服务器。',
    ],
  },
  {
    title: '导入、导出与分享',
    items: [
      '导出和分享会生成包含打卡、黑名单和设置数据的 JSON 备份文件，文件内容由用户自行保存、转移或发送。',
      '导入只读取用户选择的 JSON 文件，并在校验通过后写入本地记录；旧版打卡备份只会导入打卡记录并保留现有黑名单数据。',
      '通过系统分享、文件管理器或其他应用转移数据时，对方应用的隐私规则由对应应用负责。',
    ],
  },
  {
    title: '权限与联网',
    items: [
      '应用基础记录功能不需要账号登录或联网同步。',
      '选择导入、导出或分享时，系统可能展示文件选择、目录选择或分享面板。',
      '使用记录辅助功能需要用户在系统设置中手动授予使用情况访问权限；Android 不允许应用自行静默授予或撤销该权限。',
      '为了提高每天晚间刷新使用记录的可靠性，应用可能引导用户允许忽略电池优化、允许精确定时或检查应用详情中的相关限制。',
      '关闭系统使用情况访问权限会停止应用内刷新计划，但不会自动删除已经保存的应用使用记录。',
      '删除已保存的应用使用记录需要在使用记录辅助开关关闭后，通过设置页中的删除应用使用记录按钮手动执行。',
      '系统使用情况访问权限需要用户到系统设置中手动授予或撤销。',
      '问题日志文件夹入口只会在本机已经存在问题日志时显示，用户可从设置页打开日志文件夹查看文件。',
    ],
  },
  {
    title: '用户控制',
    items: [
      '用户可以在应用内修改记录，或通过系统设置清除应用数据。',
      '用户可以通过系统文件管理器查看或删除本机问题日志文件。',
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
