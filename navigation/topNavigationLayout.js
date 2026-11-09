import React, { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';

export const TopNavigationHeightContext = createContext(0);

// The surface fills the screen behind the header while its content starts below it.
export function SignedInScreen({ style, ...props }) {
  const headerHeight = useContext(TopNavigationHeightContext);
  if (!headerHeight) return <View {...props} style={style} />;

  const { paddingTop, paddingVertical, padding } = StyleSheet.flatten(style) ?? {};
  return <View {...props} style={[style, { paddingTop: (paddingTop ?? paddingVertical ?? padding ?? 0) + headerHeight }]} />;
}
