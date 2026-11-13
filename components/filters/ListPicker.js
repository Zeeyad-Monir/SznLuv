// Pick from someone's lists, however many they have. The first few show; "Show more" reveals the rest in
// batches; the Search button opens a field that searches every list, shown or not. With a filter
// (`selectedIds`), the picks are also kept as chips at the top, so one stays in view when it is past the
// shown batch or outside the search. Used by the Map's filter and by Add to list.
import React, { useMemo, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalize } from '../../services/spotDiscovery';
import { getReduceMotion } from '../../hooks/useReduceMotion';
import { colors } from '../theme';
import FilterSection from './FilterSection';
import shared from './styles';

export const FIRST_BATCH = 5;
export const NEXT_BATCH = 10;

const animate = () => {
  if (!getReduceMotion()) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};
const labelOf = ({ title, caption }) => [title, caption].filter(Boolean).join(', ');

function ListRow({ item, checked, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.row, style]} onPress={onPress} accessibilityRole="checkbox"
      accessibilityState={{ checked }} accessibilityLabel={labelOf(item)}>
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {!!item.caption && <Text style={styles.caption} numberOfLines={1}>{item.caption}</Text>}
      </View>
      <View style={[styles.check, checked && styles.checked]}>
        {checked && <Ionicons name="checkmark" size={18} color={colors.white} />}
      </View>
    </TouchableOpacity>
  );
}

// `items` are { id, title, caption }. With `selectedIds` and `onClear` it is a filter that shows its picks;
// without them, `isChecked` says which rows are ticked and a tap acts straight away (Add to list).
export default function ListPicker({
  title, items, selectedIds, isChecked = id => selectedIds?.includes(id), onToggle, onClear,
  emptyText, searchLabel = 'Search lists', rowStyle, maxHeight, first,
}) {
  const [shown, setShown] = useState(FIRST_BATCH);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtering = !!selectedIds;
  const batched = items.length > FIRST_BATCH;

  const words = normalize(query).split(' ').filter(Boolean);
  const searching = searchOpen && words.length > 0;
  const searchable = useMemo(() => items.map(item => ({ item, text: normalize(labelOf(item)) })), [items]);
  const visible = searching
    ? searchable.filter(({ text }) => words.every(word => text.includes(word))).map(({ item }) => item)
    : items.slice(0, batched ? shown : items.length);
  const remaining = searching ? 0 : items.length - visible.length;
  const picked = filtering ? items.filter(item => selectedIds.includes(item.id)) : [];

  const openSearch = () => { animate(); setSearchOpen(true); };
  const closeSearch = () => { animate(); setQuery(''); setSearchOpen(false); };
  const showMore = () => { animate(); setShown(count => count + NEXT_BATCH); };

  const accessory = (
    <>
      {filtering && picked.length > 0 && (
        <Text style={shared.hint} accessibilityLiveRegion="polite">{picked.length} selected</Text>
      )}
      {batched && !searchOpen && (
        <TouchableOpacity style={styles.searchButton} accessibilityRole="button"
          accessibilityLabel={searchLabel} onPress={openSearch}>
          <Ionicons name="search" size={16} color={colors.ink} />
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const rows = visible.map(item => (
    <ListRow key={item.id} item={item} checked={!!isChecked(item.id)} onPress={() => onToggle(item)}
      style={rowStyle?.(item)} />
  ));

  return (
    <FilterSection title={title} accessory={items.length ? accessory : null} first={first}>
      {items.length === 0 ? <Text style={shared.hint}>{emptyText}</Text> : (
        <>
          {searchOpen && (
            <View style={styles.searchRow}>
              <View style={styles.field}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput style={styles.input} value={query} onChangeText={setQuery} autoFocus
                  placeholder={searchLabel} placeholderTextColor={colors.placeholder} accessibilityLabel={searchLabel}
                  autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
              </View>
              <TouchableOpacity style={styles.cancel} accessibilityRole="button" accessibilityLabel="Close list search"
                onPress={closeSearch}>
                <Text style={shared.actionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {filtering && batched && picked.length > 0 && (
            <View style={styles.chips}>
              {picked.map(item => (
                <TouchableOpacity key={item.id} style={styles.chip} accessibilityRole="button"
                  accessibilityLabel={`Remove ${labelOf(item)}`} onPress={() => onToggle(item)}>
                  <Text style={styles.chipText} numberOfLines={1}>{item.title}</Text>
                  <Ionicons name="close" size={16} color={colors.white} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {maxHeight ? <ScrollView style={{ maxHeight }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <View style={styles.rows}>{rows}</View>
          </ScrollView> : <View style={styles.rows}>{rows}</View>}
          {searching && visible.length === 0 && (
            <View style={styles.none}>
              <Text style={shared.hint} accessibilityLiveRegion="polite">No lists match “{query.trim()}”.</Text>
              <TouchableOpacity style={shared.inlineAction} accessibilityRole="button" onPress={() => setQuery('')}>
                <Text style={[shared.actionText, shared.underlined]}>Clear search</Text>
              </TouchableOpacity>
            </View>
          )}
          {(remaining > 0 || (filtering && picked.length > 0)) && (
            <View style={styles.links}>
              {remaining > 0 && (
                <TouchableOpacity style={shared.inlineAction} accessibilityRole="button"
                  accessibilityHint={`${remaining} more ${remaining === 1 ? 'list' : 'lists'} not shown yet`} onPress={showMore}>
                  <Text style={shared.actionText}>Show {Math.min(NEXT_BATCH, remaining)} more</Text>
                </TouchableOpacity>
              )}
              {filtering && picked.length > 0 && (
                <TouchableOpacity style={[shared.inlineAction, styles.clear]} accessibilityRole="button" onPress={onClear}>
                  <Text style={[shared.actionText, shared.underlined]}>Clear selection</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </FilterSection>
  );
}

const styles = StyleSheet.create({
  searchButton: {
    minHeight: 36, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.optionBorder,
    // A 44pt target around the 36pt pill.
    marginVertical: -4,
  },
  searchButtonText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  field: {
    flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, borderRadius: 22,
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.optionBorder,
  },
  input: { flex: 1, minHeight: 44, paddingHorizontal: 8, fontSize: 16, color: colors.inputText },
  cancel: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    maxWidth: '100%', minHeight: 36, paddingLeft: 12, paddingRight: 8, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.ink,
  },
  chipText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.white },
  rows: { gap: 8 },
  row: {
    minHeight: 56, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.optionBorder, backgroundColor: colors.field,
  },
  words: { flex: 1 },
  title: { color: colors.optionText, fontSize: 16, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 13, fontWeight: '500', marginTop: 2 },
  check: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.ink, backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  checked: { backgroundColor: colors.ink },
  none: { alignItems: 'flex-start' },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16 },
  clear: { marginLeft: 'auto' },
});
