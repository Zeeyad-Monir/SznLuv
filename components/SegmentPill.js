// A two- or three-way switch that looks like a small sibling of the floating tab bar:
// a soft capsule with a highlight that slides to the chosen option.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import useReduceMotion from '../hooks/useReduceMotion';
import { colors } from './theme';

const INSET = 4;

export default function SegmentPill({ options, value, onChange, style }) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const slotWidth = width ? (width - 2 * INSET) / options.length : 0;
  const highlightX = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!slotWidth) return undefined;
    const toValue = selectedIndex * slotWidth;
    // The first placement, and every one under Reduce Motion, is immediate.
    if (reduceMotion || !placed.current) {
      placed.current = true;
      highlightX.setValue(toValue);
      return undefined;
    }
    const animation = Animated.spring(highlightX, { toValue, stiffness: 340, damping: 31, mass: 0.85, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [highlightX, reduceMotion, selectedIndex, slotWidth]);

  const select = option => {
    if (option.value === value) return;
    if (Platform.OS === 'ios') selectionAsync().catch(() => {});
    onChange(option.value);
  };

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {!!slotWidth && (
        <Animated.View pointerEvents="none"
          style={[styles.highlight, { width: slotWidth, transform: [{ translateX: highlightX }] }]} />
      )}
      {options.map(option => (
        <TouchableOpacity key={option.value} style={styles.option} activeOpacity={0.65}
          accessibilityRole="tab" accessibilityLabel={option.label}
          accessibilityState={{ selected: option.value === value }} onPress={() => select(option)}>
          <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 44, borderRadius: 22, padding: INSET, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.segmentTrack,
  },
  highlight: {
    position: 'absolute', left: INSET, top: INSET, bottom: INSET, borderRadius: 18,
    backgroundColor: colors.segmentHighlight, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.segmentRim,
  },
  option: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600' },
});
