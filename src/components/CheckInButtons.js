/**
 * 文件名：CheckInButtons.js
 * 描述：极简武器强化日历 - 记录按钮组组件
 * 功能：
 *   - 提供三种记录类型按钮（观看教程、武器强化、联机训练）
 *   - 支持展开/收起动画
 *   - 点击遮罩或收起后回调关闭
 * 作者：Lyu Jiongrui
 * 版本：1.0.0
 * 日期：2025-07-25
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CheckInButtons 组件
 *
 * @param {boolean} visible   — 是否显示按钮组
 * @param {Function} onCheckIn — 点击按钮后的回调，接收 type 参数
 * @param {Function} onClose   — 关闭按钮组后的回调
 * @returns {React.ReactNode|null}
 */
const CheckInButtons = ({ visible, onCheckIn, onClose }) => {
  // 三个动画值，分别控制三个按钮的展开收起
  const [animations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  // 按钮配置：图标名、背景色、图标色、对应的 type 值（位掩码）
  const buttonConfigs = [
    { icon: 'desktop',   color: '#FFE082', iconColor: '#F57F17', type: 1 },  // 观看教程
    { icon: 'airplane',  color: '#B3E5FC', iconColor: '#0277BD', type: 2 },  // 武器强化
    { icon: 'heart',     color: '#FFCDD2', iconColor: '#C62828', type: 4 },  // 联机训练
  ];

  // 当 visible 改变时，触发展开或收起动画
  useEffect(() => {
    if (visible) {
      // 顺序展开：依次将每个 Animated.Value 从 0 → 1
      animations.forEach((anim, idx) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: idx * 100,       // 每个按钮错开 100ms
          useNativeDriver: true,  // 使用原生驱动以获得更好性能
        }).start();
      });
    } else {
      // 同步收起：所有按钮同时 1 → 0
      animations.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible, animations]);

  /**
   * 根据索引计算按钮在展开状态下的位置偏移
   * @param {number} index — 按钮索引（0、1、2）
   * @returns {Object} Animated 样式：translateX、translateY、scale
   */
  const getButtonPosition = (index) => {
    // 三个按钮对应的相对位置
    const positions = [
      { x: -75, y: -75 },   // 左上
      { x:   0, y: -110 },  // 正上
      { x:  75, y: -75 },   // 右上
    ];
    const { x, y } = positions[index];

    return {
      transform: [
        {
          translateX: animations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, x],
          }),
        },
        {
          translateY: animations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, y],
          }),
        },
        {
          scale: animations[index],  // 从 0 → 1 缩放效果
        },
      ],
    };
  };

  // 点击遮罩或外部区域时触发收起动画，并在动画完成后回调 onClose
  const handleClose = () => {
    Animated.parallel(
      animations.map((anim, idx) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          delay: idx * 50,       // 收起时略微错开
          useNativeDriver: true,
        })
      )
    ).start(onClose);
  };

  // 不可见时不渲染任何内容
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* 半透明遮罩，拦截点击以触发收起 */}
      <TouchableOpacity
        style={styles.overlay}
        onPress={handleClose}
      />

      {/* 按钮容器，相对定位，供 Animated.View 绝对定位 */}
      <View style={styles.buttonsContainer}>
        {buttonConfigs.map((cfg, idx) => (
          <Animated.View
            key={cfg.icon}
            style={[styles.buttonWrapper, getButtonPosition(idx)]}
          >
            <TouchableOpacity
              style={[
                styles.checkInButton,
                { backgroundColor: cfg.color },
              ]}
              onPress={() => onCheckIn(cfg.type)}
            >
              <Ionicons
                name={cfg.icon}
                size={24}
                color={cfg.iconColor}
              />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 全屏居中容器，用于放置遮罩和按钮组
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 遮罩：填满全屏、透明，可拦截点击
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  // 按钮组容器：固定宽高，居中对齐
  buttonsContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 单个按钮的包裹容器，用于绝对定位动画
  buttonWrapper: {
    position: 'absolute',
  },
  // 圆形按钮样式：阴影、居中图标
  checkInButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
  },
});

export default CheckInButtons;
