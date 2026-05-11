import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import DateQuickPickerModal from "../../../shared/components/DateQuickPickerModal";

const modes = ["总", "年", "自"];

const StatisticsHeader = ({
  mode,
  onModeChange,
  year,
  onYearChange,
  onBack,
  startDate,
  endDate,
  onPickDate,
}) => {
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* 顶部返回按钮 */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          {modes.map((item, index) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.switchButton,
                mode === item && styles.activeSwitchButton,
              ]}
              onPress={() => onModeChange(item)}
            >
              <Text
                style={[
                  styles.switchText,
                  mode === item && styles.activeSwitchText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 若处于“总”模式，显示全部记录 */}
      {mode === "总" && (
        <View style={styles.extraRow}>
          <Text style={styles.extraText}>全部记录</Text>
        </View>
      )}

      {/* 若处于“年”模式，显示年份切换 */}
      {mode === "年" && (
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => onYearChange(year - 1)}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => setYearPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.yearText}>{year} 年</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onYearChange(year + 1)}
            disabled={year >= new Date().getFullYear()}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={year >= new Date().getFullYear() ? "#ccc" : "#007AFF"}
            />
          </TouchableOpacity>
        </View>
      )}

      <DateQuickPickerModal
        visible={yearPickerVisible}
        mode="year"
        value={moment().year(year)}
        onConfirm={(date) => {
          setYearPickerVisible(false);
          onYearChange(date.year());
        }}
        onCancel={() => setYearPickerVisible(false)}
      />

      {mode === "自" && (
        <View style={styles.extraRow}>
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => onPickDate("start")}
          >
            <Text style={styles.dateText}>{startDate}</Text>
          </TouchableOpacity>
          <Text style={styles.extraText}> - </Text>
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => onPickDate("end")}
          >
            <Text style={styles.dateText}>{endDate}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingTop: 44,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backButton: {
    marginRight: 8,
  },
  switchContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    flex: 1,
  },
  switchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 4,
    backgroundColor: "#f0f0f0",
  },
  activeSwitchButton: {
    backgroundColor: "#007AFF",
  },
  switchText: {
    fontSize: 14,
    color: "#333",
  },
  activeSwitchText: {
    color: "#fff",
    fontWeight: "bold",
  },
  extraRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  extraText: {
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 12,
    color: "#333",
  },
  yearRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
  },
  yearText: {
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  yearButton: {
    marginHorizontal: 12,
    paddingHorizontal: 8,
  },
  dateBox: {
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f8f8f8",
    width: 120,
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#000000ff",
  },
});

export default StatisticsHeader;
