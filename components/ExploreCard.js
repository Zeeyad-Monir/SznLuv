// A public list on Explore: the large featured card ('hero') or a grid tile ('tile').
// Season covers show their illustration under a dark fade with white words; colour covers keep their colour
// under a soft light wash with dark words, so pastel covers stay readable. The heart in the corner follows the
// list. Like CollectionCard, it sits beside the card's touchable, so tapping it never opens the list.
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { coverBackground } from '../services/listsState';
import { seasonArt } from './covers';
import HeartButton from './HeartButton';
import { spotCount } from './ListTile';
import { artFade, cardShadow, colors, onArt } from './theme';

const COLOUR_WASH = ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)'];

export const exploreCardLabel = list => {
  const count = list.spotCount ?? list.items?.length ?? 0;
  return `${list.title}, ${spotCount(count)}, by ${list.ownerUsername}`;
};

export default function ExploreCard({ list, variant = 'tile', width, height, followed, onPress, onToggleFollow, onLayout }) {
  const hero = variant === 'hero';
  const art = seasonArt(list.cover);
  const count = list.spotCount ?? list.items?.length ?? 0;
  const label = exploreCardLabel(list);
  const words = (
    <>
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
        colors={art ? artFade.colors : COLOUR_WASH} locations={art ? artFade.locations : [0, 1]} />
      {hero && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Featured list</Text>
        </View>
      )}
      <View style={[styles.words, hero && styles.heroWords]}>
        <Text style={[hero ? styles.heroTitle : styles.title, art && styles.onArt]} numberOfLines={2}>{list.title}</Text>
        <Text style={[styles.caption, art && styles.onArt]} numberOfLines={1}>
          by @{list.ownerUsername} · {spotCount(count)}
        </Text>
      </View>
    </>
  );
  return (
    <View style={[styles.card, { width, minHeight: height }, hero && styles.heroCard]} onLayout={onLayout}>
      <TouchableOpacity style={[styles.touchable, { backgroundColor: coverBackground(list.cover) }]} activeOpacity={0.85}
        onPress={onPress} accessibilityRole="button" accessibilityLabel={hero ? `Featured: ${label}` : label}>
        {art ? (
          <ImageBackground source={art} style={styles.fill} imageStyle={styles.image}>{words}</ImageBackground>
        ) : <View style={styles.fill}>{words}</View>}
      </TouchableOpacity>
      <HeartButton style={[styles.heart, hero && styles.heroHeart]} saved={followed} onPress={onToggleFollow}
        size={hero ? 24 : 20} hitSlop={hero ? 6 : 8} idleColor={colors.ink}
        label={followed ? `Unfollow ${list.title}` : `Follow ${list.title}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, borderRadius: 16, ...cardShadow },
  heroCard: { marginTop: 16, marginBottom: 20 },
  touchable: { flexGrow: 1, borderRadius: 16, overflow: 'hidden' },
  fill: { flexGrow: 1, justifyContent: 'flex-end' },
  image: { borderRadius: 16 },
  words: { padding: 12, paddingTop: 52 },
  heroWords: { padding: 18, paddingTop: 64 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink },
  heroTitle: { fontSize: 26, fontWeight: '700', color: colors.ink },
  caption: { marginTop: 3, fontSize: 13, fontWeight: '600', color: colors.summary },
  onArt,
  badge: {
    position: 'absolute', top: 14, left: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  heart: {
    position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  heroHeart: { top: 12, right: 12, width: 44, height: 44, borderRadius: 22 },
});
