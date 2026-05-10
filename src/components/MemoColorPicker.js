import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

const CHANNELS = [
  { key: 'R', color: '#FF3B30' },
  { key: 'G', color: '#34C759' },
  { key: 'B', color: '#007AFF' },
];

const getRgbParts = (hexColor) => [
  parseInt(hexColor.slice(1, 3), 16),
  parseInt(hexColor.slice(3, 5), 16),
  parseInt(hexColor.slice(5, 7), 16),
];

const buildHexColor = (parts) =>
  `#${parts.map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0').toUpperCase()).join('')}`;

const RgbSlider = ({ label, value, color, onChange }) => {
  const [trackWidth, setTrackWidth] = useState(1);
  const trackRef = useRef(null);
  const trackXRef = useRef(0);

  const measureTrack = (afterMeasure) => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackXRef.current = x;
      setTrackWidth(Math.max(1, width));
      if (typeof afterMeasure === 'function') afterMeasure();
    });
  };

  const updateFromPageX = (pageX) => {
    const localX = pageX - trackXRef.current;
    const next = Math.round(Math.max(0, Math.min(trackWidth, localX)) / trackWidth * 255);
    onChange(next);
  };
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        measureTrack(() => updateFromPageX(event.nativeEvent.pageX));
      },
      onPanResponderMove: (_event, gestureState) => updateFromPageX(gestureState.moveX),
    }),
    [trackWidth, onChange]
  );
  const knobSize = 24;
  const knobTravel = Math.max(1, trackWidth - knobSize);
  const knobLeft = Math.max(0, Math.min(knobTravel, value / 255 * knobTravel));
  const fillWidth = Math.max(0, knobLeft + knobSize / 2);

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View
        ref={trackRef}
        style={styles.sliderTrackWrap}
        onLayout={measureTrack}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrack} />
        <View style={[styles.sliderFill, { width: fillWidth, backgroundColor: color }]} />
        <View style={[styles.sliderKnob, { left: knobLeft }]} />
      </View>
      <Text style={styles.sliderValue}>{value}</Text>
    </View>
  );
};

const MemoColorPicker = ({ value, onChange }) => {
  const rgbParts = getRgbParts(value);

  const handleChannelChange = (index, next) => {
    const nextParts = [...rgbParts];
    nextParts[index] = next;
    onChange(buildHexColor(nextParts));
  };

  return (
    <View>
      <View style={styles.colorPreviewRow}>
        <View style={[styles.colorPreview, { backgroundColor: value }]} />
        <Text style={styles.hexText}>{value}</Text>
      </View>
      {CHANNELS.map((channel, index) => (
        <RgbSlider
          key={channel.key}
          label={channel.key}
          value={rgbParts[index]}
          color={channel.color}
          onChange={(next) => handleChannelChange(index, next)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  colorPreviewRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    marginRight: 10,
  },
  hexText: {
    color: '#333',
    fontWeight: '600',
  },
  sliderRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sliderLabel: {
    width: 22,
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  sliderTrackWrap: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
  },
  sliderKnob: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    top: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  sliderValue: {
    width: 34,
    textAlign: 'right',
    fontSize: 13,
    color: '#555',
  },
});

export default MemoColorPicker;
