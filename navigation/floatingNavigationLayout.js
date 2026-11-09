import React, { createContext, useContext, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FLOATING_BAR_HEIGHT = 58;
const FLOATING_BAR_GAP = 12;
const CONTENT_GAP = 12;
const FloatingNavigationLayout = createContext({ visible: true, bottom: FLOATING_BAR_GAP, clearance: 0 });

export function FloatingNavigationLayoutProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const bottom = insets.bottom + FLOATING_BAR_GAP;
  return (
    <FloatingNavigationLayout.Provider value={{
      visible: !keyboardVisible,
      bottom,
      clearance: keyboardVisible ? 0 : bottom + FLOATING_BAR_HEIGHT + CONTENT_GAP,
    }}>
      {children}
    </FloatingNavigationLayout.Provider>
  );
}

export const useFloatingNavigationLayout = () => useContext(FloatingNavigationLayout);
export const useFloatingNavClearance = () => useFloatingNavigationLayout().clearance;

export function useFloatingScrollStyle(style) {
  const clearance = useFloatingNavClearance();
  if (!clearance) return style;

  const { paddingBottom, paddingVertical, padding } = StyleSheet.flatten(style) ?? {};
  return [style, { paddingBottom: (paddingBottom ?? paddingVertical ?? padding ?? 0) + clearance }];
}
