// "Add a spot": search every season's spots, and the user's own, and add them to a list or to Top 4
// without leaving the sheet. "My spots" narrows it to the places the user made.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';
import SegmentPill from './SegmentPill';
import { SearchBar } from './filters/SearchControls';
import { colors, text } from './theme';
import { catalogueRef, catalogueSections, resolveSpot } from '../services/catalogue';
import { matchesSpot, toRef } from '../services/customSpotsState';
import { DEFAULT_FILTERS, createSpotIndex, findMatchingSpots } from '../services/spotDiscovery';

const index = createSpotIndex(catalogueSections, { rankSearch: true });
const SCOPES = [{ value: 'all', label: 'All' }, { value: 'mine', label: 'My spots' }];

// title: sheet heading. addedKeys: spot keys already in the target. mySpots: the user's own spot records
// (hooks/useMySpots.js), added by reference so editing one later shows everywhere.
// full: the target can't take more. onAdd(ref) adds one. onAddOwn(typedText) leaves for the own-spot screen.
export default function AddSpotSheet({ title = 'Add a spot', addedKeys, mySpots = [], full = false, fullHint, onAdd, onAddOwn, onDismiss }) {
  const { bottom } = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const matches = useMemo(() => findMatchingSpots(index, query, DEFAULT_FILTERS), [query]);
  const mine = mySpots.filter(spot => matchesSpot(spot, query)).map(spot => toRef(spot.id, spot));
  const onlyMine = scope === 'mine';

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
          <View style={styles.searchRow}><SearchBar value={query} onChangeText={setQuery} /></View>
          <SegmentPill options={SCOPES} value={scope} onChange={setScope} style={styles.scopes} />
          {full && <Text style={styles.full} accessibilityRole="alert">{fullHint}</Text>}
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {mine.length > 0 && (
              <View>
                <Text style={styles.group} accessibilityRole="header">Your spots</Text>
                {mine.map(row)}
              </View>
            )}
            {!onlyMine && matches.sections.map(section => (
              <View key={section.title ?? 'results'}>
                {!!section.title && <Text style={styles.group} accessibilityRole="header">{section.title}</Text>}
                {section.spots.map(spot => row(catalogueRef(spot.name)))}
              </View>
            ))}
            {onlyMine && mySpots.length === 0 && (
              <Text style={styles.none}>You haven’t made any spots yet.{onAddOwn ? ' Add one of your own below.' : ''}</Text>
            )}
            {onlyMine && mySpots.length > 0 && mine.length === 0 && (
              <Text style={styles.none}>None of your spots match “{query.trim()}”.</Text>
            )}
            {!onlyMine && matches.count === 0 && mine.length === 0 && (
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

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row' }, // The search bar is built to fill a row
  scopes: { marginTop: 10 },
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
  // The same soft card as a spot page's empty state.
  none: {
    marginTop: 16, padding: 24, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.field,
    fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center',
  },
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
