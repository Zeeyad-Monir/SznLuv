// A square tile for a list in the library: its cover colour or season illustration, title and spot count.
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { coverBackground } from '../services/listsState';
import { seasonArt } from './covers';
import { cardShadow, colors } from './theme';

export const spotCount = count => `${count} ${count === 1 ? 'spot' : 'spots'}`;

// `caption` replaces the spot count; `badge="dot"` marks a followed list that changed since it was last opened.
export default function ListTile({ list, size, onPress, caption, badge }) {
  const art = seasonArt(list.cover);
  const count = list.spotCount ?? list.items?.length ?? 0;
  const footer = caption ?? spotCount(count);
  const privacy = list.public ? 'public' : 'private';
  const body = (
    <View style={styles.body}>
      {badge === 'dot' && <View style={styles.dot} />}
      {!badge && 'public' in list && !caption && (
        <View style={[styles.badge, art && styles.badgeOnArt]}>
          <Ionicons name={list.public ? 'globe-outline' : 'lock-closed'} size={13} color={colors.ink} />
        </View>
      )}
      <Text style={[styles.title, art && styles.onArt]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75}>
        {list.title}
      </Text>
      <Text style={[styles.caption, art && styles.onArt]} numberOfLines={1}>{footer}</Text>
    </View>
  );
  return (
    <TouchableOpacity
      style={[styles.tile, { width: size, height: size, backgroundColor: coverBackground(list.cover) }]}
      activeOpacity={0.8} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${list.title}, ${'public' in list && !caption ? `${privacy} list, ` : ''}${footer}`}
    >
      {art ? (
        <ImageBackground source={art} style={styles.art} imageStyle={styles.artImage}>{body}</ImageBackground>
      ) : body}
    </TouchableOpacity>
  );
}

export function NewListTile({ size, onPress }) {
  return (
    <TouchableOpacity style={[styles.newTile, { width: size, height: size }]} activeOpacity={0.7}
      onPress={onPress} accessibilityRole="button" accessibilityLabel="New list">
      <Ionicons name="add" size={34} color={colors.ink} />
      <Text style={styles.newText}>New list</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 15, marginBottom: 16, ...cardShadow },
  art: { flex: 1 },
  artImage: { borderRadius: 15, opacity: 0.85 },
  body: { flex: 1, padding: 14, justifyContent: 'flex-end' },
  badge: {
    position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  dot: { position: 'absolute', top: 12, right: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.white },
  badgeOnArt: { backgroundColor: 'rgba(255, 255, 255, 0.8)' },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  caption: { marginTop: 4, fontSize: 13, fontWeight: '600', color: colors.summary },
  onArt: {
    color: colors.white, textShadowColor: 'rgba(0, 0, 0, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  newTile: {
    borderRadius: 15, marginBottom: 16, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9A88F', backgroundColor: 'rgba(255, 249, 241, 0.6)',
  },
  newText: { fontSize: 16, fontWeight: '700', color: colors.ink },
});
