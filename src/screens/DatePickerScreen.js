import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import YearView from './YearView';
import MonthView from './MonthView';
import { useNavigation, useRoute } from '@react-navigation/native';
import moment from 'moment';

const DatePickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { mode, onDateSelected } = route.params;
  const [view, setView] = useState('year'); // 'year' or 'month'
  const [tempDate, setTempDate] = useState(moment());

  const handleDateChange = (newDate) => {
    setTempDate(newDate);
  };

  const handleMonthSelected = (date) => {
    setTempDate(date);
    setView('month');
  };

  const handleFinalDateSelected = (finalDate) => {
    onDateSelected(finalDate.format('YYYY-MM-DD'), mode);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {view === 'year' ? (
        <YearView
          selectedDate={tempDate}
          onDateChange={handleDateChange}
          onViewChange={() => setView('month')}
        />
      ) : (
        <MonthView
          selectedDate={tempDate}
          onDateChange={handleFinalDateSelected}
          onViewChange={() => setView('year')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default DatePickerScreen;
