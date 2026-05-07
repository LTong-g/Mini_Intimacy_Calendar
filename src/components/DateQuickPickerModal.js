import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import moment from 'moment';
import BaseModal from './modals/BaseModal';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const START_YEAR = 1900;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildRange = (start, end) => {
  const result = [];
  for (let value = start; value <= end; value += 1) result.push(value);
  return result;
};

const normalizeDateForMode = (date, mode) => {
  const today = moment().startOf('day');
  const value = moment(date).startOf('day');

  if (mode === 'year') {
    return moment.min(value.clone().startOf('year'), today.clone().startOf('year'));
  }

  if (mode === 'month') {
    return moment.min(value.clone().startOf('month'), today.clone().startOf('month'));
  }

  return moment.min(value, today);
};

const WheelColumn = forwardRef(({ data, value, labelFormatter, onChange, scrollKey }, ref) => {
  const listRef = useRef(null);
  const previousDataKeyRef = useRef('');
  const offsetRef = useRef(0);
  const selectedIndex = Math.max(0, data.indexOf(value));
  const dataKey = data.join(',');
  const positionKey = `${scrollKey}-${dataKey}`;
  const snapOffsets = useMemo(
    () => data.map((item, index) => index * ITEM_HEIGHT),
    [data]
  );

  useEffect(() => {
    if (!listRef.current || data.length === 0) return;
    if (previousDataKeyRef.current === positionKey) return;
    previousDataKeyRef.current = positionKey;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
      });
      offsetRef.current = selectedIndex * ITEM_HEIGHT;
    });
  }, [data, positionKey, selectedIndex]);

  const commitNearestItem = (offsetY) => {
    const index = clamp(Math.round(offsetY / ITEM_HEIGHT), 0, data.length - 1);
    onChange(data[index]);
  };

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const index = clamp(Math.round(offsetRef.current / ITEM_HEIGHT), 0, data.length - 1);
      return data[index];
    },
  }), [data]);

  return (
    <View style={styles.wheelColumn}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="normal"
        disableIntervalMomentum={false}
        bounces={false}
        snapToAlignment="start"
        getItemLayout={(items, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={styles.wheelContent}
        onScroll={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        onScrollEndDrag={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.wheelItem}
            onPress={() => {
              const index = data.indexOf(item);
              if (index < 0) return;
              offsetRef.current = index * ITEM_HEIGHT;
              listRef.current?.scrollToIndex({ index, animated: true });
              onChange(item);
            }}
          >
            <Text style={[
              styles.wheelItemText,
              item === value && styles.selectedWheelItemText,
            ]}>
              {labelFormatter(item)}
            </Text>
          </Pressable>
        )}
      />
      <View pointerEvents="none" style={styles.selectionFrame} />
    </View>
  );
});

const DateQuickPickerModal = ({
  visible,
  mode,
  value,
  onConfirm,
  onCancel,
}) => {
  const normalizedInitial = useMemo(
    () => normalizeDateForMode(value || moment(), mode),
    [mode, value]
  );

  const [draft, setDraft] = useState(normalizedInitial);
  const yearWheelRef = useRef(null);
  const monthWheelRef = useRef(null);
  const dayWheelRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setDraft(normalizeDateForMode(value || moment(), mode));
    }
  }, [mode, value, visible]);

  const today = moment().startOf('day');
  const year = draft.year();
  const month = draft.month();
  const daysInMonth = draft.daysInMonth();

  const years = useMemo(() => buildRange(START_YEAR, today.year()), [today]);
  const maxMonth = year === today.year() ? today.month() : 11;
  const months = useMemo(() => buildRange(0, maxMonth), [maxMonth]);
  const maxDay =
    year === today.year() && month === today.month()
      ? today.date()
      : daysInMonth;
  const days = useMemo(() => buildRange(1, maxDay), [maxDay]);

  const updateDraft = (nextYear, nextMonth, nextDay) => {
    const targetYear = nextYear ?? year;
    const targetMonth = nextMonth ?? month;
    const targetDaysInMonth = moment()
      .year(targetYear)
      .month(targetMonth)
      .daysInMonth();
    const targetMaxDay =
      targetYear === today.year() && targetMonth === today.month()
        ? today.date()
        : targetDaysInMonth;
    const targetDay = clamp(nextDay ?? draft.date(), 1, targetMaxDay);

    setDraft(
      normalizeDateForMode(
        moment()
          .year(targetYear)
          .month(targetMonth)
          .date(targetDay)
          .startOf('day'),
        mode
      )
    );
  };

  const getWheelDate = () => {
    const selectedYear = yearWheelRef.current?.getValue() ?? year;
    const selectedMonth =
      mode === 'day' || mode === 'month'
        ? monthWheelRef.current?.getValue() ?? month
        : month;
    const selectedDay =
      mode === 'day'
        ? dayWheelRef.current?.getValue() ?? draft.date()
        : draft.date();
    const targetMonth =
      selectedYear === today.year()
        ? Math.min(selectedMonth, today.month())
        : selectedMonth;
    const daysInTargetMonth = moment()
      .year(selectedYear)
      .month(targetMonth)
      .daysInMonth();
    const targetMaxDay =
      selectedYear === today.year() && targetMonth === today.month()
        ? today.date()
        : daysInTargetMonth;

    return moment()
      .year(selectedYear)
      .month(targetMonth)
      .date(clamp(selectedDay, 1, targetMaxDay))
      .startOf('day');
  };

  const handleConfirm = () => {
    onConfirm(normalizeDateForMode(getWheelDate(), mode));
  };

  const titleMap = {
    day: '快速切换日期',
    month: '快速切换月份',
    year: '快速切换年份',
  };
  const scrollKey = visible ? normalizedInitial.format('YYYY-MM-DD') : 'closed';

  return (
    <BaseModal
      visible={visible}
      onRequestClose={onCancel}
      placement="bottom"
      panelStyle={styles.panel}
    >
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={onCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </Pressable>
        <Text style={styles.title}>{titleMap[mode]}</Text>
        <Pressable style={styles.headerButton} onPress={handleConfirm}>
          <Text style={styles.confirmText}>确定</Text>
        </Pressable>
      </View>

      <View style={styles.wheels}>
        <WheelColumn
          ref={yearWheelRef}
          data={years}
          value={year}
          scrollKey={scrollKey}
          labelFormatter={(item) => `${item}年`}
          onChange={(item) => updateDraft(item, undefined, undefined)}
        />
        {(mode === 'day' || mode === 'month') && (
          <WheelColumn
            ref={monthWheelRef}
            data={months}
            value={month}
            scrollKey={scrollKey}
            labelFormatter={(item) => `${item + 1}月`}
            onChange={(item) => updateDraft(undefined, item, undefined)}
          />
        )}
        {mode === 'day' && (
          <WheelColumn
            ref={dayWheelRef}
            data={days}
            value={draft.date()}
            scrollKey={scrollKey}
            labelFormatter={(item) => `${item}日`}
            onChange={(item) => updateDraft(undefined, undefined, item)}
          />
        )}
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingBottom: 24,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    minWidth: 56,
    minHeight: 44,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  confirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
  wheels: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    paddingHorizontal: 18,
  },
  wheelColumn: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 18,
    color: '#777',
  },
  selectedWheelItemText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectionFrame: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d8e8ff',
  },
});

export default DateQuickPickerModal;
