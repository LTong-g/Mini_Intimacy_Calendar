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
  CheckInCountKeys,
  getAutoTutorialMinimum,
  getEffectiveCheckInRecord,
  getCheckInRecord,
  getCheckInRecordCount,
  normalizeCheckInRecord,
  setCheckInRecord,
} from "../utils/checkInStorage";
import {
  getUsageAccessStatus,
  isUsageAccessNativeAvailable,
  setUsageAccessFeatureEnabled,
} from "../../usage/utils/usageAccessNative";
import { showAppAlert } from "../../../shared/utils/appAlert";
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
  const [editingMinValue, setEditingMinValue] = useState(0);
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
      showAppAlert("提示", "无法修改未来日期的记录");
    }
  };

  const commitTypeChange = async (type, amount = 1) => {
    const typeKey = checkInTypeToCountKey(type);
    if (!typeKey) return;

    const [manualRecord, effectiveRecord, minimum] = await Promise.all([
      getCheckInRecord(selectedDate),
      getEffectiveCheckInRecord(selectedDate),
      typeKey === CheckInCountKeys.TYPE1 ? getAutoTutorialMinimum(selectedDate) : 0,
    ]);
    const nextRecord = {
      ...normalizeCheckInRecord(manualRecord),
      [typeKey]: Math.max(
        minimum,
        getCheckInRecordCount(effectiveRecord, typeKey) + amount
      ),
    };

    await setCheckInRecord(selectedDate, nextRecord);
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

    const [currentRecord, minimum] = await Promise.all([
      getEffectiveCheckInRecord(selectedDate),
      typeKey === CheckInCountKeys.TYPE1 ? getAutoTutorialMinimum(selectedDate) : 0,
    ]);
    setEditingTypeKey(typeKey);
    setEditingMinValue(minimum);
    setEditingValue(String(getCheckInRecordCount(currentRecord, typeKey)));
    setShowCheckInButtons(false);
    setEditingVisible(true);
  };

  const handleDirectLongEdit = async (type) => {
    const typeKey = checkInTypeToCountKey(type);
    if (!typeKey) return;

    Vibration.vibrate(VIBRATION_MS);
    const [currentRecord, minimum] = await Promise.all([
      getEffectiveCheckInRecord(selectedDate),
      typeKey === CheckInCountKeys.TYPE1 ? getAutoTutorialMinimum(selectedDate) : 0,
    ]);
    setEditingTypeKey(typeKey);
    setEditingMinValue(minimum);
    setEditingValue(String(getCheckInRecordCount(currentRecord, typeKey)));
    setShowCheckInButtons(false);
    setEditingVisible(true);
  };

  const handleConfirmEdit = async (selectedValue) => {
    if (!editingTypeKey) return;

    const currentRecord = normalizeCheckInRecord(await getCheckInRecord(selectedDate));
    const targetValue = selectedValue ?? editingValue;
    const nextRecord = {
      ...currentRecord,
      [editingTypeKey]: Math.max(editingMinValue, clampInteger(targetValue)),
    };

    await setCheckInRecord(selectedDate, nextRecord);
    holdBaselineRef.current = null;
    setEditingVisible(false);
    setEditingTypeKey(null);
    setEditingValue("0");
    setEditingMinValue(0);
    notifyCheckInChanged();
  };

  const handleCancelEdit = async () => {
    holdBaselineRef.current = null;
    setEditingVisible(false);
    setEditingTypeKey(null);
    setEditingValue("0");
    setEditingMinValue(0);
    notifyCheckInChanged();
  };

  const handleCenterPress = () => {
    if (currentView === "Day" || currentView === "Month") {
      setShowCheckInButtons(true);
    }
  };

  const getCurrentViewText = () => {
    const viewMap = {
      Day: "查看月视图",
      Month: "查看年视图",
      Year: "查看日视图",
    };
    return viewMap[currentView];
  };

  const handleOpenBlacklist = async () => {
    setShowMoreMenu(false);

    if (!isUsageAccessNativeAvailable()) {
      showAppAlert(
        "无法打开黑名单",
        "当前运行环境不支持原生使用记录模块，请使用 Android 开发构建或安装包。"
      );
      return;
    }

    try {
      const status = await getUsageAccessStatus();
      const nextStatus =
        status.usageAccessGranted && !status.featureEnabled
          ? await setUsageAccessFeatureEnabled(true)
          : status;

      if (!nextStatus.usageAccessGranted) {
        showAppAlert(
          "需要使用记录权限",
          "请先到设置页开启使用记录辅助，并在系统设置中授予使用情况访问权限。"
        );
        return;
      }

      navigation.navigate("ExperimentalUsage");
    } catch (error) {
      showAppAlert("打开失败", error.message || "无法读取使用记录权限状态");
    }
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
          disabled={currentView === "Year"}
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
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleOpenBlacklist}
                  >
                    <Ionicons
                      name="ban-outline"
                      size={20}
                      color="#333"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.menuText}>黑名单</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMoreMenu(false);
                      navigation.navigate("About");
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#333"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.menuText}>关于</Text>
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
        minValue={editingMinValue}
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
