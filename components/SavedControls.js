// The search field and sort-and-filter button at the top of every Saved page. `state` is the page's
// useSavedQuery(), shared by all three pages. The page also owns whether the sheet is open, so another control
// on it (the "Sort" pill on Saved Spots) can open the same sheet.
import React, { useCallback, useEffect, useRef } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { FilterButton, SearchBar } from './filters/SearchControls';
import SavedFilterSheet from './SavedFilterSheet';
import { focusAccessibility } from './DiscoveryBottomSheet';
import { DEFAULT_SAVED_FILTERS, isDefaultFilters } from '../services/savedLibrary';

// Whether anything this page uses differs from the defaults. The collections page has no spot type.
export const filtersActive = (filters, showType = true) => !isDefaultFilters(showType ? filters : { ...filters, type: 'all' });
// Whether some saves are being hidden. A new order alone hides nothing.
export const isNarrowed = (query, filters, showType = true) => !!query.trim()
  || filtersActive({ ...filters, sort: DEFAULT_SAVED_FILTERS.sort }, showType);

export default function SavedControls({ state, placeholder, showType = true, sheetOpen, setSheetOpen, style }) {
  const { query, setQuery, filters, setFilters } = state;
  const filterButton = useRef(null);
  const focusFrame = useRef(null);
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);
  const dismiss = useCallback(() => {
    setSheetOpen(false);
    focusFrame.current = requestAnimationFrame(() => focusAccessibility(filterButton.current));
  }, [setSheetOpen]);

  return (
    <View style={[styles.row, style]}>
      <SearchBar value={query} onChangeText={setQuery} placeholder={placeholder} />
      <FilterButton ref={filterButton} active={filtersActive(filters, showType)} expanded={sheetOpen}
        label="Sort and filter" onPress={() => { Keyboard.dismiss(); setSheetOpen(true); }} />
      {sheetOpen && <SavedFilterSheet value={filters} showType={showType} onApply={setFilters} onDismiss={dismiss} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
