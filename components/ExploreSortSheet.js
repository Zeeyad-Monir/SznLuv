// Explore's sort and filter sheet: recommended, newest or most followed, and whether to leave out lists you
// already follow. "Recommended" is only offered while the recommendations can be reached; without them the
// page is the newest lists, so "Newest" shows as the choice.
// Changes apply only when Apply is pressed, like the spot filter sheet.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';
import { colors } from './theme';

export const RECOMMENDED = 'recommended';
export const DEFAULT_EXPLORE_SORT = { sort: RECOMMENDED, hideFollowed: false };
export const isDefaultSort = value => value.sort === DEFAULT_EXPLORE_SORT.sort && value.hideFollowed === DEFAULT_EXPLORE_SORT.hideFollowed;

const SORTS = [
  { value: RECOMMENDED, label: 'Recommended' }, { value: 'newest', label: 'Newest' }, { value: 'followed', label: 'Most followed' },
];

function Option({ label, selected, onPress }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ExploreSortSheet({ value, recommended = true, onApply, onDismiss }) {
  const { bottom } = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const update = change => setDraft(previous => ({ ...previous, ...change }));
  const sorts = recommended ? SORTS : SORTS.filter(option => option.value !== RECOMMENDED);
  const chosen = !recommended && draft.sort === RECOMMENDED ? 'newest' : draft.sort;

  return (
    <DiscoveryBottomSheet title="Sort lists" closeLabel="Close sort" testID="explore-sort" onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.label}>Sort by</Text>
              <View style={styles.options}>
                {sorts.map(({ value: sort, label }) => (
                  <Option key={sort} label={label} selected={chosen === sort} onPress={() => update({ sort })} />
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Hide lists I already follow</Text>
                <Switch value={draft.hideFollowed} onValueChange={hideFollowed => update({ hideFollowed })}
                  accessibilityLabel="Hide lists I already follow" trackColor={{ true: colors.ink }} />
              </View>
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(12, bottom) }]}>
            <TouchableOpacity accessibilityRole="button" style={styles.footerButton}
              onPress={() => setDraft(DEFAULT_EXPLORE_SORT)}>
              <Text style={styles.actionText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.footerButton, styles.apply]}
              onPress={() => { onApply(draft); dismiss(); }}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </DiscoveryBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  bodyContent: { paddingBottom: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 14, paddingBottom: 14, gap: 8 },
  label: { color: '#323232', fontSize: 16, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44, maxWidth: '100%', justifyContent: 'center', paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD5CC', backgroundColor: colors.field,
  },
  optionSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionText: { color: '#36322E', fontSize: 14, fontWeight: '500' },
  optionTextSelected: { color: colors.white },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, color: '#323232', fontSize: 16, fontWeight: '600' },
  footer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
  },
  footerButton: {
    flexGrow: 1, flexBasis: '45%', minHeight: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', padding: 10,
  },
  apply: { backgroundColor: colors.ink },
  actionText: { fontSize: 15, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  applyText: { color: colors.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
