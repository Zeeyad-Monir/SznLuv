// SCREENS/SEASONSSCREEN.JS
// Holds the four season cards (Fall, Winter, Spring, Summer) that used to live directly on the Home screen.
// Home -> SeasonsScreen (the Seasonal card) -> the individual season screens.

// =========================
// IMPORTS SECTION
// =========================

import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';

// Importing navigation hook to navigate between screens
import { useNavigation } from '@react-navigation/native';

import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { GUTTER, text } from '../components/theme';
import useEntrance from '../hooks/useEntrance';
import { useCollectionHeart } from '../hooks/useSavedCollections';
import CollectionCard from '../components/CollectionCard';
import { SEASON_ART, SEASON_TINT } from '../components/covers';
import { useCity } from '../contexts/CityContext';
import { collectionsForCity, collectionSpots } from '../services/collections';
import { canNavigate } from '../services/venueNavigation';

// =========================
// CONSTANTS SECTION
// =========================

// The season illustrations and their backing colours live with the rest of the app's art.

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * SeasonsScreen Component
 *
 * Displays the seasonal categories (Fall, Winter, Spring, Summer) with active date idea counts
 * and allows navigation to the respective seasonal date screens.
 */
export default function SeasonsScreen() {
  const floatingScrollStyle = useFloatingScrollStyle(styles.scrollContent);
  // Initializing navigation hook to enable screen navigation
  const navigation = useNavigation();

  const { city } = useCity();
  const collections = collectionsForCity(city.id);
  const entrance = useEntrance(collections.length);
  // Each card's heart keeps that whole collection in Saved, apart from the spots' own hearts.
  const { isSaved, toggleHeart } = useCollectionHeart();

  // Two quick taps on different cards must not push two pages
  const openSeason = (route) => {
    if (canNavigate(navigation)) navigation.navigate(route);
  };

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <SignedInScreen style={styles.container}>
      {/* ScrollView to allow vertical scrolling of content */}
      <ScrollView contentContainerStyle={floatingScrollStyle}>
        {/* Heading for the seasonal categories */}
        <Text accessibilityRole="header" style={text.sectionLabel}>Seasons</Text>

        {/* Seasonal Categories Container: one card per collection SznLuv makes for this city */}
        <View>
          {collections.map((collection, index) => (
            <Animated.View key={collection.id} style={entrance[index]}>
              <CollectionCard
                title={collection.title}
                count={collectionSpots(collection.id).length}
                art={SEASON_ART[collection.key]}
                tint={SEASON_TINT[collection.key]}
                accessibilityLabel={`${collection.title} Season - View Active Date Ideas`}
                onPress={() => openSeason(collection.screen)}
                saved={isSaved(collection.id)}
                onToggleSave={() => toggleHeart(collection.id)}
              />
            </Animated.View>
          ))}

          {/* Spacer at the bottom of the season cards */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </SignedInScreen>
  );
}

// =========================
// STYLESHEET SECTION
// =========================

const styles = StyleSheet.create({
  // Main container covering the entire screen
  container: {
    flex: 1, // Takes up the full available space
    backgroundColor: '#FFF5E4', // Light background color for a welcoming feel
  },

  // Styling for the ScrollView content container
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SCREEN_CONTENT_TOP_GAP,
    paddingBottom: 20, // Padding at the bottom to prevent content cutoff
    rowGap: 12,
  },

  // Loading Container for ActivityIndicator
  loadingContainer: {
    flex: 1, // Takes up the full available space
    justifyContent: 'center', // Centers children vertically
    alignItems: 'center', // Centers children horizontally
  },
});
