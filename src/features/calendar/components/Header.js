/**
 * 文件名：Header.js
 * 描述：极简武器强化日历 - 顶部导航组件
 *
 * 功能：
 *   - 显示当前视图的标题文字
 *   - 提供“上一个 / 下一个”导航箭头按钮，可配置是否显示及禁用状态
 *   - 在不同场景下灵活隐藏或禁用箭头按钮
 *
 * 作者：Lyu Jiongrui
 * 版本：1.0.0
 * 日期：2025-07-25
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

 /**
  * Header 组件
  *
  * @param {Object}   props
  * @param {string}   props.title                 — 顶部标题文本
  * @param {Function} props.onPrevious            — 点击左侧“上一页”箭头的回调函数
  * @param {Function} props.onNext                — 点击右侧“下一页”箭头的回调函数
  * @param {Function} [props.onTitlePress]        — 点击标题文字的回调函数
  * @param {boolean}  [props.showArrows=true]     — 是否显示导航箭头（默认显示）
  * @param {boolean}  [props.disablePrevious=false] — 是否禁用左侧箭头（默认不禁用）
  * @param {boolean}  [props.disableNext=false]     — 是否禁用右侧箭头（默认不禁用）
  * @returns {React.Element} — 渲染顶部导航栏
  */
const Header = ({
  title,
  onPrevious,
  onNext,
  onTitlePress,
  showArrows = true,
  disablePrevious = false,
  disableNext = false,
}) => {
  const TitleWrapper = onTitlePress ? TouchableOpacity : View;
  const titleProps = onTitlePress
    ? { onPress: onTitlePress, activeOpacity: 0.7 }
    : {};

  return (
    <View style={styles.header}>
      {/* 左侧箭头：仅在 showArrows 为 true 时渲染 */}
      {showArrows && (
        <TouchableOpacity
          style={[
            styles.arrowButton,
            disablePrevious && styles.disabledButton, // 禁用时降低透明度
          ]}
          onPress={onPrevious}                       // 绑定上一页回调
          disabled={disablePrevious}                 // 禁用触摸事件
        >
          {/* 根据 disablePrevious 决定箭头颜色 */}
          <Ionicons
            name="chevron-back"
            size={24}
            color={disablePrevious ? '#ccc' : '#007AFF'}
          />
        </TouchableOpacity>
      )}

      {/* 标题区域：占据中间位置并水平居中 */}
      <TitleWrapper
        style={[
          styles.titleContainer,
          onTitlePress && styles.titleButton,
        ]}
        {...titleProps}
      >
        <Text style={styles.titleText}>
          {title}
        </Text>
      </TitleWrapper>

      {/* 右侧箭头：仅在 showArrows 为 true 时渲染 */}
      {showArrows && (
        <TouchableOpacity
          style={[
            styles.arrowButton,
            disableNext && styles.disabledButton,     // 禁用时降低透明度
          ]}
          onPress={onNext}                            // 绑定下一页回调
          disabled={disableNext}                      // 禁用触摸事件
        >
          {/* 根据 disableNext 决定箭头颜色 */}
          <Ionicons
            name="chevron-forward"
            size={24}
            color={disableNext ? '#ccc' : '#007AFF'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /** 顶部容器：横向排列，居中对齐，带内边距和底部边框 */
  header: {
    flexDirection: 'row',           // 水平布局
    alignItems: 'center',           // 垂直居中
    justifyContent: 'center',// 两端对齐，中间留空
    padding: 8,                    // 四周内边距
    paddingTop: 44,                 // 顶部安全区（状态栏高度）
    backgroundColor: '#fff',        // 背景白色
    borderBottomWidth: 1,           // 底部边框
    borderBottomColor: '#e0e0e0',   // 边框灰色
  },
  /** 箭头按钮：增大点击区域 */
  arrowButton: {
    padding: 10,
  },
  /** 禁用状态样式：降低透明度 */
  disabledButton: {
    opacity: 0.3,
  },
  /** 标题容器：占据剩余空间并水平居中 */
  titleContainer: {
    alignItems: 'center',
  },
  titleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  /** 标题文本：字体大小、加粗及颜色 */
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default Header;
