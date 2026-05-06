import React, { useRef, useState } from 'react';
import YearView from './YearView';
import MonthView from './MonthView';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import moment from 'moment';

const DatePickerStack = createNativeStackNavigator();

const DatePickerScreen = () => {
  const outerNavigation = useNavigation();
  const route = useRoute();

  const { mode, onDateSelected } = route.params;
  const [tempDate, setTempDate] = useState(moment());
  const tempDateRef = useRef(tempDate);

  const handleDateChange = (newDate) => {
    const nextDate = newDate.clone().startOf('day');
    tempDateRef.current = nextDate;
    setTempDate(nextDate);
  };

  const handleFinalDateSelected = (finalDate) => {
    onDateSelected(finalDate.format('YYYY-MM-DD'), mode);
    outerNavigation.goBack();
  };

  return (
    <DatePickerStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <DatePickerStack.Screen name="DatePickerYear">
        {({ navigation }) => (
          <YearView
            selectedDate={tempDate}
            onDateChange={handleDateChange}
            onViewChange={() => {
              const nextDate = tempDateRef.current;
              setTempDate(nextDate);
              navigation.navigate('DatePickerMonth', {
                selectedDate: nextDate.valueOf(),
              });
            }}
          />
        )}
      </DatePickerStack.Screen>
      <DatePickerStack.Screen name="DatePickerMonth">
        {({ navigation, route: monthRoute }) => {
          const selectedDate = monthRoute.params?.selectedDate
            ? moment(monthRoute.params.selectedDate)
            : tempDate;
          const handleQuickMonthChange = (date) => {
            handleDateChange(date);
            navigation.setParams({ selectedDate: date.valueOf() });
          };

          return (
            <MonthView
              selectedDate={selectedDate}
              onDateChange={handleFinalDateSelected}
              onViewChange={() => {}}
              onQuickMonthChange={handleQuickMonthChange}
            />
          );
        }}
      </DatePickerStack.Screen>
    </DatePickerStack.Navigator>
  );
};

export default DatePickerScreen;
