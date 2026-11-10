// A full-width card for someone's public list, in its cover colour: title, who made it, how many spots.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { coverBackground } from '../services/listsState';
import { spotCount } from './ListTile';
import { cardShadow, colors } from './theme';

export default function ListCard({ list, onPress, updated = false }) {
  const count = list.spotCount ?? list.items?.length ?? 0;
  const caption = `by ${list.ownerUsername} · ${spotCount(count)}`;
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: coverBackground(list.cover) }]} activeOpacity={0.8}
      onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${list.title}, ${caption}${updated ? ', updated' : ''}`}>
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{list.title}</Text>
        <View style={styles.captionRow}>
          {updated && <View style={styles.dot} />}
          <Text style={styles.caption} numberOfLines={1}>{updated ? `Updated · ${caption}` : caption}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={22} color={colors.ink} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88, marginBottom: 16, paddingVertical: 16, paddingLeft: 18, paddingRight: 12, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', ...cardShadow,
  },
  words: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  captionRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  caption: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.summary },
});
