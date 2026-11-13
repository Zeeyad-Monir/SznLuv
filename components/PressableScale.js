// A card that dips slightly while it is pressed. `style` sizes the card (and holds any shadow);
// `contentStyle` is the pressable surface inside it, which is where rounded corners clip the art.
import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { getReduceMotion } from '../hooks/useReduceMotion';

const PRESSED_SCALE = 0.97;

export default function PressableScale({ style, contentStyle, children, onPressIn, onPressOut, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = toValue => {
    if (getReduceMotion()) return;
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={0.9} accessibilityRole="button" {...props} style={[styles.surface, contentStyle]}
        onPressIn={event => { springTo(PRESSED_SCALE); onPressIn?.(event); }}
        onPressOut={event => { springTo(1); onPressOut?.(event); }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: { flexGrow: 1 },
});
