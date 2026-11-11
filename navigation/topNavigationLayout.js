import React, { createContext, useContext } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

export const TopNavigationHeightContext = createContext(0);
export const SCREEN_CONTENT_TOP_GAP = 20;

// The surface fills the screen behind the header while its content starts below it.
export function SignedInScreen({ style, ...props }) {
  const headerHeight = useContext(TopNavigationHeightContext);
  const { fontScale } = useWindowDimensions();
  // Re-measure native text when Dynamic Type changes while this screen is mounted.
  if (!headerHeight) return <View key={fontScale} {...props} style={style} />;

  const { paddingTop, paddingVertical, padding } = StyleSheet.flatten(style) ?? {};
  return <View key={fontScale} {...props} style={[style, { paddingTop: (paddingTop ?? paddingVertical ?? padding ?? 0) + headerHeight }]} />;
}
