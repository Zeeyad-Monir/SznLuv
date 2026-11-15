// "View all" for Saved Spots: every spot the user kept, in one list that only draws what is on screen, so a
// few hundred saves scroll as smoothly as five. The search and filters are the Saved page's own.
import React, { useCallback, useState } from 'react';
import { Animated, FlatList, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AddOwnSpotBanner from '../components/AddOwnSpotBanner';
import EmptyCard from '../components/EmptyCard';
import SavedControls, { isNarrowed } from '../components/SavedControls';
import SavedSpotRow from '../components/SavedSpotRow';
import savedStyles from '../components/savedPageStyles';
import { colors } from '../components/theme';
import useEntrance from '../hooks/useEntrance';
import useSavedLibrary from '../hooks/useSavedLibrary';
import useSavedQuery from '../hooks/useSavedQuery';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { DEFAULT_SAVED_FILTERS, filterSaved, sortLabel } from '../services/savedLibrary';
import { canNavigate, openSpot } from '../services/venueNavigation';

export default function SavedSpotsScreen() {
  const navigation = useNavigation();
  const scrollStyle = useFloatingScrollStyle(savedStyles.list);
  const entrance = useEntrance(2);
  const library = useSavedLibrary();
  const savedQuery = useSavedQuery();
  const { query, setQuery, filters, setFilters } = savedQuery;
  const [sheetOpen, setSheetOpen] = useState(false);
  const narrowed = isNarrowed(query, filters);
  const spots = filterSaved(library.spots, { ...filters, query });

  const open = useCallback(item => { Keyboard.dismiss(); openSpot(navigation, item.ref); }, [navigation]);
  const addOwn = () => { if (canNavigate(navigation)) navigation.navigate('OwnSpotScreen', { from: 'saved' }); };

  const total = library.spots.length;
  const count = narrowed ? `${spots.length} of ${total} ${total === 1 ? 'spot' : 'spots'}` : `${total} ${total === 1 ? 'spot' : 'spots'}`;
  const header = (
    <>
      <AddOwnSpotBanner onPress={addOwn} />
      <View style={styles.summary}>
        <Text style={styles.count} accessibilityLiveRegion="polite">{count}</Text>
        <TouchableOpacity style={styles.sort} onPress={() => { Keyboard.dismiss(); setSheetOpen(true); }}
          accessibilityRole="button" accessibilityLabel={`Sort: ${sortLabel(filters.sort)}`}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          <Text style={styles.sortText}>Sort: {sortLabel(filters.sort)}</Text>
          <Icon name="expand-more" size={18} color={colors.ink} accessible={false} importantForAccessibility="no" />
        </TouchableOpacity>
      </View>
    </>
  );
  const empty = !library.spotsLoaded ? null : total === 0 ? (
    <EmptyCard icon="favorite-border" title="Nothing saved yet"
      text="Tap the heart on any spot to keep it here, or add a place of your own." />
  ) : (
    <EmptyCard icon="search-off" title="No spots match" text="Try another search, or clear the filters."
      actionLabel="Clear search" onAction={() => { setQuery(''); setFilters({ ...DEFAULT_SAVED_FILTERS, sort: filters.sort }); }} />
  );

  return (
    <SignedInScreen style={savedStyles.container}>
      <Animated.View style={[savedStyles.header, styles.header, entrance[0]]}>
        <Text style={savedStyles.title} accessibilityRole="header">Saved Spots</Text>
        <SavedControls state={savedQuery} placeholder="Search your saved spots" sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} />
      </Animated.View>
      <Animated.View style={[savedStyles.body, entrance[1]]}>
        <FlatList data={spots} keyExtractor={item => item.key} contentContainerStyle={scrollStyle}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          initialNumToRender={10} maxToRenderPerBatch={12} windowSize={9}
          ListHeaderComponent={header} ListEmptyComponent={empty}
          renderItem={({ item }) => <SavedSpotRow item={item} onOpen={open} onToggle={library.toggleSpot} />} />
      </Animated.View>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 16 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, marginBottom: 14 },
  count: { fontSize: 15, fontWeight: '700', color: colors.muted },
  sort: {
    minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 14, paddingRight: 10, borderRadius: 18,
    backgroundColor: colors.librarySegmentTrack,
  },
  sortText: { fontSize: 14, fontWeight: '600', color: colors.ink },
});
