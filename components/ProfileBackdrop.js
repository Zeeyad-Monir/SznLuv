// The soft art behind the top of a profile: the season illustration of the person's #1 pick,
// or, with no seasonal #1, a wash of their avatar colour. Both melt into the cream page.
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SEASON_ART } from './covers';
import { colors } from './theme';
import { DEFAULT_AVATAR_COLOUR } from '../services/profiles';

export const BACKDROP_HEIGHT = 300;

// Cream at the top (so it meets the header without an edge), clear through the middle, cream again where the page continues.
const MELT = {
  colors: [colors.profile, 'rgba(250, 243, 224, 0.15)', 'rgba(250, 243, 224, 0)', colors.profile],
  locations: [0, 0.3, 0.55, 1],
};

export default function ProfileBackdrop({ season, avatarColor, style }) {
  const art = season ? SEASON_ART[season.toLowerCase()] : undefined;
  return (
    <View pointerEvents="none" style={[styles.backdrop, style]} testID="profile-backdrop">
      {art
        ? <Image source={art} style={[StyleSheet.absoluteFill, styles.art]} resizeMode="cover" accessible={false} />
        : <View style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: avatarColor || DEFAULT_AVATAR_COLOUR }]} />}
      <LinearGradient colors={MELT.colors} locations={MELT.locations} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, height: BACKDROP_HEIGHT, overflow: 'hidden' },
  art: { width: '100%', height: '100%', opacity: 0.4 },
  wash: { opacity: 0.28 },
});
