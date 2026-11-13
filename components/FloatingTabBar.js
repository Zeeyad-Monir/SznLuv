import React, { useLayoutEffect, useRef } from 'react';
import {
  Animated, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { selectionAsync } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import useBlurEnabled from '../hooks/useBlurEnabled';
import useReduceMotion from '../hooks/useReduceMotion';
import { FLOATING_BAR_HEIGHT, useFloatingNavigationLayout } from '../navigation/floatingNavigationLayout';
import pressTab from '../navigation/pressTab';
import { glass } from './theme';

const PILL_INSET = 7;
const SLOT_WIDTH = 84;
const ICON_COLOR = '#333333';

export default function FloatingTabBar({ state, navigation, insets, items }) {
  const { width } = useWindowDimensions();
  const { visible, bottom } = useFloatingNavigationLayout();
  const reduceMotion = useReduceMotion();
  const blurEnabled = useBlurEnabled();
  const activeRoute = state.routes[state.index].name;
  const selectedIndex = items.findIndex(item => item.route === activeRoute);
  const sideGap = 16 + Math.max(insets.left, insets.right);
  const slotWidth = Math.min(SLOT_WIDTH, (width - 2 * (sideGap + PILL_INSET)) / items.length);
  const highlightX = useRef(new Animated.Value(Math.max(0, selectedIndex) * slotWidth)).current;
  const previousIndex = useRef(selectedIndex);
  const previousSlotWidth = useRef(slotWidth);

  useLayoutEffect(() => {
    const wasSelected = previousIndex.current >= 0;
    const resized = previousSlotWidth.current !== slotWidth;
    previousIndex.current = selectedIndex;
    previousSlotWidth.current = slotWidth;
    if (selectedIndex < 0) return;

    const toValue = selectedIndex * slotWidth;
    if (reduceMotion || !visible || !wasSelected || resized) {
      highlightX.setValue(toValue);
      return;
    }
    const animation = Animated.spring(highlightX, {
      toValue,
      stiffness: 340,
      damping: 31,
      mass: 0.85,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [highlightX, reduceMotion, selectedIndex, slotWidth, visible]);

  if (!visible || !items.length) return null;

  const select = ({ route, returnToRoot }) => {
    if (pressTab(state, navigation, route, { returnToRoot }) && Platform.OS === 'ios') {
      selectionAsync().catch(() => {});
    }
  };

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View style={styles.shadow}>
        <View style={[styles.pill, !blurEnabled && styles.opaque]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            {blurEnabled && <BlurView intensity={glass.blur} tint="light" style={StyleSheet.absoluteFillObject} />}
            <LinearGradient
              colors={blurEnabled ? glass.colors : glass.opaque}
              start={glass.start}
              end={glass.end}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[StyleSheet.absoluteFillObject, styles.rim]} />
          </View>
          {selectedIndex >= 0 && (
            <Animated.View pointerEvents="none" style={[
              styles.highlight,
              { width: slotWidth - 8, transform: [{ translateX: highlightX }] },
            ]} />
          )}
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.route}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityHint={item.hint}
              accessibilityState={{ selected: index === selectedIndex }}
              activeOpacity={0.65}
              onPress={() => select(item)}
              style={[styles.item, { width: slotWidth }]}
            >
              {item.renderIcon({ selected: index === selectedIndex, color: ICON_COLOR })}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  shadow: {
    borderRadius: FLOATING_BAR_HEIGHT / 2,
    shadowColor: '#62472D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 13,
    elevation: 5,
  },
  pill: {
    height: FLOATING_BAR_HEIGHT,
    paddingHorizontal: PILL_INSET,
    borderRadius: FLOATING_BAR_HEIGHT / 2,
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    overflow: 'hidden',
  },
  opaque: {
    backgroundColor: '#FFF5E4',
  },
  rim: {
    borderRadius: FLOATING_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.90)',
  },
  highlight: {
    position: 'absolute',
    left: PILL_INSET + 4,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 252, 247, 0.83)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(157, 118, 77, 0.26)',
  },
  item: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
