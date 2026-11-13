// The search field and its filter button, shared by every search screen: spot pages, the Map, Explore
// and Add a spot, so they look and behave the same everywhere.
import React, { forwardRef } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

// The one search field every search screen uses: spot pages, the Map, Explore and Add a spot.
// `busy` swaps the clear button for a spinner while results load; the ref reaches the text input.
export const SearchBar = forwardRef(function SearchBar({
  value, onChangeText, placeholder = 'Search spots', accessibilityLabel = placeholder, busy = false, style, onFocus, onBlur,
}, ref) {
  return (
    <View style={[controlStyles.searchBar, style]}>
      <Icon name="search" size={22} color={colors.muted} accessible={false} importantForAccessibility="no" />
      <TextInput ref={ref}
        style={controlStyles.searchInput} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.placeholder} accessibilityLabel={accessibilityLabel}
        autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss}
        onFocus={onFocus} onBlur={onBlur}
      />
      {busy && <ActivityIndicator style={controlStyles.searchSlot} color={colors.ink} />}
      {!!value && !busy && (
        <TouchableOpacity style={controlStyles.searchSlot} accessibilityRole="button"
          accessibilityLabel="Clear search" onPress={() => onChangeText('')}>
          <Icon name="cancel" size={20} color={colors.muted} accessible={false} importantForAccessibility="no" />
        </TouchableOpacity>
      )}
    </View>
  );
});
export const SpotSearchBar = SearchBar;

// The button beside a search bar that opens its filter or sort sheet. It fills with ink, with a dot,
// while anything is changed from the default.
export const FilterButton = forwardRef(function FilterButton({
  active, expanded, onPress, style, label = 'Filter spots', activeLabel = `${label}, filters active`,
}, ref) {
  return (
    <TouchableOpacity ref={ref} style={[controlStyles.filterButton, style, active && controlStyles.filterActive]}
      accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={active ? activeLabel : label} onPress={onPress}>
      <Ionicons name="options-outline" size={24} color={active ? colors.white : colors.ink} />
      {active && <View pointerEvents="none" style={controlStyles.activeDot} />}
    </TouchableOpacity>
  );
});
export const SpotFilterButton = FilterButton;

const controlStyles = StyleSheet.create({
  searchBar: {
    flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 14,
    borderRadius: 24, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  searchInput: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 8, fontSize: 16, color: colors.inputText },
  searchSlot: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filterButton: {
    width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.field, borderRadius: 24, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  activeDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.snackbarAction },
});
