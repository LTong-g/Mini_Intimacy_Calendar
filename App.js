import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { Provider as PaperProvider } from "react-native-paper";

// 你的视图和组件
import DayView from "./src/screens/DayView";
import MonthView from "./src/screens/MonthView";
import YearView from "./src/screens/YearView";
import CustomTabBar from "./src/components/CustomTabBar";
import SettingsScreen from "./src/screens/SettingsScreen"; // ⬅️ 确保存在
import StatisticsScreen from "./src/screens/StatisticsScreen";
import DatePickerScreen from "./src/screens/DatePickerScreen";
import AboutScreen from "./src/screens/AboutScreen";
import SoftwareIntroScreen from "./src/screens/SoftwareIntroScreen";
import VersionHistoryScreen from "./src/screens/VersionHistoryScreen";

const Stack = createNativeStackNavigator();

// 日历主页面，管理三种视图状态
const CalendarScreen = () => {
  const [currentView, setCurrentView] = useState("Day");
  const [selectedDate, setSelectedDate] = useState(moment());
  const [refreshKey, setRefreshKey] = useState(0);

  const renderCurrentView = () => {
    switch (currentView) {
      case "Day":
        return (
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onViewChange={setCurrentView}
            refreshKey={refreshKey}
          />
        );
      case "Month":
        return (
          <MonthView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onViewChange={setCurrentView}
            refreshKey={refreshKey}
          />
        );
      case "Year":
        return (
          <YearView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onViewChange={setCurrentView}
          />
        );
      default:
        return <DayView />;
    }
  };

  const handleViewChange = (viewName, date = null) => {
    setCurrentView(viewName);
    if (date) setSelectedDate(date);
  };

  const handleCycleViews = () => {
    if (currentView === "Month") {
      setCurrentView("Year");
    } else if (currentView === "Year") {
      setCurrentView("Month");
    } else {
      setCurrentView("Month");
    }
  };

  const handleRefreshMonthView = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <View style={styles.container}>
      {renderCurrentView()}
      <CustomTabBar
        currentView={currentView}
        onViewChange={handleViewChange}
        onCycleViews={handleCycleViews}
        selectedDate={selectedDate}
        onRefreshMonthView={handleRefreshMonthView}
        onCheckInChanged={handleRefreshMonthView}
      />
    </View>
  );
};

// 主 App，负责导航结构
export default function App() {
  return (
    <PaperProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="SoftwareIntro" component={SoftwareIntroScreen} />
            <Stack.Screen name="VersionHistory" component={VersionHistoryScreen} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} />
            <Stack.Screen name="DatePicker" component={DatePickerScreen} />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
