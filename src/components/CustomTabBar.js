/**
 * 极简武器强化日历 - 自定义底部导航栏组件（更多菜单等宽展开版）
 * 修改：右下“更多”按钮展开菜单宽度为底栏一半，贴合按钮右上方弹出
 * 增加“设置”点击跳转 Settings 页面功能
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
  ToastAndroid,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import CheckInButtons from "./CheckInButtons";
import { setCheckInStatus, toggleCheckInType } from "../utils/checkInStorage";
import { Portal } from "react-native-paper";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CustomTabBar = ({
  currentView,
  onViewChange,
  onCycleViews,
  selectedDate,
  onRefreshMonthView,
}) => {
  const [showCheckInButtons, setShowCheckInButtons] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigation = useNavigation();

  const handleCenterPress = () => {
    if (currentView === "Day") {
      setShowCheckInButtons(true);
    } else {
      onViewChange("Day", moment());
    }
  };

  const handleLongPress = () => {
    if (currentView === "Month") {
      Vibration.vibrate(30);
      setShowCheckInButtons(true);
    }
  };

  const getCurrentViewText = () => {
    const viewMap = {
      Day: "日视图",
      Month: "月视图",
      Year: "年视图",
    };
    return viewMap[currentView] || "日视图";
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, styles.leftButton]}
          onPress={onCycleViews}
        >
          <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          <Text style={styles.tabText}>{getCurrentViewText()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, styles.rightButton]}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
          <Text style={styles.tabText}>更多</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerButton}
          onPress={handleCenterPress}
          onLongPress={handleLongPress}
          delayLongPress={500}
        >
          <View style={styles.centerButtonInner}>
            <Ionicons name="today" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <Portal>
        {showMoreMenu && (
          <TouchableWithoutFeedback onPress={() => setShowMoreMenu(false)}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.moreMenu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMoreMenu(false);
                      navigation.navigate("Settings");
                    }}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color="#333"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.menuText}>设置</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMoreMenu(false);
                      navigation.navigate("Statistics");
                    }}
                  >
                    <Ionicons
                      name="pie-chart-outline"
                      size={20}
                      color="#333"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.menuText}>统计</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Portal>

      <CheckInButtons
        visible={showCheckInButtons}
        onCheckIn={async (type) => {
          const today = moment().startOf("day");
          const selectedDay = selectedDate.clone().startOf("day");
          if (selectedDay.isAfter(today)) {
            if (Platform.OS === "android") {
              ToastAndroid.show("无法修改未来日期的记录", ToastAndroid.SHORT);
            } else {
              Alert.alert("提示", "无法修改未来日期的记录");
            }
            setShowCheckInButtons(false);
            return;
          }
          const currentStatus =
            await require("../utils/checkInStorage").getCheckInStatus(
              selectedDate
            );
          const newStatus = toggleCheckInType(currentStatus, type);
          await setCheckInStatus(selectedDate, newStatus);
          if (currentView === "Month" && onRefreshMonthView) {
            onRefreshMonthView();
          }
          setShowCheckInButtons(false);
        }}
        onClose={() => setShowCheckInButtons(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  tabBar: {
    flexDirection: "row",
    height: 60,
    position: "relative",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  leftButton: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  rightButton: {
    borderLeftWidth: 1,
    borderLeftColor: "#e0e0e0",
  },
  tabText: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 2,
  },
  centerButton: {
    position: "absolute",
    top: -20,
    left: "50%",
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 4,
    borderColor: "#fff",
  },
  centerButtonInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  moreMenu: {
    position: "absolute",
    bottom: 65,
    right: 0,
    width: SCREEN_WIDTH / 2,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 14,
    color: "#333",
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 99,
  },
});

export default CustomTabBar;
