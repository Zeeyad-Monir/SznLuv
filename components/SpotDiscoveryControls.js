import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usesOrigin } from '../services/spotDiscovery';
import { focusAccessibility } from './DiscoveryBottomSheet';
import SpotFilterSheet from './SpotFilterSheet';

export function SpotSearchBar({ value, onChangeText }) {
  return (
    <View style={styles.searchBar}>
      <Icon name="search" size={22} color="#62584E" accessible={false} importantForAccessibility="no" />
      <TextInput
        style={styles.searchInput} value={value} onChangeText={onChangeText}
        placeholder="Search spots" placeholderTextColor="#6B635A" accessibilityLabel="Search spots"
        autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss}
      />
      {!!value && (
        <TouchableOpacity style={styles.clearText} accessibilityRole="button"
          accessibilityLabel="Clear search" onPress={() => onChangeText('')}>
          <Icon name="cancel" size={20} color="#62584E" accessible={false} importantForAccessibility="no" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export const SpotFilterButton = forwardRef(function SpotFilterButton({ active, expanded, onPress }, ref) {
  return (
    <TouchableOpacity ref={ref} style={[styles.filterButton, active && styles.filterActive]}
      accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={active ? 'Filter spots, filters active' : 'Filter spots'} onPress={onPress}>
      <Icon name="tune" size={22} color={active ? '#FFF' : '#333'} accessible={false} importantForAccessibility="no" />
      {active && <View pointerEvents="none" style={styles.activeDot} />}
    </TouchableOpacity>
  );
});

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
  const reference = usesOrigin(filters) && filters.origin && (filters.radiusKm === null
    ? `Nearest to ${filters.origin.label}`
    : `Within ${filters.radiusKm} km of ${filters.origin.label}`);

  return (
    <View style={styles.controls}>
      <View style={styles.searchRow}>
        <SpotSearchBar value={query} onChangeText={setQuery} />
        <SpotFilterButton ref={filterButton} active={hasActiveFilters} expanded={sheetOpen}
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

export function SpotEmptyState({ discovery }) {
  const { query, hasActiveFilters, setQuery, clearFilters } = discovery;
  return (
    <View style={styles.empty}>
      <Icon name="search" size={26} color="#62584E" accessible={false} importantForAccessibility="no" />
      <Text style={styles.emptyTitle} accessibilityRole="header">No spots found</Text>
      <Text style={styles.emptyText}>
        {query.trim() || hasActiveFilters ? 'Try a different search or adjust your filters.' : 'Check back for more spots soon.'}
      </Text>
      <View style={styles.emptyActions}>
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
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  searchBar: {
    flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 12,
    borderRadius: 12, backgroundColor: '#FFF9F1', borderWidth: 1, borderColor: '#00000020',
  },
  searchInput: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 8, fontSize: 16, color: '#262321' },
  clearText: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filterButton: {
    minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF9F1', borderRadius: 12, borderWidth: 1, borderColor: '#00000020',
  },
  filterActive: { backgroundColor: '#333' },
  activeDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD39B' },
  summary: { minHeight: 44, gap: 8, flexDirection: 'row', alignItems: 'center', alignContent: 'center', flexWrap: 'wrap' },
  summaryText: { color: '#30261D', fontSize: 14, fontWeight: '600' },
  summaryAction: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', marginLeft: 'auto' },
  underlined: { textDecorationLine: 'underline' },
  reference: { fontWeight: '500', marginBottom: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 14, backgroundColor: '#FFF9F1' },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: '#333', textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#62584E', textAlign: 'center' },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  emptyButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
