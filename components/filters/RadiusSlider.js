// The distance slider: 1 to 200 km, the chosen value shown above it as it moves.
// Drag or tap the track; the − and + buttons step one stop for small changes and reach both ends exactly.
// VoiceOver and TalkBack adjust it with a swipe up or down, and Full Keyboard Access with the same actions.
import React, { useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import { RADIUS_MAX, RADIUS_MIN, radiusAt, radiusPosition, stepRadius } from '../../services/spotDiscovery';
import { colors } from '../theme';

const THUMB = 28;
const spoken = km => `${km} ${km === 1 ? 'kilometre' : 'kilometres'}`;

function Stepper({ icon, label, disabled, onPress }) {
  return (
    <TouchableOpacity style={[styles.step, disabled && styles.stepDisabled]} accessibilityRole="button"
      accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.ink} />
    </TouchableOpacity>
  );
}

export default function RadiusSlider({ value, onChange, disabled = false }) {
  const [width, setWidth] = useState(0);
  // The handlers below are made once, so they read the latest props and size through this ref.
  const latest = useRef({});
  latest.current = { value, onChange, disabled, width };
  const trackLeft = useRef(0);

  const choose = km => {
    const current = latest.current;
    if (current.disabled || km === current.value) return;
    if (Platform.OS === 'ios') selectionAsync().catch(() => {});
    current.onChange(km);
  };
  const chooseAt = x => {
    const usable = latest.current.width - THUMB;
    if (usable > 0) choose(radiusAt((x - THUMB / 2) / usable));
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !latest.current.disabled,
    onMoveShouldSetPanResponder: () => !latest.current.disabled,
    // Keep the drag once it starts, so the sheet's scroll view doesn't take it over.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: ({ nativeEvent }) => {
      trackLeft.current = nativeEvent.pageX - nativeEvent.locationX;
      chooseAt(nativeEvent.locationX);
    },
    onPanResponderMove: (_, gesture) => chooseAt(gesture.moveX - trackLeft.current),
  })).current;

  const position = radiusPosition(value);
  const thumbLeft = Math.max(0, width - THUMB) * position;
  const atMin = value <= RADIUS_MIN;
  const atMax = value >= RADIUS_MAX;

  return (
    <View style={[styles.slider, disabled && styles.dimmed]}>
      <Text style={styles.value} accessible={false} importantForAccessibility="no-hide-descendants">
        Within <Text style={styles.number}>{value} km</Text>
      </Text>
      <View style={styles.row}>
        <Stepper icon="remove" label="Decrease distance" disabled={disabled || atMin} onPress={() => choose(stepRadius(value, -1))} />
        <View style={styles.track} testID="radius-slider" {...responder.panHandlers}
          onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
          accessible accessibilityRole="adjustable" accessibilityLabel="Distance"
          accessibilityHint="Distances are measured in a straight line."
          accessibilityState={{ disabled }}
          accessibilityValue={{ min: RADIUS_MIN, max: RADIUS_MAX, now: value, text: spoken(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'increment') choose(stepRadius(latest.current.value, 1));
            if (nativeEvent.actionName === 'decrement') choose(stepRadius(latest.current.value, -1));
          }}>
          <View pointerEvents="none" style={styles.rail}>
            <View style={[styles.fill, { width: thumbLeft }]} />
          </View>
          <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} />
        </View>
        <Stepper icon="add" label="Increase distance" disabled={disabled || atMax} onPress={() => choose(stepRadius(value, 1))} />
      </View>
      <View style={styles.ends} accessible={false} importantForAccessibility="no-hide-descendants">
        <Text style={styles.end}>{RADIUS_MIN} km</Text>
        <Text style={styles.end}>{RADIUS_MAX} km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slider: { gap: 4 },
  dimmed: { opacity: 0.5 },
  value: { fontSize: 15, color: colors.muted, fontWeight: '500' },
  number: { fontSize: 22, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.optionBorder,
  },
  stepDisabled: { opacity: 0.4 },
  track: { flex: 1, height: 44, justifyContent: 'center' },
  rail: {
    position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: 6, borderRadius: 3,
    backgroundColor: colors.track, overflow: 'hidden',
  },
  fill: { height: 6, backgroundColor: colors.ink },
  thumb: {
    position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
  // Under the ends of the rail: past the 44pt stepper, its 6pt gap and half the thumb, less half a label.
  ends: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 50 + THUMB / 2 - 14 },
  end: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
