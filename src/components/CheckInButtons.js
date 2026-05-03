/**
 * 文件名：CheckInButtons.js
 * 描述：极简武器强化日历 - 记录按钮组组件
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LONG_PRESS_INTERVAL_MS = 1000;
const LONG_PRESS_CONFIRM_TICKS = 3;

const CheckInButtons = ({
  visible,
  canCheckIn = true,
  onCheckIn,
  onBlockedCheckIn,
  onLongPressDirect,
  onLongStart,
  onLongCheckIn,
  onLongCommit,
  onClose,
}) => {
  const [animations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);
  const timerRef = useRef(null);
  const suppressTimerRef = useRef(null);
  const tickCountRef = useRef(0);
  const holdTokenRef = useRef(0);
  const suppressNextPressRef = useRef(false);
  const stepInProgressRef = useRef(false);

  const buttonConfigs = useMemo(
    () => [
      { icon: 'desktop', color: '#FFE082', iconColor: '#F57F17', type: 1 },
      { icon: 'airplane', color: '#B3E5FC', iconColor: '#0277BD', type: 2 },
      { icon: 'heart', color: '#FFCDD2', iconColor: '#C62828', type: 4 },
    ],
    []
  );

  useEffect(() => {
    if (visible) {
      buttonConfigs.forEach((_, idx) => {
        Animated.timing(animations[idx], {
          toValue: 1,
          duration: 300,
          delay: idx * 100,
          useNativeDriver: true,
        }).start();
      });
    } else {
      buttonConfigs.forEach((_, idx) => {
        Animated.timing(animations[idx], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      clearRunning();
      clearSuppressTimer();
      suppressNextPressRef.current = false;
    }
  }, [visible, animations, buttonConfigs]);

  useEffect(() => {
    return () => {
      clearRunning();
      clearSuppressTimer();
      suppressNextPressRef.current = false;
    };
  }, []);

  const getButtonPosition = (index) => {
    const positions = [
      { x: -75, y: -75 },
      { x: 0, y: -110 },
      { x: 75, y: -75 },
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
          scale: animations[index],
        },
      ],
    };
  };

  const clearRunning = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    holdTokenRef.current += 1;
    tickCountRef.current = 0;
    stepInProgressRef.current = false;
  };

  const clearSuppressTimer = () => {
    if (suppressTimerRef.current) {
      clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = null;
    }
  };

  const suppressNextPressBriefly = () => {
    clearSuppressTimer();
    suppressNextPressRef.current = true;
  };

  const clearSuppressionSoon = () => {
    clearSuppressTimer();
    suppressTimerRef.current = setTimeout(() => {
      suppressNextPressRef.current = false;
      suppressTimerRef.current = null;
    }, 500);
  };

  const handleClose = () => {
    clearRunning();
    Animated.parallel(
      animations.map((anim, idx) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          delay: idx * 50,
          useNativeDriver: true,
        })
      )
    ).start(onClose);
  };

  const handleBlocked = () => {
    clearRunning();
    if (onBlockedCheckIn) onBlockedCheckIn();
  };

  const runLongPressStep = async (type, direction, holdToken) => {
    if (holdToken !== holdTokenRef.current || stepInProgressRef.current) return;

    stepInProgressRef.current = true;
    try {
      tickCountRef.current += 1;
      if (onLongCheckIn) {
        await onLongCheckIn(type, direction);
      }

      if (tickCountRef.current >= LONG_PRESS_CONFIRM_TICKS) {
        clearRunning();
        if (onLongCommit) {
          await onLongCommit(type, direction);
        }
      }
    } finally {
      stepInProgressRef.current = false;
    }
  };

  const startRunning = async (type, direction) => {
    if (!canCheckIn) {
      handleBlocked();
      return;
    }

    clearRunning();
    suppressNextPressBriefly();

    if (onLongPressDirect) {
      await onLongPressDirect(type, direction);
      return;
    }

    const holdToken = holdTokenRef.current;
    if (onLongStart) await onLongStart(type, direction);
    if (holdToken !== holdTokenRef.current) return;

    await runLongPressStep(type, direction, holdToken);
    if (holdToken !== holdTokenRef.current) return;

    timerRef.current = setInterval(() => {
      if (holdToken !== holdTokenRef.current) {
        clearRunning();
        return;
      }
      void runLongPressStep(type, direction, holdToken);
    }, LONG_PRESS_INTERVAL_MS);
  };

  const handlePress = (type) => {
    if (suppressNextPressRef.current) {
      clearSuppressTimer();
      suppressNextPressRef.current = false;
      return;
    }

    if (!canCheckIn) {
      handleBlocked();
      return;
    }

    if (onCheckIn) onCheckIn(type);
  };

  const handlePressOut = () => {
    clearRunning();
    if (suppressNextPressRef.current) {
      clearSuppressionSoon();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.overlay} onPress={handleClose} />

      <View style={styles.buttonsContainer}>
        {buttonConfigs.map((cfg, idx) => (
          <Animated.View
            key={cfg.icon}
            style={[styles.buttonWrapper, getButtonPosition(idx)]}
          >
            <TouchableOpacity
              style={[styles.checkInButton, { backgroundColor: cfg.color }]}
              onPress={() => handlePress(cfg.type)}
              onLongPress={() => {
                void startRunning(cfg.type, 1);
              }}
              onPressOut={handlePressOut}
              delayLongPress={500}
            >
              <Ionicons name={cfg.icon} size={24} color={cfg.iconColor} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonsContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    position: 'absolute',
  },
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
