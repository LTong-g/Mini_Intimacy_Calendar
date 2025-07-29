import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  ToastAndroid,
  Platform,
} from "react-native";
import StatisticsHeader from "../components/StatisticsHeader";
import moment from "moment";
import DatePickerModal from "../components/DatePickerModal";
import TotalStatsTable from "../components/TotalStatsTable";
import YearStatsTable from "../components/YearStatsTable";
import YearLineChart from "../components/YearLineChart";

const StatisticsScreen = ({ navigation }) => {
  const [mode, setMode] = useState("总"); // “总” | “年” | “自”
  const [currentYear, setCurrentYear] = useState(moment().year());
  const [startDate, setStartDate] = useState("开始日期");
  const [endDate, setEndDate] = useState("结束日期");
  const [showPicker, setShowPicker] = useState(false);
  const [pickTarget, setPickTarget] = useState(null); // 'start' 或 'end'

  const handlePickDate = (which) => {
    navigation.navigate("DatePicker", {
      mode: which, // 'start' or 'end'
      onDateSelected: (dateStr, whichOne) => {
        if (whichOne === "start") {
          if (endDate !== "结束日期" && moment(dateStr).isAfter(endDate)) {
            if (Platform.OS === "android") {
              ToastAndroid.show("开始日期不能晚于结束日期", ToastAndroid.SHORT);
            } else {
              Alert.alert("提示", "开始日期不能晚于结束日期");
            }
            return;
          }
          setStartDate(dateStr);
        } else {
          if (startDate !== "开始日期" && moment(dateStr).isBefore(startDate)) {
            if (Platform.OS === "android") {
              ToastAndroid.show("结束日期不能早于开始日期", ToastAndroid.SHORT);
            } else {
              Alert.alert("提示", "结束日期不能早于开始日期");
            }
            return;
          }
          setEndDate(dateStr);
        }
      },
    });
  };

  const handleDateSelected = (dateStr) => {
    if (pickTarget === "start") setStartDate(dateStr);
    else if (pickTarget === "end") setEndDate(dateStr);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <StatisticsHeader
        mode={mode}
        onModeChange={setMode}
        year={currentYear}
        onYearChange={setCurrentYear}
        onBack={() => navigation.goBack()}
        startDate={startDate}
        endDate={endDate}
        onPickDate={handlePickDate}
      />
      <ScrollView style={styles.content}>
        {mode === "总" && <TotalStatsTable />}

        {mode === "年" && (
          <>
            <YearStatsTable year={currentYear} />
            <YearLineChart year={currentYear} />
          </>
        )}

        {mode === "自" && <Text>自定义范围统计</Text>}
      </ScrollView>

      <DatePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleDateSelected}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flex: 1,
  },
});

export default StatisticsScreen;
