/**
 * 极简武器强化日历 - 使用帮助界面
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const sections = [
  {
    title: '日视图',
    items: [
      '左右滑动或点击顶部左右箭头可切换前后日期，不能切到未来日期。',
      '当天没有记录时会显示距离上次记录的间隔天数。',
      '当天有记录时会显示记录图标；同一类型次数大于 1 时，图标内部显示次数数字。',
      '长按已有记录图标会立即减一，并按秒继续减一。',
      '长按已有记录图标累计到阈值后会打开次数编辑弹窗；确认写入输入次数，取消保留已累计减少结果。',
      '长按减到 0 时会停止连续减少，并清理该类型记录。',
      '非今天时右下角会显示回到今日按钮，点击后回到今天的日视图。',
    ],
  },
  {
    title: '月视图',
    items: [
      '左右滑动或点击顶部左右箭头可切换月份，不能切到未来月份。',
      '第一次点击当月日期会选中日期，再次点击已选中的过去日期或今天会进入日视图。',
      '点击已选中的未来日期不会进入日视图。',
      '点击非未来的灰色日期会切到对应月份并选中对应日期。',
      '点击未来的灰色日期不会发生变化。',
      '日期底色表示当天存在的记录类型，不展示同一类型的次数强度。',
      '右下角回到今日按钮会回到今天所在月份并选中今天。',
    ],
  },
  {
    title: '年视图',
    items: [
      '左右滑动或点击顶部左右箭头可切换年份，不能切到未来年份。',
      '点击非未来月份可进入对应月份的月视图。',
      '未来月份会置灰，点击不会进入月视图。',
      '小圆点颜色表示当天存在的记录类型。',
      '非当前年份时右下角会显示回到今日按钮，点击后回到今天所在年份并选中今天。',
    ],
  },
  {
    title: '底部栏',
    items: [
      '左侧日历按钮用于切换视图：日视图进入月视图，月视图进入年视图，年视图回到月视图。',
      '日视图短按中间按钮会打开打卡面板。',
      '月视图短按中间按钮会打开打卡面板。',
      '月视图长按中间按钮会震动并回到今天的日视图。',
      '年视图短按中间按钮会回到今天的日视图。',
      '右侧更多按钮会打开菜单，可进入设置页或统计页。',
    ],
  },
  {
    title: '打卡面板',
    items: [
      '打卡面板包含观看教程、武器强化、双人练习三个类型按钮。',
      '短按某类型会将所选日期该类型次数加一，并关闭打卡面板。',
      '未来日期不能打卡；尝试打卡时会提示无法修改未来日期记录。',
      '日视图中长按某类型会立即加一，并按秒继续加一。',
      '日视图中长按累计到阈值后会打开次数编辑弹窗；确认写入输入次数，取消保留已累计增加结果。',
      '月视图中长按某类型会直接打开次数编辑弹窗。',
      '次数编辑弹窗只接受整数；空值按 0 处理。',
    ],
  },
  {
    title: '统计页',
    items: [
      '左上角返回按钮可回到上一页。',
      '顶部“总 / 年 / 自”可切换总览、年度和自定义区间统计。',
      '总览统计显示全部记录。',
      '年度统计可用年份左右箭头切换年份，不能切到未来年份。',
      '自定义区间需要分别点击开始日期和结束日期选择范围。',
      '开始日期不能晚于结束日期，结束日期不能早于开始日期。',
      '折线图支持触摸查看点位数据。',
    ],
  },
  {
    title: '日期选择',
    items: [
      '统计页选择自定义日期时，会先进入年份选择，再进入月份日期选择。',
      '点击年份视图中的月份可进入该月份。',
      '点击月视图日期会把该日期填入开始日期或结束日期，并返回统计页。',
    ],
  },
  {
    title: '设置页',
    items: [
      '左上角返回按钮可回到上一页。',
      '导入会选择 JSON 文件，校验格式后写入本地存储。',
      '导出会生成 JSON 记录文件；Android 会优先保存到选择的目录。',
      '分享会生成临时 JSON 文件并调用系统分享。',
      '关于按钮会进入关于页。',
    ],
  },
  {
    title: '关于页',
    items: [
      '左上角返回按钮可回到上一页。',
      '关于页显示应用图标和当前版本号。',
      '软件介绍按钮可查看应用定位、记录类型、主要功能和记录规则。',
      '使用帮助按钮可查看本页面。',
      '版本记录按钮可查看已发布版本和 Unreleased 记录。',
    ],
  },
];

const UsageHelpScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>使用帮助</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.paragraph}>
          这里整理了软件内各页面的常用操作方式，方便快速上手。
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

export default UsageHelpScreen;
