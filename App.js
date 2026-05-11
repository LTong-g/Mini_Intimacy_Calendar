import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer, useFocusEffect, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { Provider as PaperProvider } from "react-native-paper";

// 你的视图和组件
import DayView from "./src/features/calendar/screens/DayView";
import MonthView from "./src/features/calendar/screens/MonthView";
import YearView from "./src/features/calendar/screens/YearView";
import CustomTabBar from "./src/features/calendar/components/CustomTabBar";
import SettingsScreen from "./src/features/settings/screens/SettingsScreen"; // ⬅️ 确保存在
import StatisticsScreen from "./src/features/statistics/screens/StatisticsScreen";
import DatePickerScreen from "./src/features/calendar/screens/DatePickerScreen";
import AboutScreen from "./src/features/about/screens/AboutScreen";
import SoftwareIntroScreen from "./src/features/about/screens/SoftwareIntroScreen";
import UsageHelpScreen from "./src/features/about/screens/UsageHelpScreen";
import PrivacyPolicyScreen from "./src/features/about/screens/PrivacyPolicyScreen";
import VersionHistoryScreen from "./src/features/about/screens/VersionHistoryScreen";
import ExperimentalUsageScreen from "./src/features/usage/screens/UsageScreen";
import ExperimentalUsageBlacklistScreen from "./src/features/usage/screens/UsageBlacklistScreen";
import ExperimentalUsageIntervalsScreen from "./src/features/usage/screens/UsageIntervalsScreen";
import ExperimentalUsageIntervalRecordsScreen from "./src/features/usage/screens/UsageIntervalRecordsScreen";
import SecurityLockScreen from "./src/features/memoLock/screens/SecurityLockScreen";
import SecurityLockPasswordSetupScreen from "./src/features/memoLock/screens/SecurityLockPasswordSetupScreen";
import MemoShellScreen from "./src/features/memoLock/screens/MemoShellScreen";
import AppErrorBoundary from "./src/shared/components/AppErrorBoundary";
import AppAlertProvider from "./src/shared/components/modals/AppAlertProvider";
import { getEffectiveCheckInData } from "./src/features/calendar/utils/checkInStorage";
import {
  getSecurityLockState,
  synchronizeSecurityLockLauncherMode,
} from "./src/features/memoLock/utils/securityLockStorage";
import { getDownloadedUpdatePackage } from "./src/shared/utils/updatePackageNative";

const Stack = createNativeStackNavigator();

const VersionHistoryRoute = () => {
  const navigation = useNavigation();
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <AppErrorBoundary onBack={handleBack}>
      <VersionHistoryScreen />
    </AppErrorBoundary>
  );
};

// 日历主页面，管理三种视图状态
const CalendarScreen = () => {
  const [currentView, setCurrentView] = useState("Day");
  const [selectedDate, setSelectedDate] = useState(moment().startOf("day"));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getEffectiveCheckInData().catch((error) => {
      console.error("预加载记录数据失败", error);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getEffectiveCheckInData()
        .then(() => setRefreshKey((prev) => prev + 1))
        .catch((error) => {
          console.error("刷新记录数据失败", error);
        });
    }, [])
  );

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date.clone().startOf("day"));
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case "Day":
        return (
          <DayView
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onViewChange={setCurrentView}
            refreshKey={refreshKey}
          />
        );
      case "Month":
        return (
          <MonthView
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onViewChange={setCurrentView}
            refreshKey={refreshKey}
          />
        );
      case "Year":
        return (
          <YearView
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onViewChange={setCurrentView}
            refreshKey={refreshKey}
          />
        );
      default:
        return <DayView />;
    }
  };

  const handleViewChange = (viewName, date = null) => {
    setCurrentView(viewName);
    if (date) handleDateChange(date);
  };

  const handleCycleViews = () => {
    if (currentView === "Month") {
      setCurrentView("Year");
    } else if (currentView === "Year") {
      setCurrentView("Day");
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
  const [securityReady, setSecurityReady] = useState(false);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [securityUnlocked, setSecurityUnlocked] = useState(false);

  useEffect(() => {
    getDownloadedUpdatePackage().catch(() => {});
    getSecurityLockState()
      .then((state) => {
        setSecurityEnabled(state.enabled);
        synchronizeSecurityLockLauncherMode(state).catch(() => {});
      })
      .catch(() => {
        setSecurityEnabled(true);
      })
      .finally(() => setSecurityReady(true));
  }, []);

  const handleSecurityResetComplete = useCallback(() => {
    setSecurityEnabled(false);
    setSecurityUnlocked(false);
    setSecurityReady(true);
  }, []);

  if (!securityReady) {
    return (
      <PaperProvider>
        <SafeAreaProvider>
          <View style={styles.container} />
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  if (securityEnabled && !securityUnlocked) {
    return (
      <PaperProvider>
        <SafeAreaProvider>
          <AppErrorBoundary>
            <AppAlertProvider>
              <NavigationContainer>
                <MemoShellScreen
                  onUnlock={() => setSecurityUnlocked(true)}
                  onResetComplete={handleSecurityResetComplete}
                />
                <StatusBar style="auto" />
              </NavigationContainer>
            </AppAlertProvider>
          </AppErrorBoundary>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <AppAlertProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="SecurityLock" component={SecurityLockScreen} />
                <Stack.Screen name="SecurityLockPasswordSetup" component={SecurityLockPasswordSetupScreen} />
                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="SoftwareIntro" component={SoftwareIntroScreen} />
                <Stack.Screen name="UsageHelp" component={UsageHelpScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="VersionHistory" component={VersionHistoryRoute} />
                <Stack.Screen name="ExperimentalUsage" component={ExperimentalUsageScreen} />
                <Stack.Screen name="ExperimentalUsageBlacklist" component={ExperimentalUsageBlacklistScreen} />
                <Stack.Screen name="ExperimentalUsageIntervals" component={ExperimentalUsageIntervalsScreen} />
                <Stack.Screen name="ExperimentalUsageIntervalRecords" component={ExperimentalUsageIntervalRecordsScreen} />
                <Stack.Screen name="Statistics" component={StatisticsScreen} />
                <Stack.Screen name="DatePicker" component={DatePickerScreen} />
              </Stack.Navigator>
              <StatusBar style="auto" />
            </NavigationContainer>
          </AppAlertProvider>
        </AppErrorBoundary>
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
