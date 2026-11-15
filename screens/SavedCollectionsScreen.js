// "View all" for Saved Collections: every collection the user kept, two to a row. The search and filters are
// the Saved page's own, so what was typed there is already applied here.
import React, { useState } from 'react';
import { Animated, FlatList, Keyboard, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EmptyCard from '../components/EmptyCard';
import SavedCollectionCard from '../components/SavedCollectionCard';
import SavedControls, { isNarrowed } from '../components/SavedControls';
import savedStyles from '../components/savedPageStyles';
import { GRID_GAP, tileWidth } from '../components/theme';
import useEntrance from '../hooks/useEntrance';
import useSavedLibrary from '../hooks/useSavedLibrary';
import useSavedQuery from '../hooks/useSavedQuery';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { openCollection } from '../services/collections';
import { filterSaved } from '../services/savedLibrary';
import { canNavigate } from '../services/venueNavigation';

export default function SavedCollectionsScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const scrollStyle = useFloatingScrollStyle(savedStyles.list);
  const entrance = useEntrance(2);
  const library = useSavedLibrary();
  const savedQuery = useSavedQuery();
  const { query, setQuery, filters, setFilters } = savedQuery;
  const [sheetOpen, setSheetOpen] = useState(false);
  const narrowed = isNarrowed(query, filters, false);
  const collections = filterSaved(library.collections, { ...filters, type: 'all', query });
  const size = tileWidth(width);

  const open = item => {
    if (!canNavigate(navigation)) return;
    Keyboard.dismiss();
    const { screen, params } = openCollection(item.collection);
    if (params) navigation.navigate(screen, params);
    else navigation.navigate(screen);
  };

  const total = library.collections.length;
  const count = narrowed
    ? `${collections.length} of ${total} ${total === 1 ? 'collection' : 'collections'}`
    : `${total} ${total === 1 ? 'collection' : 'collections'}`;
  const empty = total === 0 ? (
    <EmptyCard icon="favorite-border" title="No saved collections"
      text="Tap the heart on a season to keep the whole collection here."
      actionLabel="Browse seasons" onAction={() => navigation.navigate('HomeTab', { screen: 'SeasonsScreen', initial: false })} />
  ) : (
    <EmptyCard icon="search-off" title="No collections match"
      text="Try another search, or clear the filters."
      actionLabel="Clear search" onAction={() => { setQuery(''); setFilters({ ...filters, seasons: [] }); }} />
  );

  return (
    <SignedInScreen style={savedStyles.container}>
      <Animated.View style={[savedStyles.header, entrance[0]]}>
        <Text style={savedStyles.title} accessibilityRole="header">Saved Collections</Text>
        <SavedControls state={savedQuery} placeholder="Search your collections" showType={false}
          sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} />
        <Text style={savedStyles.count} accessibilityLiveRegion="polite">{count}</Text>
      </Animated.View>
      <Animated.View style={[savedStyles.body, entrance[1]]}>
        <FlatList data={collections} keyExtractor={item => item.key} numColumns={2}
          columnWrapperStyle={styles.row} contentContainerStyle={scrollStyle}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          ListEmptyComponent={library.collectionsStatus === 'ready' || library.collectionsStatus === 'error' ? empty : null}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <SavedCollectionCard item={item} width={size} height={Math.round(size * 0.76)}
                onPress={() => open(item)} onToggle={() => library.toggleCollection(item)} />
            </View>
          )} />
      </Animated.View>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  row: { gap: GRID_GAP },
  cell: { marginBottom: GRID_GAP },
});
