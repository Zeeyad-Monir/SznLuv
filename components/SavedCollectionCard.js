// A saved collection on the Saved page: its illustration, its name and spot count low on a dark fade, and
// a heart in a white badge. The heart sits beside the card, not inside it, so VoiceOver reaches each alone.
// `item` comes from hooks/useSavedLibrary.js.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArtBackground } from './Art';
import HeartButton from './HeartButton';
import PressableScale from './PressableScale';
import { SEASON_TINT, collectionArt } from './covers';
import { CARD_RADIUS, artFade, cardShadow, colors, onArt } from './theme';

const PLAIN = '#B98A5E';

export default function SavedCollectionCard({ item, width, height, onPress, onToggle, compact = false }) {
  const { collection, saved, spotCount } = item;
  const tint = SEASON_TINT[collection.key] ?? PLAIN;
  const count = `${spotCount} ${spotCount === 1 ? 'spot' : 'spots'}`;
  return (
    <View style={{ width, height }}>
      <PressableScale style={[styles.card, { width, height, backgroundColor: tint }]} contentStyle={[styles.surface, { backgroundColor: tint }]}
        onPress={onPress} accessibilityLabel={`${collection.title}, ${item.meta}`}>
        <ArtBackground source={collectionArt(collection.key)} style={styles.fill} imageStyle={styles.image}>
          <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={artFade.colors} locations={artFade.locations} />
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>{collection.title}</Text>
          <Text style={styles.count}>{count}</Text>
        </ArtBackground>
      </PressableScale>
      <HeartButton style={styles.heart} saved={saved} size={20} hitSlop={8} color={colors.savedHeart} idleColor={colors.ink}
        label={saved ? `Remove ${collection.title} collection from Saved` : `Save ${collection.title} collection`}
        onPress={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS, ...cardShadow },
  surface: { borderRadius: CARD_RADIUS, overflow: 'hidden' },
  fill: { flexGrow: 1, justifyContent: 'flex-end', padding: 14 },
  image: { borderRadius: CARD_RADIUS },
  title: { fontSize: 22, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3, ...onArt },
  titleCompact: { fontSize: 20, lineHeight: 24 },
  count: { marginTop: 2, fontSize: 13, fontWeight: '600', ...onArt },
  heart: {
    position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
});
