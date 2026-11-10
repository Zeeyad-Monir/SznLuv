import React, { useState } from 'react';
import { Alert, Animated, Keyboard, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import BackgroundLottie from '../components/BackgroundLottie';
import ListBody from '../components/ListBody';
import SpotDiscoveryControls, { SpotEmptyState } from '../components/SpotDiscoveryControls';
import useEntrance from '../hooks/useEntrance';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import useSpotDiscovery from '../hooks/useSpotDiscovery';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { catalogueRef, resolveSpot } from '../services/catalogue';
import { fallCategories } from '../services/spots';
import { springCategories, summerCategories, winterCategories } from '../services/seasonSpots';
import { openSpot } from '../services/venueNavigation';

const seasons = {
  Fall: {
    categories: fallCategories, backgroundColor: '#F4A460', ink: '#F5F5DC',
    animation: require('../assets/fallingLeaves.json'), speed: 0.6, scale: 1.65, opacity: 0.6,
    search: { rankSearch: true },
  },
  Winter: {
    categories: winterCategories, backgroundColor: '#B9CCEC', ink: '#FFFFFF',
    animation: require('../assets/snowFalling.json'), speed: 0.3, scale: 1.65, opacity: 0.6,
  },
  Spring: {
    categories: springCategories, backgroundColor: '#FFB6C1', ink: '#FFFFFF',
    animation: require('../assets/flowerFalling2.json'), speed: 0.8, scale: 2.8, opacity: 0.3,
  },
  Summer: {
    categories: summerCategories, backgroundColor: '#F8DD74', ink: '#FFF8F0',
    animation: require('../assets/summerFalling.json'), speed: 0.3, scale: 1.8, opacity: 0.6,
  },
};

export default function SeasonSpotsScreen({ navigation, season }) {
  const { categories, backgroundColor, ink, animation, speed, scale, opacity, search } = seasons[season];
  const { width, height } = useWindowDimensions();
  const scrollStyle = useFloatingScrollStyle(styles.content);
  const entrance = useEntrance(2);
  const [view, setView] = useState('spots');
  const discovery = useSpotDiscovery(season.toLowerCase(), categories, search);
  const [favourites, setFavourites] = useFavouriteSpots(() => {
    Alert.alert('Favourites unavailable', 'Check your connection and account access.');
  });
  const { saveRef, isSaved } = useSaveSpot(favourites, setFavourites);
  const sections = discovery.sections.map(({ title, spots }) => ({
    title,
    entries: spots.map(({ name }) => {
      const ref = catalogueRef(name);
      const spot = resolveSpot(ref);
      // Every card here is in this season, so the card names only the town.
      return { ref, spot: { ...spot, meta: spot.locality ?? '' }, status: 'ready' };
    }),
  }));

  return (
    <SignedInScreen style={[styles.container, { backgroundColor }]}>
      <BackgroundLottie source={animation} speed={speed} style={{
        position: 'absolute', width: width * 1.2, height: height * 1.5, top: -height * 0.2, left: -width * 0.25,
        transform: [{ scale }], opacity,
      }} />
      <Animated.View style={entrance[0]}>
        <Text style={[styles.title, { color: ink }]} accessibilityRole="header">{season} Dates</Text>
        <SpotDiscoveryControls discovery={discovery} />
      </Animated.View>
      <ScrollView ref={discovery.listRef} contentContainerStyle={scrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Animated.View style={entrance[1]}>
          <ListBody sections={sections} view={view} onViewChange={setView} isSaved={isSaved} onSave={saveRef}
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
  title: { fontSize: 38, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
});
