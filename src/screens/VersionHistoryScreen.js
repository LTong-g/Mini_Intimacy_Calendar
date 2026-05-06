/**
 * 极简武器强化日历 - 版本记录界面
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const versionHistory = [
  {
    version: 'Unreleased',
    title: '使用记录辅助与黑名单功能',
    date: '2026-05-05',
    featureIntro: {
      label: '使用记录辅助与黑名单功能：',
      notes: [
        '在 Android 上提供使用记录辅助开关，并引导检查使用情况访问、忽略电池优化和精确定时权限；开启后可安排晚间刷新，读取并保存最近三天的黑名单应用使用时间段。',
        '可从主界面右下角更多菜单进入黑名单功能，在独立页面选择需要关注的应用；应用列表支持搜索、全部/已选切换、右下角刷新、首字母快速跳转和实时保存选择。',
        '黑名单主页支持下拉读取最近三天记录，也可选择起止日期读取指定范围；读取完成后会显示请求范围、实际读取到的记录范围和聚合后的使用时间段数量。',
        '黑名单统计可按当日、当周、当月查看使用时长图表；使用时间段页面可按全部记录或单个应用查看详情，记录按日期分组并显示当日合计时长，全部记录详情中的每条记录会显示对应应用图标。',
        '同一应用间隔不超过 2 分钟的碎片使用时间段会合并显示；关闭使用记录辅助后，可在设置页手动删除已保存的应用使用记录。',
      ],
    },
    sections: [
      {
        label: '新增：',
        notes: [
          '新增年度统计顶部年份文字滚轮快速切换年份。',
          '新增点击日视图、月视图、年视图和日期选择页顶部日期文字后，通过滚轮快速切换日期、月份或年份；日期选择页最终日期仍通过点击具体日期选定。',
          '新增关于页 GitHub 入口，可打开项目主页。',
        ],
      },
      {
        label: '修复：',
        notes: [
          '修复年度统计表格会显示当前年份未来月份的问题。',
          '修复日期选择页从年份进入月份后返回会直接退出页面的问题。',
        ],
      },
      {
        label: '优化：',
        notes: [
          '优化统计页布局，总览、年度和自定义区间统计均先显示图表，再显示表格。',
          '优化日期选择页从年份进入月份和从月份返回年份的进入/退出切换动画。',
          '优化底部栏视图切换方式，左侧日历按钮改为日视图、月视图、年视图轮回切换，并移除月视图和年视图中间按钮返回日视图的功能。',
          '优化关于入口，将其从设置页移至主界面右下角更多菜单最下方。',
          '优化设置页数据管理区，将导入、导出和分享按钮整合到数据管理框中。',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    title: '日历、统计与帮助信息更新',
    date: '2026-05-05',
    sections: [
      {
        label: '新增：',
        notes: [
          '新增日视图右下角回到今日按钮。',
          '新增设置页“关于”中的“使用帮助”入口和页面。',
          '新增设置页“关于”中的“隐私政策”入口和页面。',
        ],
      },
      {
        label: '修复：',
        notes: [
          '修复日视图首次从今天左滑到昨天时顶部右箭头误判为不可用的问题。',
          '修复月视图切换月份后回到今日按钮错误隐藏的问题。',
          '修复年度统计图横轴月份显示从 0 开始的问题。',
          '修复自定义统计跨年但不足一年时月份行缺少年份并按月份数字错序显示的问题。',
        ],
      },
      {
        label: '优化：',
        notes: [
          '优化月视图日期点击行为，非未来灰色日期可切换到相邻月份。',
          '优化月视图日期点击行为，再次点击已选中的非未来日期可进入日视图。',
          '优化统计图横轴和触摸查看效果，减少日期与数值标签重叠。',
          '优化自定义统计表月份和年月行标题的对齐效果。',
          '优化关于页入口按钮排列，使按钮组显示更紧凑。',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    title: '关于页面与多次记录更新',
    date: '2026-05-03',
    sections: [
      {
        label: '新增：',
        notes: [
          '新增支持同一天同一类型记录多次，并在日视图中显示次数。',
          '新增设置页“关于”入口、关于页、软件介绍页和版本记录页。',
        ],
      },
      {
        label: '优化：',
        notes: [
          '优化 Android 导出保存与分享流程。',
        ],
      },
    ],
  },
  {
    version: '1.1.1',
    title: '月视图修复',
    date: '2025-11-03',
    sections: [
      {
        label: '修复：',
        notes: [
          '修复月视图日期与星期不匹配的问题。',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    title: '统计与界面更新',
    date: '2025-07-30',
    sections: [
      {
        label: '新增：',
        notes: [
          '新增统计功能，包含总览、年度、自定义区间统计和折线图。',
          '更新中文应用名、应用图标和自适应图标。',
        ],
      },
      {
        label: '优化：',
        notes: [
          '优化日历视图、顶部栏、底部菜单和年份视图快速回到今天的交互。',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    title: '初始版本',
    date: '2025-07-28',
    sections: [
      {
        label: '',
        notes: [
          '极简武器强化日历是一款基于日期的记录工具，用于帮助回顾三类需要自律管理的行为频率。',
          '提供日历主流程，可在日视图中查看当天记录状态，在月视图中浏览整月记录分布，在年视图中查看全年记录概况。',
          '支持按日期保存记录，让每一天的行为状态可以被持续追踪。',
          '提供简洁的移动端界面，包含应用图标、启动图和基础导航结构。',
        ],
      },
    ],
  },
];

const VersionHistoryScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>版本记录</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {versionHistory.map((item, index) => (
          <View key={item.version} style={styles.timelineItem}>
            <View style={styles.timelineRail}>
              {index > 0 && <View style={[styles.timelineLine, styles.timelineLineTop]} />}
              <View style={[styles.timelineDot, index === 0 && styles.timelineDotCurrent]} />
              {index < versionHistory.length - 1 && (
                <View style={[styles.timelineLine, styles.timelineLineBottom]} />
              )}
            </View>

            <View style={styles.versionBlock}>
              <Text style={styles.versionTitle}>
                {item.version === 'Unreleased' ? item.version : `v${item.version}`}
              </Text>
              <Text style={styles.versionSubtitle}>{item.title}</Text>
              <Text style={styles.versionDate}>{item.date}</Text>
              {Boolean(item.featureIntro) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{item.featureIntro.label}</Text>
                  <View style={styles.list}>
                    {item.featureIntro.notes.map((note) => (
                      <Text key={note} style={styles.listItem}>- {note}</Text>
                    ))}
                  </View>
                </View>
              )}
              {item.sections.map((section) => (
                <View key={section.label || item.version} style={styles.section}>
                  {Boolean(section.label) && (
                    <Text style={styles.sectionTitle}>{section.label}</Text>
                  )}
                  <View style={styles.list}>
                    {section.notes.map((note) => (
                      <Text key={note} style={styles.listItem}>- {note}</Text>
                    ))}
                  </View>
                </View>
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
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineRail: {
    width: 28,
    alignItems: 'center',
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#d8e8ff',
  },
  timelineLineTop: {
    top: 0,
    bottom: 21,
  },
  timelineLineBottom: {
    top: 13,
    bottom: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 7,
    backgroundColor: '#007AFF',
    zIndex: 1,
  },
  timelineDotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 3,
    borderColor: '#d8e8ff',
  },
  versionBlock: {
    flex: 1,
    marginBottom: 28,
  },
  versionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  versionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  list: {
    marginTop: 0,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    marginBottom: 6,
  },
});

export default VersionHistoryScreen;
