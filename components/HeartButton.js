// The app's heart: filled red when saved, grey outline when not, with a small pop when it fills.
// Used on spot cards and, inside a round badge, on collection cards.
import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getReduceMotion } from '../hooks/useReduceMotion';
import { colors } from './theme';

export function popHeart(scale) {
  if (getReduceMotion()) return;
  Animated.sequence([
    Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, speed: 40, bounciness: 0 }),
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 8 }),
  ]).start();
}

export default function HeartButton({ saved, onPress, label, size = 23, idleColor = colors.heartIdle, style, hitSlop = 11 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (!saved) popHeart(scale);
    onPress?.();
  };
  return (
    <TouchableOpacity style={style} hitSlop={hitSlop} onPress={press}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!saved }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={saved ? 'favorite' : 'favorite-border'} size={size} color={saved ? colors.heart : idleColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}
