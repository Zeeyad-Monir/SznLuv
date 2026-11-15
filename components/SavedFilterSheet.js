// Sort and filters for the Saved pages: the order things are in, which seasons, and (for spots) whether
// to show SznLuv's spots, your own, or both. Changes apply when Apply is pressed, like the other sheets.
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';
import FilterOption from './filters/FilterOption';
import FilterSection from './filters/FilterSection';
import SheetFooter from './filters/SheetFooter';
import shared from './filters/styles';
import { DEFAULT_SAVED_FILTERS, SEASONS, SORTS, TYPES } from '../services/savedLibrary';

export default function SavedFilterSheet({ value, showType = true, onApply, onDismiss }) {
  const [draft, setDraft] = useState(value);
  const update = change => setDraft(previous => ({ ...previous, ...change }));
  const toggleSeason = season => update({
    seasons: draft.seasons.includes(season) ? draft.seasons.filter(chosen => chosen !== season) : [...draft.seasons, season],
  });

  return (
    <DiscoveryBottomSheet title="Sort & filter" closeLabel="Close sort and filter" testID="saved-filter" onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView style={shared.body} contentContainerStyle={shared.bodyContent}>
            <FilterSection first title="Sort by">
              <View style={shared.options}>
                {SORTS.map(({ value: sort, label }) => (
                  <FilterOption key={sort} label={label} selected={draft.sort === sort} onPress={() => update({ sort })} />
                ))}
              </View>
            </FilterSection>
            <FilterSection title="Season">
              <View style={shared.options}>
                {SEASONS.map(season => (
                  <FilterOption key={season} label={season} selected={draft.seasons.includes(season)} onPress={() => toggleSeason(season)} />
                ))}
              </View>
            </FilterSection>
            {showType && (
              <FilterSection title="Spots">
                <View style={shared.options}>
                  {TYPES.map(({ value: type, label }) => (
                    <FilterOption key={type} label={label} selected={draft.type === type} onPress={() => update({ type })} />
                  ))}
                </View>
              </FilterSection>
            )}
          </ScrollView>
          <SheetFooter onReset={() => setDraft(DEFAULT_SAVED_FILTERS)} onApply={() => { onApply(draft); dismiss(); }} />
        </>
      )}
    </DiscoveryBottomSheet>
  );
}
