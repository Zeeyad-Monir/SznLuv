// SCREENS/SEASONSSCREEN.JS
// Holds the four season cards (Fall, Winter, Spring, Summer) that used to live directly on the Home screen.
// Home -> VancouverScreen -> SeasonsScreen -> the individual season screens.

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
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import useEntrance from '../hooks/useEntrance';
import { useCollectionHeart } from '../hooks/useSavedCollections';
import CollectionCard from '../components/CollectionCard';
import { DEFAULT_CITY } from '../services/catalogue';
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
  const [winterCount, setWinterCount] = useState(4);
  const [springCount, setSpringCount] = useState(4);
  const [summerCount, setSummerCount] = useState(3);

  const collections = collectionsForCity(DEFAULT_CITY.id);
  const counts = { fall: fallCount, winter: winterCount, spring: springCount, summer: summerCount };
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

      // Fetching Winter date count
      const winterDatesRef = doc(db, 'dateCounts', 'winter');
      const winterDatesSnap = await getDoc(winterDatesRef);
      setWinterCount(winterDatesSnap.exists() ? winterDatesSnap.data().count : 4);

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
      setWinterCount(0);
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
        <View style={styles.headingContainer}>
          <Text style={styles.subtext}>Seasons</Text>
        </View>

        {/* Seasonal Categories Container: one card per collection SznLuv makes for this city */}
        <View style={styles.seasonContainer}>
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
    paddingBottom: 20, // Padding at the bottom to prevent content cutoff
  },

  // Container for the heading above the cards
  headingContainer: {
    marginTop: 40, // Space above the heading
    paddingHorizontal: 20, // Horizontal padding inside the container
  },

  // Heading text style (same look as the old Home "Seasons" label)
  subtext: {
    marginTop: 20, // Space above the heading
    fontSize: 18, // Font size for the heading
    marginBottom: -12, // Negative margin to adjust spacing
    color: '#C2B697', // Medium brown color for subtlety
    fontWeight: 'bold', // Bold font weight for emphasis
  },

  // Seasonal Categories Container
  seasonContainer: {
    paddingHorizontal: 20, // Horizontal padding inside the container
    marginTop: 24, // Space above the seasonal categories
  },

  // Loading Container for ActivityIndicator
  loadingContainer: {
    flex: 1, // Takes up the full available space
    justifyContent: 'center', // Centers children vertically
    alignItems: 'center', // Centers children horizontally
  },
});
