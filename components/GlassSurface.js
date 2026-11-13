// The floating tab bar's warm frosted glass, for buttons and capsules that sit over the page.
// Glass is for controls only; content cards stay solid.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from './PressableScale';
import useBlurEnabled from '../hooks/useBlurEnabled';
import { glass } from './theme';

const BUTTON_HEIGHT = 48;

// Fills its parent (which clips to its own corners) with the glass layers.
export function GlassSurface({ radius }) {
  const blurEnabled = useBlurEnabled();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {blurEnabled && <BlurView intensity={glass.blur} tint="light" style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={blurEnabled ? glass.colors : glass.opaque} start={glass.start} end={glass.end}
        style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: radius }]} />
    </View>
  );
}

// A 48pt glass control: a pill that grows to fill its row, or a round icon button (`round`).
export function GlassButton({ round = false, style, children, ...props }) {
  const radius = BUTTON_HEIGHT / 2;
  return (
    <PressableScale {...props} style={[styles.lift, { borderRadius: radius }, round ? styles.round : styles.pill, style]}
      contentStyle={[styles.surface, round && styles.roundSurface, { borderRadius: radius }]}>
      <GlassSurface radius={radius} />
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  rim: { borderWidth: 1, borderColor: glass.rim },
  lift: {
    shadowColor: '#62472D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  pill: { flex: 1, height: BUTTON_HEIGHT },
  round: { width: BUTTON_HEIGHT, height: BUTTON_HEIGHT },
  surface: {
    overflow: 'hidden', flexDirection: 'row', gap: 6, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  roundSurface: { paddingHorizontal: 0 },
});
