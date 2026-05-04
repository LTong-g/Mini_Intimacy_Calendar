/**
 * 极简武器强化日历 - 自定义底部导航栏组件
 */

import React, { useRef, useState } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import CheckInButtons from "./CheckInButtons";
import CountAdjustModal from "./CountAdjustModal";
import {
  checkInTypeToCountKey,
  getCheckInRecord,
  getCheckInRecordCount,
  incrementCheckInType,
  normalizeCheckInRecord,
  setCheckInRecord,
} from "../utils/checkInStorage";
import { Portal } from "react-native-paper";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIBRATION_MS = 30;

const clampInteger = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const CustomTabBar = ({
  currentView,
  onViewChange,
  onCycleViews,
  selectedDate,
  onRefreshMonthView,
  onCheckInChanged,
}) => {
  const [showCheckInButtons, setShowCheckInButtons] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [editingVisible, setEditingVisible] = useState(false);
  const [editingTypeKey, setEditingTypeKey] = useState(null);
  const [editingValue, setEditingValue] = useState("0");
  const holdBaselineRef = useRef(null);
  const navigation = useNavigation();

  const selectedDay = selectedDate.clone().startOf("day");
  const today = moment().startOf("day");
  const canModifySelectedDate = !selectedDay.isAfter(today);

  const notifyCheckInChanged = () => {
    if (onCheckInChanged) {
      onCheckInChanged();
      return;
    }

    if (onRefreshMonthView) {
      onRefreshMonthView();
    }
  };

  const showFutureDateWarning = () => {
    if (Platform.OS === "android") {
      ToastAndroid.show("无法修改未来日期的记录", ToastAndroid.SHORT);
    } else {
      Alert.alert("提示", "无法修改未来日期的记录");
    }
  };

  const commitTypeChange = async (type, amount = 1) => {
    const typeKey = checkInTypeToCountKey(type);
    if (!typeKey) return;

    await incrementCheckInType(selectedDate, typeKey, amount);
    notifyCheckInChanged();
  };

  const handleShortCheckIn = async (type) => {
    if (!canModifySelectedDate) {
      showFutureDateWarning();
      setShowCheckInButtons(false);
      return;
    }

    await commitTypeChange(type, 1);
    setShowCheckInButtons(false);
  };

  const handleLongStart = async () => {
    holdBaselineRef.current = normalizeCheckInRecord(
      await getCheckInRecord(selectedDate)
    );
  };

  const handleLongCheckIn = async (type) => {
    await commitTypeChange(type, 1);
    Vibration.vibrate(VIBRATION_MS);
  };

  const handleLongCommit = async (type) => {
    const typeKey = checkInTypeToCountKey(type);
    if (!typeKey) return;

    const currentRecord = normalizeCheckInRecord(await getCheckInRecord(selectedDate));
    setEditingTypeKey(typeKey);
    setEditingValue(String(getCheckInRecordCount(currentRecord, typeKey)));
    setShowCheckInButtons(false);
    setEditingVisible(true);
  };

  const handleDirectLongEdit = async (type) => {
    const typeKey = checkInTypeToCountKey(type);
    if (!typeKey) return;

    Vibration.vibrate(VIBRATION_MS);
    const currentRecord = normalizeCheckInRecord(await getCheckInRecord(selectedDate));
    setEditingTypeKey(typeKey);
    setEditingValue(String(getCheckInRecordCount(currentRecord, typeKey)));
    setShowCheckInButtons(false);
    setEditingVisible(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingTypeKey) return;

    const currentRecord = normalizeCheckInRecord(await getCheckInRecord(selectedDate));
    const nextRecord = {
      ...currentRecord,
      [editingTypeKey]: clampInteger(editingValue),
    };

    await setCheckInRecord(selectedDate, nextRecord);
    holdBaselineRef.current = null;
    setEditingVisible(false);
    setEditingTypeKey(null);
    setEditingValue("0");
    notifyCheckInChanged();
  };

  const handleCancelEdit = async () => {
    holdBaselineRef.current = null;
    setEditingVisible(false);
    setEditingTypeKey(null);
    setEditingValue("0");
    notifyCheckInChanged();
  };

  const handleCenterPress = () => {
    if (currentView === "Day" || currentView === "Month") {
      setShowCheckInButtons(true);
    } else {
      onViewChange("Day", moment().startOf("day"));
    }
  };

  const handleLongPress = () => {
    if (currentView === "Month") {
      Vibration.vibrate(30);
      onViewChange("Day", moment().startOf("day"));
    }
  };

  const getCurrentViewText = () => {
    const viewMap = {
      Day: "月视图",
      Month: "年视图",
      Year: "月视图",
    };
    return viewMap[currentView];
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
        canCheckIn={canModifySelectedDate}
        onBlockedCheckIn={() => {
          showFutureDateWarning();
          setShowCheckInButtons(false);
        }}
        onCheckIn={handleShortCheckIn}
        onLongPressDirect={currentView === "Month" ? handleDirectLongEdit : undefined}
        onLongStart={handleLongStart}
        onLongCheckIn={handleLongCheckIn}
        onLongCommit={handleLongCommit}
        onClose={() => setShowCheckInButtons(false)}
      />

      <CountAdjustModal
        visible={editingVisible}
        title="编辑次数"
        value={editingValue}
        onChangeValue={(text) => {
          if (text === "") {
            setEditingValue("");
            return;
          }
          if (/^\d+$/.test(text)) {
            setEditingValue(text);
          }
        }}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
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
