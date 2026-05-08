import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BaseModal from './modals/BaseModal';
import ModalActionRow from './modals/ModalActionRow';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const DEFAULT_MAX_COUNT = 999;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildRange = (min, max) => {
  const result = [];
  for (let value = min; value <= max; value += 1) result.push(value);
  return result;
};

const CountWheel = forwardRef(({ data, value, onChange, scrollKey }, ref) => {
  const listRef = useRef(null);
  const previousPositionKeyRef = useRef('');
  const offsetRef = useRef(0);
  const selectedIndex = Math.max(0, data.indexOf(value));
  const selectedOffset = selectedIndex * ITEM_HEIGHT;
  const dataKey = `${data[0] ?? 0}-${data[data.length - 1] ?? 0}-${data.length}`;
  const positionKey = `${scrollKey}-${dataKey}`;
  const snapOffsets = useMemo(
    () => data.map((item, index) => index * ITEM_HEIGHT),
    [data]
  );

  useEffect(() => {
    if (!listRef.current || data.length === 0) return;
    if (previousPositionKeyRef.current === positionKey) return;
    previousPositionKeyRef.current = positionKey;
    offsetRef.current = selectedOffset;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
      });
      offsetRef.current = selectedOffset;
    });
  }, [data, positionKey, selectedIndex, selectedOffset]);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      if (previousPositionKeyRef.current !== positionKey) return data[selectedIndex];
      const index = clamp(Math.round(offsetRef.current / ITEM_HEIGHT), 0, data.length - 1);
      return data[index];
    },
  }), [data, positionKey, selectedIndex]);

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
          onChange?.(data[clamp(Math.round(offsetRef.current / ITEM_HEIGHT), 0, data.length - 1)]);
        }}
        onScrollEndDrag={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
          onChange?.(data[clamp(Math.round(offsetRef.current / ITEM_HEIGHT), 0, data.length - 1)]);
        }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.wheelItem}
            onPress={() => {
              const index = data.indexOf(item);
              if (index < 0) return;
              offsetRef.current = index * ITEM_HEIGHT;
              listRef.current?.scrollToIndex({ index, animated: true });
              onChange?.(item);
            }}
          >
            <Text style={[
              styles.wheelItemText,
              item === value && styles.selectedWheelItemText,
            ]}>
              {item}
            </Text>
          </Pressable>
        )}
      />
      <View pointerEvents="none" style={styles.selectionFrame} />
    </View>
  );
});

const CountAdjustModal = ({
  visible,
  title = '编辑次数',
  value,
  onChangeValue,
  onConfirm,
  onCancel,
  minValue = 0,
  maxValue = DEFAULT_MAX_COUNT,
}) => {
  const wheelRef = useRef(null);
  const numericMin = Math.max(0, Math.floor(Number(minValue) || 0));
  const rawValue = Math.floor(Number(value) || 0);
  const numericMax = Math.max(numericMin, Math.floor(Number(maxValue) || DEFAULT_MAX_COUNT));
  const selectedValue = clamp(rawValue, numericMin, numericMax);
  const values = useMemo(
    () => buildRange(numericMin, numericMax),
    [numericMin, numericMax]
  );
  const scrollKey = visible ? `${numericMin}-${numericMax}-${selectedValue}` : 'closed';

  useEffect(() => {
    if (visible && selectedValue !== rawValue) {
      onChangeValue(String(selectedValue));
    }
  }, [onChangeValue, rawValue, selectedValue, visible]);

  const handleConfirm = () => {
    const selected = wheelRef.current?.getValue() ?? selectedValue;
    onChangeValue(String(selected));
    onConfirm(selected);
  };

  return (
    <BaseModal
      visible={visible}
      onRequestClose={onCancel}
      title={title}
      panelStyle={styles.card}
      titleStyle={styles.title}
    >
      <CountWheel
        ref={wheelRef}
        data={values}
        value={selectedValue}
        scrollKey={scrollKey}
        onChange={(nextValue) => onChangeValue(String(nextValue))}
      />
      <ModalActionRow
        style={styles.actions}
        buttonStyle={styles.actionButton}
        textStyle={styles.actionText}
        actions={[
          { label: '取消', variant: 'secondary', onPress: onCancel, flex: true },
          { label: '确认', onPress: handleConfirm, flex: true },
        ]}
      />
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  wheelColumn: {
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  selectionFrame: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d8e8ff',
  },
  actions: {
    gap: 12,
    marginTop: 18,
  },
  actionButton: {
    borderRadius: 10,
    minHeight: 44,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CountAdjustModal;
