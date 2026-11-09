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
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ImageBackground,
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

  const entrance = useEntrance(4);

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

        {/* Seasonal Categories Container */}
        <View style={styles.seasonContainer}>
          {/* =========================
              FALL SEASON CARD
              ========================= */}
          <Animated.View style={entrance[0]}>
            <TouchableOpacity
              style={styles.seasonTouchable} // Base styles for the touchable area
              onPress={() => openSeason('FallDatesScreen')} // Navigates to FallDatesScreen on press
              accessible={true} // Enables accessibility
              accessibilityRole="button"
              accessibilityLabel="Fall Season - View Active Date Ideas" // Accessibility label for screen readers
            >
              {/* Background Image for Fall Season */}
              <ImageBackground
                source={seasonalImages.fall} // Fall season image
                style={styles.imageBackground} // Styles for the image background
                imageStyle={{ borderRadius: 12, opacity: 1 }} // Additional image styles
              >
                {/* Text Container for Season Title and Subtitle */}
                <View style={styles.textContainer}>
                  {/* Fall Season Title */}
                  <Text style={[styles.seasonTitle, styles.fallTitle]}>Fall</Text>

                  {/* Fall Season Subtitle displaying active date idea count */}
                  <Text style={[styles.seasonSubtitle, styles.fallSubtitle]}>
                    {fallCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* =========================
              WINTER SEASON CARD
              ========================= */}
          <Animated.View style={entrance[1]}>
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => openSeason('WinterDatesScreen')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Winter Season - View Active Date Ideas"
            >
              <ImageBackground
                source={seasonalImages.winter}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 12, opacity: 1 }}
              >
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.winterTitle]}>Winter</Text>
                  <Text style={[styles.seasonSubtitle, styles.winterSubtitle]}>
                    {winterCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* =========================
              SPRING SEASON CARD
              ========================= */}
          <Animated.View style={entrance[2]}>
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => openSeason('SpringDatesScreen')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Spring Season - View Active Date Ideas"
            >
              <ImageBackground
                source={seasonalImages.spring}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 12, opacity: 1 }}
              >
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.springTitle]}>Spring</Text>
                  <Text style={[styles.seasonSubtitle, styles.springSubtitle]}>
                    {springCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* =========================
              SUMMER SEASON CARD
              ========================= */}
          <Animated.View style={entrance[3]}>
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => openSeason('SummerDatesScreen')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Summer Season - View Active Date Ideas"
            >
              <ImageBackground
                source={seasonalImages.summer}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 12, opacity: 1 }}
              >
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.summerTitle]}>Summer</Text>
                  <Text style={[styles.seasonSubtitle, styles.summerSubtitle]}>
                    {summerCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

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

  // Touchable Area for Each Season Card
  seasonTouchable: {
    width: '100%', // Full width of the container
    height: 160, // Fixed height for consistency
    borderRadius: 12, // Rounded corners for aesthetics
    marginBottom: 24, // Space below each season card
    overflow: 'hidden', // Clips any child content outside the container
  },

  // Image Background for Season Cards
  imageBackground: {
    flex: 1, // Takes up the full available space
    justifyContent: 'flex-start', // Aligns children at the top
  },

  // Text Container within Season Cards
  textContainer: {
    paddingHorizontal: 20, // Horizontal padding inside the container
    paddingTop: 20, // Top padding for spacing
  },

  // Season Title Text Style
  seasonTitle: {
    fontSize: 35, // Large font size for the season title
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#FFFFFF', // White color for contrast against the background image
  },

  // Season Subtitle Text Style displaying active date idea counts
  seasonSubtitle: {
    marginTop: 2, // Space above the subtitle
    fontSize: 14, // Font size for the subtitle
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#FFFFFF', // White color for readability
  },

  // Specific Title Colors for Each Season (can be customized if needed)
  fallTitle: {
    color: '#FFFFFF', // White color for Fall season
  },
  fallSubtitle: {
    color: '#FFFFFF', // White color for Fall subtitle
  },
  winterTitle: {
    color: '#FFFFFF', // White color for Winter season
  },
  winterSubtitle: {
    color: '#FFFFFF', // White color for Winter subtitle
  },
  springTitle: {
    color: '#FFFFFF', // White color for Spring season
  },
  springSubtitle: {
    color: '#FFFFFF', // White color for Spring subtitle
  },
  summerTitle: {
    color: '#FFFFFF', // White color for Summer season
  },
  summerSubtitle: {
    color: '#FFFFFF', // White color for Summer subtitle
  },

  // Loading Container for ActivityIndicator
  loadingContainer: {
    flex: 1, // Takes up the full available space
    justifyContent: 'center', // Centers children vertically
    alignItems: 'center', // Centers children horizontally
  },
});
