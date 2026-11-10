// "Add a spot": search every season's spots and add them to a list or to Top 4 without leaving the sheet.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';
import { SpotSearchBar } from './SpotDiscoveryControls';
import { colors, text } from './theme';
import { catalogueRef, catalogueSections, isOwnSpot, resolveSpot, spotKey } from '../services/catalogue';
import { DEFAULT_FILTERS, createSpotIndex, findMatchingSpots } from '../services/spotDiscovery';

const index = createSpotIndex(catalogueSections, { rankSearch: true });

// title: sheet heading. addedKeys: spot keys already in the target. ownSpots: the user's own spots from elsewhere.
// full: the target can't take more. onAdd(ref) adds one. onAddOwn(typedText) leaves for the own-spot screen.
export default function AddSpotSheet({ title = 'Add a spot', addedKeys, ownSpots = [], full = false, fullHint, onAdd, onAddOwn, onDismiss }) {
  const { bottom } = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => findMatchingSpots(index, query, DEFAULT_FILTERS), [query]);
  const typed = query.trim().toLowerCase();
  const mine = ownSpots.filter(ref => !typed || ref.name.toLowerCase().includes(typed));

  const row = ref => {
    const spot = resolveSpot(ref);
    const added = addedKeys.has(spot.key);
    const disabled = added || full;
    return (
      <View key={spot.key} style={styles.row}>
        <View style={styles.rowWords}>
          <Text style={styles.rowName} numberOfLines={1}>{spot.name}</Text>
          {!!spot.meta && <Text style={text.meta} numberOfLines={1}>{spot.meta}</Text>}
        </View>
        <TouchableOpacity style={[styles.add, added && styles.added]} disabled={disabled} onPress={() => onAdd(ref)}
          accessibilityRole="button" accessibilityState={{ disabled }}
          accessibilityLabel={added ? `${spot.name} added` : `Add ${spot.name}`}>
          {added && <Ionicons name="checkmark" size={16} color={colors.ink} />}
          <Text style={[styles.addText, added && styles.addedText, full && !added && styles.addDisabled]}>{added ? 'Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <DiscoveryBottomSheet title={title} closeLabel={`Close ${title}`} testID="add-spot" onDismiss={onDismiss}>
      {dismiss => (
        <>
          <View style={styles.searchRow}><SpotSearchBar value={query} onChangeText={setQuery} /></View>
          {full && <Text style={styles.full} accessibilityRole="alert">{fullHint}</Text>}
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {mine.length > 0 && (
              <View>
                <Text style={styles.group} accessibilityRole="header">Your spots</Text>
                {mine.map(row)}
              </View>
            )}
            {matches.sections.map(section => (
              <View key={section.title ?? 'results'}>
                {!!section.title && <Text style={styles.group} accessibilityRole="header">{section.title}</Text>}
                {section.spots.map(spot => row(catalogueRef(spot.name)))}
              </View>
            ))}
            {matches.count === 0 && mine.length === 0 && (
              <Text style={styles.none}>No spots match “{query.trim()}”.{onAddOwn ? ' You can add it yourself below.' : ''}</Text>
            )}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(12, bottom) }]}>
            {onAddOwn ? (
              <TouchableOpacity style={styles.own} accessibilityRole="button" disabled={full}
                onPress={() => { dismiss(); onAddOwn(query.trim()); }}>
                <Text style={styles.ownText}>Can’t find it? <Text style={[styles.ownAction, full && styles.addDisabled]}>Add your own spot</Text></Text>
              </TouchableOpacity>
            ) : <View style={styles.own} />}
            <TouchableOpacity style={styles.done} accessibilityRole="button" onPress={dismiss}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </DiscoveryBottomSheet>
  );
}

// Own spots used in the user's other lists, once each, for the "Your spots" group.
export function ownSpotsFrom(lists) {
  const seen = new Map();
  lists.forEach(list => list.items.forEach(item => {
    if (isOwnSpot(item.spot) && !seen.has(spotKey(item.spot))) seen.set(spotKey(item.spot), item.spot);
  }));
  return [...seen.values()];
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row' }, // The search bar is built to fill a row
  results: { flex: 1, marginTop: 8 },
  resultsContent: { paddingBottom: 12 },
  group: { marginTop: 14, marginBottom: 2, fontSize: 16, fontWeight: '700', color: '#323232' },
  row: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  rowWords: { flex: 1 },
  rowName: { fontSize: 17, fontWeight: '700', color: '#000' },
  add: {
    minWidth: 72, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', gap: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink,
  },
  added: { backgroundColor: colors.field, borderWidth: 1, borderColor: '#DDD5CC' },
  addText: { fontSize: 15, fontWeight: '700', color: colors.white },
  addedText: { color: colors.ink },
  addDisabled: { color: '#B9B1A7' },
  full: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.error },
  none: { marginTop: 24, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 6,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  own: { flex: 1, minHeight: 48, justifyContent: 'center' },
  ownText: { fontSize: 15, color: colors.muted },
  ownAction: { fontWeight: '700', color: colors.ink, textDecorationLine: 'underline' },
  done: { minHeight: 48, minWidth: 84, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  doneText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
