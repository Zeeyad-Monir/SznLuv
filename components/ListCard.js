// A full-width card for someone's public list, on its cover image (or its colour, for lists from before
// image covers): title, who made it, how many spots.
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { coverBackground } from '../services/listsState';
import { coverArt } from './covers';
import { spotCount } from './ListTile';
import { cardShadow, colors, onArt } from './theme';

// Darker on the left, where the words are, so they read over any picture.
const SIDE_FADE = ['rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0.1)'];

export default function ListCard({ list, onPress, updated = false }) {
  const art = coverArt(list.cover);
  const count = list.spotCount ?? list.items?.length ?? 0;
  const caption = `by ${list.ownerUsername} · ${spotCount(count)}`;
  const content = (
    <>
      {art && <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={SIDE_FADE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
      <View style={styles.words}>
        <Text style={[styles.title, art && onArt]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{list.title}</Text>
        <View style={styles.captionRow}>
          {updated && <View style={styles.dot} />}
          <Text style={[styles.caption, art && onArt]} numberOfLines={1}>{updated ? `Updated · ${caption}` : caption}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={22} color={art ? colors.white : colors.ink} />
    </>
  );
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: coverBackground(list.cover) }]} activeOpacity={0.8}
      onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${list.title}, ${caption}${updated ? ', updated' : ''}`}>
      {art ? (
        <ImageBackground source={art} style={styles.inner} imageStyle={styles.image} resizeMode="cover">{content}</ImageBackground>
      ) : <View style={styles.inner}>{content}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 88, marginBottom: 16, borderRadius: 14, ...cardShadow },
  inner: {
    flexGrow: 1, minHeight: 88, paddingVertical: 16, paddingLeft: 18, paddingRight: 12, borderRadius: 14,
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
  },
  image: { borderRadius: 14 },
  words: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  captionRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  caption: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.summary },
});
