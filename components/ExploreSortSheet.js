// Explore's sort and filter sheet: recommended, newest or most followed, and whether to leave out lists you
// already follow. "Recommended" is only offered while the recommendations can be reached; without them the
// page is the newest lists, so "Newest" shows as the choice.
// Changes apply only when Apply is pressed, like the spot filter sheet.
import React, { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';
import FilterOption from './filters/FilterOption';
import FilterSection from './filters/FilterSection';
import SheetFooter from './filters/SheetFooter';
import shared from './filters/styles';
import { colors } from './theme';

export const RECOMMENDED = 'recommended';
export const DEFAULT_EXPLORE_SORT = { sort: RECOMMENDED, hideFollowed: false };
export const isDefaultSort = value => value.sort === DEFAULT_EXPLORE_SORT.sort && value.hideFollowed === DEFAULT_EXPLORE_SORT.hideFollowed;

const SORTS = [
  { value: RECOMMENDED, label: 'Recommended' }, { value: 'newest', label: 'Newest' }, { value: 'followed', label: 'Most followed' },
];

export default function ExploreSortSheet({ value, recommended = true, onApply, onDismiss }) {
  const [draft, setDraft] = useState(value);
  const update = change => setDraft(previous => ({ ...previous, ...change }));
  const sorts = recommended ? SORTS : SORTS.filter(option => option.value !== RECOMMENDED);
  const chosen = !recommended && draft.sort === RECOMMENDED ? 'newest' : draft.sort;

  return (
    <DiscoveryBottomSheet title="Sort lists" closeLabel="Close sort" testID="explore-sort" onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView style={shared.body} contentContainerStyle={shared.bodyContent}>
            <FilterSection first title="Sort by">
              <View style={shared.options}>
                {sorts.map(({ value: sort, label }) => (
                  <FilterOption key={sort} label={label} selected={chosen === sort} onPress={() => update({ sort })} />
                ))}
              </View>
            </FilterSection>
            <FilterSection>
              <View style={shared.switchRow}>
                <Text style={shared.switchLabel}>Hide lists I already follow</Text>
                <Switch value={draft.hideFollowed} onValueChange={hideFollowed => update({ hideFollowed })}
                  accessibilityLabel="Hide lists I already follow" trackColor={{ true: colors.ink }} />
              </View>
            </FilterSection>
          </ScrollView>
          <SheetFooter onReset={() => setDraft(DEFAULT_EXPLORE_SORT)} onApply={() => { onApply(draft); dismiss(); }} />
        </>
      )}
    </DiscoveryBottomSheet>
  );
}
