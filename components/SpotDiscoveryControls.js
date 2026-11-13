import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usesOrigin, widerRadius } from '../services/spotDiscovery';
import { focusAccessibility } from './DiscoveryBottomSheet';
import SpotFilterSheet from './SpotFilterSheet';
import { FilterButton, SearchBar, SpotFilterButton, SpotSearchBar } from './filters/SearchControls';
import { colors } from './theme';

export { FilterButton, SearchBar, SpotFilterButton, SpotSearchBar };

// What a distance filter says it is doing: "Within 25 km of Current location", or "Nearest to …".
export function distanceSummary(filters) {
  if (!usesOrigin(filters) || !filters.origin) return null;
  return filters.radiusKm === null
    ? `Nearest to ${filters.origin.label}`
    : `Within ${filters.radiusKm} km of ${filters.origin.label}`;
}

export default function SpotDiscoveryControls({ discovery }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const filterButton = useRef(null);
  const focusFrame = useRef(null);
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);

  const dismiss = useCallback(() => {
    setSheetOpen(false);
    focusFrame.current = requestAnimationFrame(() => focusAccessibility(filterButton.current));
  }, []);

  const { query, setQuery, count, filters, hasActiveFilters, clearFilters, applyFilters, index } = discovery;
  const reference = distanceSummary(filters);

  return (
    <View style={styles.controls}>
      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} />
        <FilterButton ref={filterButton} active={hasActiveFilters} expanded={sheetOpen}
          onPress={() => { Keyboard.dismiss(); setSheetOpen(true); }} />
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryText} accessibilityLiveRegion="polite">
          {count} {query.trim() || hasActiveFilters ? 'matching ' : ''}{count === 1 ? 'spot' : 'spots'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity accessibilityRole="button" style={styles.summaryAction} onPress={clearFilters}>
            <Text style={[styles.summaryText, styles.underlined]}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!reference && <Text style={[styles.summaryText, styles.reference]}>{reference}</Text>}
      {sheetOpen && (
        <SpotFilterSheet filters={filters} index={index} onApply={applyFilters} onDismiss={dismiss} />
      )}
    </View>
  );
}

// With a distance limit on, the way out is a wider distance as well as clearing everything.
export function SpotEmptyState({ discovery }) {
  const { query, hasActiveFilters, setQuery, clearFilters, filters, applyFilters } = discovery;
  const radius = filters?.origin && filters.radiusKm !== null ? filters.radiusKm : null;
  const wider = radius !== null ? widerRadius(radius) : null;
  const text = radius !== null
    ? `No spots within ${radius} km of ${filters.origin.label}. Widen the distance or clear filters.`
    : query.trim() || hasActiveFilters ? 'Try a different search or adjust your filters.' : 'Check back for more spots soon.';
  return (
    <View style={styles.empty}>
      <Icon name="search" size={26} color={colors.muted} accessible={false} importantForAccessibility="no" />
      <Text style={styles.emptyTitle} accessibilityRole="header">No spots found</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <View style={styles.emptyActions}>
        {!!wider && (
          <TouchableOpacity accessibilityRole="button" style={[styles.emptyButton, styles.emptyPrimary]}
            onPress={() => applyFilters({ ...filters, radiusKm: wider })}>
            <Text style={styles.emptyPrimaryText}>Widen to {wider} km</Text>
          </TouchableOpacity>
        )}
        {!!query.trim() && (
          <TouchableOpacity accessibilityRole="button" style={styles.emptyButton} onPress={() => setQuery('')}>
            <Text style={[styles.summaryText, styles.underlined]}>Clear search</Text>
          </TouchableOpacity>
        )}
        {hasActiveFilters && (
          <TouchableOpacity accessibilityRole="button" style={styles.emptyButton} onPress={clearFilters}>
            <Text style={[styles.summaryText, styles.underlined]}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  summary: { minHeight: 44, gap: 8, flexDirection: 'row', alignItems: 'center', alignContent: 'center', flexWrap: 'wrap' },
  summaryText: { color: colors.summary, fontSize: 14, fontWeight: '600' },
  summaryAction: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', marginLeft: 'auto' },
  underlined: { textDecorationLine: 'underline' },
  reference: { fontWeight: '500', marginBottom: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 16, backgroundColor: colors.field },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  emptyText: { fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  emptyPrimary: { paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.ink },
  emptyPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
