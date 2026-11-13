// A page of catalogue spots to browse: its title, search and filters, the Spots/Map switch, and the spots
// under their section headings with a heart on each. The season pages, a themed collection and
// "All spots" are all this, each with its own sections and colours.
//
// `sections` is [{ title, spots }] and must keep the same identity between renders: the search index is
// rebuilt whenever it changes. `sectionKey` names where this page's search text and filters are kept
// (hooks/useSpotDiscovery.js), so they survive leaving the page and coming back.
import React, { useState } from 'react';
import { Alert, Animated, Keyboard, ScrollView, StyleSheet, Text } from 'react-native';
import ListBody from './ListBody';
import SpotDiscoveryControls, { SpotEmptyState } from './SpotDiscoveryControls';
import { colors } from './theme';
import useEntrance from '../hooks/useEntrance';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import useSpotDiscovery from '../hooks/useSpotDiscovery';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { catalogueRef, resolveSpot } from '../services/catalogue';
import { openSpot } from '../services/venueNavigation';

export default function SpotBrowser({
  navigation, title, sectionKey, sections, search, backgroundColor = colors.page, ink = colors.ink, backdrop, spotMeta,
}) {
  const scrollStyle = useFloatingScrollStyle(styles.content);
  const entrance = useEntrance(2);
  const [view, setView] = useState('spots');
  const discovery = useSpotDiscovery(sectionKey, sections, search);
  const [favourites, setFavourites] = useFavouriteSpots(() => {
    Alert.alert('Favourites unavailable', 'Check your connection and account access.');
  });
  const { saveRef, isSaved } = useSaveSpot(favourites, setFavourites);
  const listed = discovery.sections.map(({ title: heading, spots }) => ({
    title: heading,
    entries: spots.map(({ name }) => {
      const ref = catalogueRef(name);
      const spot = resolveSpot(ref);
      // `spotMeta` chooses the small line under a spot's name when the page already says the rest.
      return { ref, spot: spotMeta ? { ...spot, meta: spotMeta(spot) } : spot, status: 'ready' };
    }),
  }));

  return (
    <SignedInScreen style={[styles.container, { backgroundColor }]}>
      {backdrop}
      <Animated.View style={entrance[0]}>
        <Text style={[styles.title, { color: ink }]} accessibilityRole="header">{title}</Text>
        <SpotDiscoveryControls discovery={discovery} />
      </Animated.View>
      <ScrollView ref={discovery.listRef} contentContainerStyle={scrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Animated.View style={entrance[1]}>
          <ListBody sections={listed} view={view} onViewChange={setView} isSaved={isSaved} onSave={saveRef}
            onOpen={ref => { Keyboard.dismiss(); openSpot(navigation, ref); }}
            sectionTitleStyle={[styles.sectionTitle, { color: ink }]}
            empty={<SpotEmptyState discovery={discovery} />} />
        </Animated.View>
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 },
  title: {
    fontSize: 38, fontWeight: 'bold', textAlign: 'center', marginTop: SCREEN_CONTENT_TOP_GAP, marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
});
