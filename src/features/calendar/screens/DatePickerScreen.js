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

  const { mode, returnTo, returnKey } = route.params;
  const [tempDate, setTempDate] = useState(moment());
  const tempDateRef = useRef(tempDate);

  const handleDateChange = (newDate) => {
    const nextDate = newDate.clone().startOf('day');
    tempDateRef.current = nextDate;
    setTempDate(nextDate);
  };

  const handleFinalDateSelected = (finalDate) => {
    const datePickerResult = {
      date: finalDate.format('YYYY-MM-DD'),
      mode,
      requestId: Date.now(),
    };
    if (returnKey) {
      outerNavigation.dispatch({
        type: 'SET_PARAMS',
        payload: {
          params: {
            datePickerResult,
          },
        },
        source: returnKey,
      });
      outerNavigation.goBack();
      return;
    }
    if (!returnTo) {
      outerNavigation.goBack();
      return;
    }
    outerNavigation.navigate({
      name: returnTo,
      params: {
        datePickerResult,
      },
      merge: true,
    });
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
