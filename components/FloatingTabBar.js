import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { selectionAsync } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import useReduceMotion from '../hooks/useReduceMotion';
import { FLOATING_BAR_HEIGHT, useFloatingNavigationLayout } from '../navigation/floatingNavigationLayout';
import pressTab from '../navigation/pressTab';

const PILL_INSET = 7;
const SLOT_WIDTH = 84;
const ICON_COLOR = '#333333';

function useBlurEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let subscribed = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', reduced => {
      changed = true;
      setEnabled(!reduced);
    });
    AccessibilityInfo.isReduceTransparencyEnabled().then(reduced => {
      if (subscribed && !changed) setEnabled(!reduced);
    }).catch(() => {});
    return () => {
      subscribed = false;
      listener.remove();
    };
  }, []);
  return enabled;
}

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
            {blurEnabled && <BlurView intensity={42} tint="light" style={StyleSheet.absoluteFillObject} />}
            <LinearGradient
              colors={blurEnabled
                ? ['rgba(255, 250, 240, 0.87)', 'rgba(252, 231, 205, 0.60)', 'rgba(255, 246, 233, 0.81)']
                : ['#FFFAF0', '#FAECD9', '#FFF5E4']}
              start={{ x: 0.14, y: 0 }}
              end={{ x: 0.86, y: 1 }}
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
