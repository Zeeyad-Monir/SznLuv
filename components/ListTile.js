// A square tile for a list in the library: its cover colour or season illustration, title and spot count.
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { coverBackground } from '../services/listsState';
import { seasonArt } from './covers';
import { cardShadow, colors } from './theme';

export const spotCount = count => `${count} ${count === 1 ? 'spot' : 'spots'}`;

export default function ListTile({ list, size, onPress, caption, updated = false }) {
  const art = seasonArt(list.cover);
  const draft = 'public' in list;
  const count = draft ? list.items?.length : list.spotCount ?? list.items?.length;
  const footer = caption ?? (count == null ? null : spotCount(count));
  const creator = !draft && list.ownerUsername ? `by ${list.ownerUsername}` : null;
  const privacy = draft ? (list.public ? 'public list' : 'private list') : null;
  const body = (
    <View style={styles.body}>
      {(updated || draft) && (
        <View style={styles.badge}>
          {updated ? <Text style={styles.updated}>Updated</Text>
            : <Ionicons name={list.public ? 'globe-outline' : 'lock-closed'} size={13} color={colors.ink} />}
        </View>
      )}
      <View style={styles.words}>
        <Text style={[styles.title, art && styles.onArt]}>{list.title}</Text>
        {!!footer && <Text style={[styles.caption, art && styles.onArt]}>{footer}</Text>}
        {!!creator && <Text style={[styles.caption, art && styles.onArt]} numberOfLines={2}>{creator}</Text>}
      </View>
    </View>
  );
  return (
    <TouchableOpacity
      style={[styles.tile, { width: size, minHeight: size, backgroundColor: coverBackground(list.cover) }]}
      activeOpacity={0.8} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={[list.title, privacy, footer, creator, updated && 'Updated'].filter(Boolean).join(', ')}
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
  art: { flexGrow: 1 },
  artImage: { borderRadius: 15, opacity: 0.85 },
  body: { flexGrow: 1, padding: 14, justifyContent: 'flex-end' },
  words: { flexGrow: 1, justifyContent: 'flex-end' },
  badge: {
    alignSelf: 'flex-end', minWidth: 26, minHeight: 26, paddingHorizontal: 6, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  updated: { color: colors.ink, fontSize: 12, fontWeight: '700' },
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
