// SCREENS/SEASONSSCREEN.JS
// Holds the four season cards (Fall, Winter, Spring, Summer) that used to live directly on the Home screen.
// Home -> SeasonsScreen (the Seasonal card) -> the individual season screens.

// =========================
// IMPORTS SECTION
// =========================

import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';

// Importing navigation hook to navigate between screens
import { useNavigation } from '@react-navigation/native';

// Importing Firebase database functions
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { fallSpotNames } from '../services/spots';
import { winterSpotNames } from '../services/seasonSpots';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { GUTTER, text } from '../components/theme';
import useEntrance from '../hooks/useEntrance';
import { useCollectionHeart } from '../hooks/useSavedCollections';
import CollectionCard from '../components/CollectionCard';
import { useCity } from '../contexts/CityContext';
import { collectionsForCity } from '../services/collections';
import { canNavigate } from '../services/venueNavigation';

// =========================
// CONSTANTS SECTION
// =========================

// Importing seasonal images for different seasons
const seasonalImages = {
  fall: require('../assets/fall2.png'),
  winter: require('../assets/winter2.png'),
  spring: require('../assets/spring2.png'),
  summer: require('../assets/summer3.png'),
};

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

  // =========================
  // STATE VARIABLES SECTION
  // =========================

  // Counts start from the local defaults so the cards are complete the moment the page arrives
  const [fallCount, setFallCount] = useState(fallSpotNames.length);
  const [springCount, setSpringCount] = useState(4);
  const [summerCount, setSummerCount] = useState(3);

  const { city } = useCity();
  const collections = collectionsForCity(city.id);
  const counts = { fall: fallCount, winter: winterSpotNames.length, spring: springCount, summer: summerCount };
  const entrance = useEntrance(collections.length);
  // Each card's heart keeps that whole collection in My lists, apart from the spots' own hearts.
  const { isSaved, toggleHeart } = useCollectionHeart();

  // Two quick taps on different cards must not push two pages
  const openSeason = (route) => {
    if (canNavigate(navigation)) navigation.navigate(route);
  };

  // =========================
  // DATA FETCHING FUNCTIONS
  // =========================

  /**
   * fetchDateCounts Function
   *
   * Fetches the count of active date ideas for each season from Firebase Firestore.
   * If the count documents exist, it retrieves the counts; otherwise, sets default values.
   */
  const fetchDateCounts = async () => {
    try {
      // Fall count comes from the spot list itself (services/spots.js) so it always matches the Fall screen
      setFallCount(fallSpotNames.length);

      // Fetching Spring date count
      const springDatesRef = doc(db, 'dateCounts', 'spring');
      const springDatesSnap = await getDoc(springDatesRef);
      setSpringCount(springDatesSnap.exists() ? springDatesSnap.data().count : 4);

      // Fetching Summer date count
      const summerDatesRef = doc(db, 'dateCounts', 'summer');
      const summerDatesSnap = await getDoc(summerDatesRef);
      setSummerCount(summerDatesSnap.exists() ? summerDatesSnap.data().count : 3);
    } catch (error) {
      console.error('Error fetching date counts:', error); // Logging any errors
      // Setting default counts in case of error
      setFallCount(fallSpotNames.length);
      setSpringCount(0);
      setSummerCount(0);
    }
  };

  // =========================
  // USE EFFECTS SECTION
  // =========================

  useEffect(() => {
    fetchDateCounts();
  }, []);

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
                count={counts[collection.key]}
                art={seasonalImages[collection.key]}
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
