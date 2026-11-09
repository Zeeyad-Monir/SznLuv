import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, findNodeHandle, Keyboard, KeyboardAvoidingView,
  Modal, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useReduceMotion from '../hooks/useReduceMotion';
import SheetHeader from './SheetHeader';

export function focusAccessibility(element) {
  const tag = findNodeHandle(element);
  if (tag != null) AccessibilityInfo.setAccessibilityFocus(tag);
}

export default function DiscoveryBottomSheet({ title, onClosing, onDismiss, children }) {
  const { height } = useWindowDimensions();
  const { top, left, right } = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [availableHeight, setAvailableHeight] = useState(height);
  const isClosing = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const heading = useRef(null);

  const dismiss = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;
    onClosing();
    setClosing(true);
    Keyboard.dismiss();
    if (reduceMotion) {
      setVisible(false);
      return;
    }
    const config = { toValue: 0, duration: 190, easing: Easing.in(Easing.quad), useNativeDriver: true };
    Animated.parallel([Animated.timing(progress, config), Animated.timing(drag, config)])
      .start(({ finished }) => { if (finished) setVisible(false); });
  }, [drag, onClosing, progress, reduceMotion]);

  const show = () => {
    if (isClosing.current) return;
    if (reduceMotion) {
      progress.setValue(1);
      focusAccessibility(heading.current);
      return;
    }
    Animated.timing(progress, {
      toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(({ finished }) => { if (finished && !isClosing.current) focusAccessibility(heading.current); });
  };

  useEffect(() => {
    if (visible || Platform.OS === 'ios') return;
    const frame = requestAnimationFrame(onDismiss);
    return () => cancelAnimationFrame(frame);
  }, [onDismiss, visible]);

  const pan = useMemo(() => {
    const settle = () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !isClosing.current,
      onPanResponderMove: (_, { dy }) => { if (!reduceMotion) drag.setValue(Math.max(0, dy)); },
      onPanResponderRelease: (_, { dx, dy, vy }) => {
        if (dy > Math.abs(dx) && (dy > 64 || (dy > 16 && vy > 0.75))) dismiss();
        else if (!reduceMotion) settle();
      },
      onPanResponderTerminate: () => { if (!isClosing.current && !reduceMotion) settle(); },
    });
  }, [dismiss, drag, reduceMotion]);

  const sheetHeight = Math.min(Math.round(height * 0.75), availableHeight);
  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent
      onRequestClose={dismiss} onShow={show} onDismiss={onDismiss} testID="spot-filter-modal">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.scrim, { opacity: progress }]} />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss}
        accessible={false} importantForAccessibility="no" testID="spot-filter-backdrop" />
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: top + 8, paddingLeft: left, paddingRight: right }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents={closing ? 'none' : 'box-none'}
      >
        <View style={styles.layout} pointerEvents="box-none"
          onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}>
          <Animated.View
            style={[styles.panel, { height: sheetHeight, transform: [{ translateY: Animated.add(slide, drag) }] }]}
            accessibilityViewIsModal
            onAccessibilityEscape={dismiss}
          >
            <SheetHeader title={title} closeLabel="Close filters" onClose={dismiss} titleRef={heading} />
            <View style={styles.handleTouchArea} {...pan.panHandlers} accessible={false} testID="spot-filter-handle">
              <View style={styles.handle} />
            </View>
            {children(dismiss)}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(22, 19, 16, 0.44)' },
  container: { flex: 1 },
  layout: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  panel: {
    width: '100%', maxWidth: 560, backgroundColor: '#fff', paddingHorizontal: 20,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden',
  },
  handleTouchArea: {
    position: 'absolute', top: 0, alignSelf: 'center', width: 112, height: 28, alignItems: 'center',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D0CAC3', marginTop: 9 },
});
