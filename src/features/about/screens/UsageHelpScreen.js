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
      '左右滑动或点击顶部箭头切换日期；未来日期不可进入。',
      '点击顶部日期文字可以快速选择日期。',
      '没有记录时显示距离上次记录的间隔天数；有记录时显示对应图标。',
      '同一类型当天记录多次时，图标内显示次数。',
      '长按已有记录会连续减少次数，3次打开次数编辑弹窗。',
      '观看教程存在自动记录下限时，不能减到低于自动记录次数。',
      '右下角日期按钮可回到今天。',
    ],
  },
  {
    title: '月视图',
    items: [
      '左右滑动或点击顶部箭头切换月份；未来月份不可进入。',
      '点击顶部年月文字可以快速选择月份。',
      '点击日期会选中该日；再次点击已选中的非未来日期会进入日视图。',
      '点击相邻月份的非未来日期会切到对应月份并选中该日。',
      '日期底色表示当天有哪些记录类型，不显示具体次数。',
      '右下角日期按钮可回到今天所在月份并选中今天。',
    ],
  },
  {
    title: '年视图',
    items: [
      '左右滑动或点击顶部箭头切换年份；未来年份不可进入。',
      '点击顶部年份文字可以快速选择年份。',
      '点击非未来月份会进入对应月视图；未来月份置灰且不可进入。',
      '月份内的小圆点表示每天的记录类型。',
      '右下角日期按钮可回到今年并选中今天。',
    ],
  },
  {
    title: '记录与编辑',
    items: [
      '中间按钮在日视图和月视图中打开记录面板；年视图中不可用。',
      '记录面板包含观看教程、武器强化、双人练习三个类型。',
      '短按类型按钮会给当前选中日期加一，并关闭记录面板。',
      '日视图中长按类型按钮会连续增加次数，3次之后打开次数编辑弹窗。',
      '月视图中长按类型按钮会直接打开次数编辑弹窗。',
      '未来日期不能记录。',
      '观看教程次数不能低于黑名单使用记录计算出的自动记录下限。',
    ],
  },
  {
    title: '底部栏与更多菜单',
    items: [
      '左侧日历按钮按日视图、月视图、年视图循环切换。',
      '右侧更多菜单可进入设置、统计、黑名单和关于。',
      '点击黑名单入口在没有使用情况访问权限时会提示先到设置页开启使用记录辅助。',
    ],
  },
  {
    title: '设置页',
    items: [
      '数据管理框中包含导入、导出和分享三个按钮。',
      '导入会读取 JSON 文件；完整备份会恢复打卡、黑名单和设置数据，旧版打卡备份只恢复打卡记录。',
      '导出会生成完整应用数据 JSON。',
      '分享会生成临时 JSON 备份文件并调用系统分享。',
      '安全锁入口位于数据管理下方；开启后桌面入口和启动页会切换为极简备忘录，启动会先进入极简备忘录。',
      '当设备中存在问题日志时，设置页底部会显示打开问题日志文件夹入口。',
    ],
  },
  {
    title: '安全锁与极简备忘录',
    items: [
      '安全锁默认关闭，需要在设置页主动开启。',
      '开启前需要阅读提示并输入指定确认内容，然后设置密码。',
      '开启后桌面名称、图标和启动页会切换为极简备忘录，启动应用先进入极简备忘录；新建笔记时正文完全匹配密码并保存，会进入实际记录应用且不保存该内容。',
      '正文不匹配密码时，会按普通笔记保存。',
      '极简备忘录支持笔记标题、正文、分类、搜索、导入和导出。',
      '忘记密码时，可在极简备忘录设置中重置应用；重置会清空本地数据并恢复新安装状态。',
    ],
  },
  {
    title: '统计页',
    items: [
      '顶部“总 / 年 / 自”可切换总览、年度和自定义区间统计。',
      '总览统计显示全部记录；年度统计显示指定年份记录。',
      '年度统计可用箭头或点击年份文字切换年份，不能切到未来年份。',
      '自定义区间需要分别点击开始日期和结束日期选择范围。',
      '开始日期不能晚于结束日期，结束日期不能早于开始日期。',
      '折线图支持触摸查看点位数据。',
    ],
  },
  {
    title: '使用记录辅助和黑名单',
    items: [
      '该功能仅在支持原生模块的 Android 中可用。',
      '开启或关闭开关都会跳转到系统使用情况访问权限页；返回应用后会按实际权限状态刷新开关。',
      '开启后可检查或申请忽略电池优化、精确定时权限，并可打开应用详情设置。',
      '开启后应用会在每天 23:55 至 23:59 尝试同步最近三天的黑名单应用使用时间段。',
      '关闭系统使用情况访问权限会停止应用内刷新计划，但不会删除已保存的使用记录。',
      '删除应用使用记录按钮只在使用记录辅助关闭时可用。',
      '从右侧更多菜单进入黑名单；首次使用前需先在设置页开启使用记录辅助并授予权限。',
      '点击按日期读取记录，可选择起止日期并读取该范围内当时处于黑名单状态的应用记录。',
      '取消黑名单或应用卸载不会删除历史使用记录。',
      '黑名单使用记录会按规则折算为观看教程自动记录次数；完整规则可点主页提示框中的信息图标查看。',
    ],
  },
  {
    title: '关于页',
    items: [
      '关于页显示应用图标和当前版本号。',
      '软件介绍按钮可查看应用定位、记录类型和主要功能。',
      '使用帮助按钮可查看本页面。',
      '隐私政策按钮可查看应用对记录数据、本地存储、导入导出和分享的说明。',
      '版本记录按钮可查看软件更新记录。',
      '检查更新按钮会联网读取 GitHub 最新正式版本；发现新版时可立即下载，下载完成后可立即安装或稍后继续安装。',
      '页面底部的 GitHub 按钮可打开项目主页。',
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
