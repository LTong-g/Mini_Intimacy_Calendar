// StatsTable.js
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const MONTH_LABEL_PATTERN = /^\d{1,2}月$/;
const YEAR_MONTH_LABEL_PATTERN = /^(\d{4})年(\d{1,2})月$/;

const unique = (items) => Array.from(new Set(items));

const isMonthLabel = (label) => (
  typeof label === 'string' && MONTH_LABEL_PATTERN.test(label)
);

const getYearMonthSegments = (label) => {
  const match = typeof label === 'string' ? label.match(YEAR_MONTH_LABEL_PATTERN) : null;
  if (!match) return null;

  return {
    yearNumber: match[1],
    yearUnit: '年',
    monthNumber: match[2],
    monthUnit: '月',
  };
};

const maxMeasuredWidth = (items, measurements, getKey) =>
  items.reduce((maxWidth, item) => Math.max(maxWidth, measurements[getKey(item)] || 0), 0);

const LabelPart = ({ width = 0, children }) => (
  <View style={[styles.labelPart, width > 0 && { width }]}>
    <Text style={styles.labelText}>{children}</Text>
  </View>
);

const LabelCell = ({
  label,
  header = false,
  yearMonthWidths = {},
  monthLabelWidth = 0,
}) => {
  const yearMonthSegments = getYearMonthSegments(label);

  if (isMonthLabel(label)) {
    return (
      <View style={styles.cellLabel}>
        <Text
          style={[
            styles.labelText,
            styles.monthLabelText,
            monthLabelWidth > 0 && { width: monthLabelWidth },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  if (yearMonthSegments) {
    return (
      <View style={styles.cellLabel}>
        <View style={styles.yearMonthLabelBlock}>
          <LabelPart width={yearMonthWidths.yearNumber}>
            {yearMonthSegments.yearNumber}
          </LabelPart>
          <LabelPart width={yearMonthWidths.yearUnit}>
            {yearMonthSegments.yearUnit}
          </LabelPart>
          <LabelPart width={yearMonthWidths.monthNumber}>
            {yearMonthSegments.monthNumber}
          </LabelPart>
          <LabelPart width={yearMonthWidths.monthUnit}>
            {yearMonthSegments.monthUnit}
          </LabelPart>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cellLabel}>
      <Text style={[styles.labelText, header && styles.headerText]}>{label}</Text>
    </View>
  );
};

const StatsTable = ({ rows }) => {
  const [yearMonthMeasurements, setYearMonthMeasurements] = useState({});
  const [monthLabelMeasurements, setMonthLabelMeasurements] = useState({});

  const yearMonthItems = useMemo(() => {
    const labels = unique(
      rows
        .map((row) => row.label)
        .filter((label) => getYearMonthSegments(label))
    );

    return labels.map((label) => ({
      label,
      ...getYearMonthSegments(label),
    }));
  }, [rows]);

  const monthLabels = useMemo(
    () => unique(rows.map((row) => row.label).filter(isMonthLabel)),
    [rows]
  );

  const yearMonthWidths = useMemo(
    () => ({
      yearNumber: maxMeasuredWidth(
        yearMonthItems,
        yearMonthMeasurements,
        (item) => `yearNumber:${item.yearNumber}`
      ),
      yearUnit: yearMonthMeasurements['yearUnit:年'] || 0,
      monthNumber: maxMeasuredWidth(
        yearMonthItems,
        yearMonthMeasurements,
        (item) => `monthNumber:${item.monthNumber}`
      ),
      monthUnit: yearMonthMeasurements['monthUnit:月'] || 0,
    }),
    [yearMonthItems, yearMonthMeasurements]
  );

  const monthLabelWidth = useMemo(
    () => maxMeasuredWidth(monthLabels, monthLabelMeasurements, (label) => `month:${label}`),
    [monthLabels, monthLabelMeasurements]
  );

  const handleYearMonthLayout = useCallback((key, width) => {
    setYearMonthMeasurements((prev) => {
      if (Math.abs((prev[key] || 0) - width) < 0.5) return prev;
      return { ...prev, [key]: width };
    });
  }, []);

  const handleMonthLabelLayout = useCallback((label, width) => {
    setMonthLabelMeasurements((prev) => {
      const key = `month:${label}`;
      if (Math.abs((prev[key] || 0) - width) < 0.5) return prev;
      return { ...prev, [key]: width };
    });
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.measurementLayer} pointerEvents="none">
        {monthLabels.map((label) => (
          <Text
            key={`month:${label}`}
            style={[styles.labelText, styles.measurementText]}
            onLayout={(event) => {
              handleMonthLabelLayout(label, event.nativeEvent.layout.width);
            }}
          >
            {label}
          </Text>
        ))}
        {yearMonthItems.map((item) => (
          <React.Fragment key={item.label}>
            <Text
              style={[styles.labelText, styles.measurementText]}
              onLayout={(event) => {
                handleYearMonthLayout(
                  `yearNumber:${item.yearNumber}`,
                  event.nativeEvent.layout.width
                );
              }}
            >
              {item.yearNumber}
            </Text>
            <Text
              style={[styles.labelText, styles.measurementText]}
              onLayout={(event) => {
                handleYearMonthLayout('yearUnit:年', event.nativeEvent.layout.width);
              }}
            >
              {item.yearUnit}
            </Text>
            <Text
              style={[styles.labelText, styles.measurementText]}
              onLayout={(event) => {
                handleYearMonthLayout(
                  `monthNumber:${item.monthNumber}`,
                  event.nativeEvent.layout.width
                );
              }}
            >
              {item.monthNumber}
            </Text>
            <Text
              style={[styles.labelText, styles.measurementText]}
              onLayout={(event) => {
                handleYearMonthLayout('monthUnit:月', event.nativeEvent.layout.width);
              }}
            >
              {item.monthUnit}
            </Text>
          </React.Fragment>
        ))}
      </View>

      <View style={[styles.row, styles.header]}>
        <LabelCell label="日期" header />
        <Text style={styles.cell}>观看教程</Text>
        <Text style={styles.cell}>武器强化</Text>
        <Text style={styles.cell}>双人练习</Text>
      </View>

      {rows.map((row, idx) => (
        <View key={idx} style={styles.row}>
          <LabelCell
            label={row.label}
            yearMonthWidths={yearMonthWidths}
            monthLabelWidth={monthLabelWidth}
          />
          <Text style={styles.cell}>{row.tutorial}</Text>
          <Text style={styles.cell}>{row.weapon}</Text>
          <Text style={styles.cell}>{row.duo}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
  },
  header: {
    borderBottomWidth: 1,
    backgroundColor: '#f0f0f0',
  },
  cellLabel: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerText: {
    fontWeight: 'bold',
  },
  measurementLayer: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  measurementText: {
    alignSelf: 'flex-start',
  },
  monthLabelText: {
    textAlign: 'right',
  },
  yearMonthLabelBlock: {
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelPart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: '#333',
  },
});

export default StatsTable;
