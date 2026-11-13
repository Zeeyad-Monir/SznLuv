// Sorting and filtering a spot's reviews, in the same sheet as every other sort and filter in the app.
// Changes apply only when Apply is pressed.
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import DiscoveryBottomSheet from '../DiscoveryBottomSheet';
import FilterOption from '../filters/FilterOption';
import FilterSection from '../filters/FilterSection';
import SheetFooter from '../filters/SheetFooter';
import shared from '../filters/styles';
import { DEFAULT_SORT, SORT_OPTIONS, STAR_FILTERS } from '../../services/reviews';

export const starFilterLabel = stars => (stars ? `${stars} star${stars === 1 ? '' : 's'}` : 'All ratings');

export default function ReviewFilterSheet({ sort, starFilter, counts, onApply, onDismiss }) {
  const [draft, setDraft] = useState({ sort, starFilter });
  const update = change => setDraft(previous => ({ ...previous, ...change }));
  return (
    <DiscoveryBottomSheet title="Sort & filter" closeLabel="Close review filters" testID="review-filter" onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView style={shared.body} contentContainerStyle={shared.bodyContent}>
            <FilterSection first title="Sort by">
              <View style={shared.options}>
                {SORT_OPTIONS.map(({ value, label }) => (
                  <FilterOption key={value} label={label} selected={draft.sort === value} onPress={() => update({ sort: value })} />
                ))}
              </View>
            </FilterSection>
            <FilterSection title="Rating">
              <View style={shared.options}>
                {STAR_FILTERS.map(stars => (
                  <FilterOption key={stars} selected={draft.starFilter === stars} onPress={() => update({ starFilter: stars })}
                    label={stars ? `${starFilterLabel(stars)} (${counts[stars]})` : starFilterLabel(stars)} />
                ))}
              </View>
            </FilterSection>
          </ScrollView>
          <SheetFooter onReset={() => setDraft({ sort: DEFAULT_SORT, starFilter: 0 })}
            onApply={() => { onApply(draft); dismiss(); }} />
        </>
      )}
    </DiscoveryBottomSheet>
  );
}
