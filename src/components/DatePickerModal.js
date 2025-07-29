import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import moment from 'moment';

const DatePickerModal = ({ visible, onClose, onSelect }) => {
  const [step, setStep] = useState('year'); // 'year' → 'month' → 'day'
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setStep('day');
  };

  const handleDaySelect = (day) => {
    const date = moment({ year: selectedYear, month: selectedMonth, day });
    onSelect(date.format('YYYY-MM-DD'));
    handleClose();
  };

  const handleBack = () => {
    if (step === 'day') setStep('month');
    else if (step === 'month') setStep('year');
  };

  const handleClose = () => {
    setStep('year');
    setSelectedMonth(null);
    onClose();
  };

  const renderYearStep = () => {
    const years = [];
    const current = moment().year();
    for (let y = 2020; y <= current; y++) years.push(y);

    return (
      <FlatList
        data={years.reverse()}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleYearSelect(item)}
          >
            <Text style={styles.optionText}>{item} 年</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderMonthStep = () => {
    const months = moment.months();

    return (
      <FlatList
        data={months.map((name, i) => ({ name, i }))}
        keyExtractor={(item) => item.i.toString()}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleMonthSelect(item.i)}
          >
            <Text style={styles.optionText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderDayStep = () => {
    const daysInMonth = moment({ year: selectedYear, month: selectedMonth }).daysInMonth();
    const today = moment();
    const isCurrentMonth = selectedYear === today.year() && selectedMonth === today.month();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const isFuture = isCurrentMonth && i > today.date();
      days.push({ day: i, disabled: isFuture });
    }

    return (
      <FlatList
        data={days}
        keyExtractor={(item) => item.day.toString()}
        numColumns={5}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.option, item.disabled && styles.disabled]}
            disabled={item.disabled}
            onPress={() => handleDaySelect(item.day)}
          >
            <Text style={styles.optionText}>{item.day}</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  const titleMap = {
    year: '选择年份',
    month: `${selectedYear} 年 - 选择月份`,
    day: `${selectedYear} 年 ${selectedMonth + 1} 月 - 选择日期`,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            {step !== 'year' && (
              <TouchableOpacity onPress={handleBack}>
                <Text style={styles.backText}>← 返回</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.title}>{titleMap[step]}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeText}>关闭</Text>
            </TouchableOpacity>
          </View>

          {step === 'year' && renderYearStep()}
          {step === 'month' && renderMonthStep()}
          {step === 'day' && renderDayStep()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
    paddingBottom: 10,
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeText: {
    color: '#007AFF',
  },
  backText: {
    color: '#007AFF',
  },
  option: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    margin: 4,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  disabled: {
    backgroundColor: '#ddd',
  },
});

export default DatePickerModal;
