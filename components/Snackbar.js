// One short message at the bottom of the signed-in app, with an optional action such as Undo.
// It replaces blocking alerts for things that already happened: saved, following, couldn't save.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getReduceMotion } from '../hooks/useReduceMotion';
import { useFloatingNavClearance } from '../navigation/floatingNavigationLayout';
import { colors } from './theme';

const PLAIN_MS = 4000;
const ACTION_MS = 6000; // Longer, so there is time to reach Undo
const RISE = 12;
const MIN_BOTTOM = 24;
const KEYBOARD_GAP = 12;

const SnackbarContext = createContext({ show() {}, hide() {} });
export const useSnackbar = () => useContext(SnackbarContext);

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => setHeight(event?.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export function SnackbarProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const lastId = useRef(0);
  const clearance = useFloatingNavClearance();
  const keyboardHeight = useKeyboardHeight();

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    const id = lastId.current;
    // A newer message may have arrived while this one was leaving; only the one that left is cleared.
    const finish = () => setCurrent(shown => (shown?.id === id ? null : shown));
    if (getReduceMotion()) return finish();
    Animated.timing(progress, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(finish);
  }, [progress]);

  const show = useCallback(({ message, actionLabel, onAction, duration }) => {
    clearTimeout(timer.current);
    lastId.current += 1;
    setCurrent({ id: lastId.current, message, actionLabel, onAction });
    AccessibilityInfo.announceForAccessibility?.(message);
    if (getReduceMotion()) {
      progress.setValue(1);
    } else {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    timer.current = setTimeout(hide, duration ?? (actionLabel ? ACTION_MS : PLAIN_MS));
  }, [hide, progress]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);
  // Above the tab pill, or just above the keyboard when the pill has hidden for it.
  const bottom = keyboardHeight ? keyboardHeight + KEYBOARD_GAP : Math.max(MIN_BOTTOM, clearance);

  return (
    <SnackbarContext.Provider value={value}>
      <View style={styles.fill}>
        {children}
        {current && (
          <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
            <Animated.View
              testID="snackbar"
              style={[styles.bar, {
                opacity: progress,
                transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) }],
              }]}
            >
              <Text style={styles.message} accessibilityLiveRegion="polite">{current.message}</Text>
              {!!current.actionLabel && (
                <TouchableOpacity
                  style={styles.action}
                  accessibilityRole="button"
                  onPress={() => {
                    const { onAction } = current;
                    hide();
                    onAction?.();
                  }}
                >
                  <Text style={styles.actionText}>{current.actionLabel}</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        )}
      </View>
    </SnackbarContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dock: { position: 'absolute', left: 20, right: 20, alignItems: 'center', zIndex: 20 },
  bar: {
    maxWidth: 520, minHeight: 48, flexDirection: 'row', alignItems: 'center',
    paddingLeft: 16, paddingRight: 4, borderRadius: 12, backgroundColor: colors.snackbar,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  message: { flexShrink: 1, paddingVertical: 12, paddingRight: 12, color: colors.white, fontSize: 15, lineHeight: 20 },
  action: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  actionText: { color: colors.snackbarAction, fontSize: 15, fontWeight: '700' },
});
