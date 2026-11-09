// SCREENS/HOMESCREEN.JS
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on.

// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and hooks from React
import React, { useEffect, useState, useContext, useRef } from 'react';

// Importing React Native components and APIs
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
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import useEntrance from '../hooks/useEntrance';

// Importing AuthContext to access authenticated user information
import { AuthContext } from '../contexts/AuthContext';

// Importing Firebase authentication and database functions
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// =========================
// HELPER FUNCTIONS SECTION
// =========================

/**
 * hexToRGBA Function
 *
 * Converts a hex color code to an RGBA color string with the specified alpha transparency.
 *
 * @param {string} hex - The hex color code (e.g., '#FF8657' or '#FFF').
 * @param {number} alpha - The alpha transparency value (0 to 1).
 * @returns {string} - The resulting RGBA color string.
 */
const hexToRGBA = (hex, alpha) => {
  let r = 0, g = 0, b = 0;

  // Handling shorthand hex codes (e.g., '#FFF')
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // Handling full hex codes (e.g., '#FFFFFF')
  else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// =========================
// CONSTANTS SECTION
// =========================

// Defining base colors for each season
const seasonalColors = {
  fall: '#FF8657',
  winter: '#B9CCEC',
  spring: '#FF9FD2',
  summer: '#F8DD74',
};

// Defining opacity levels for each season's overlay
const seasonalOpacities = {
  fall: 0.1,
  winter: 0.3,
  spring: 0.3,
  summer: 0.3,
};

// Creating RGBA overlay colors for each season using the hexToRGBA helper function
const seasonalOverlays = {
  fall: hexToRGBA(seasonalColors.fall, seasonalOpacities.fall),
  winter: hexToRGBA(seasonalColors.winter, seasonalOpacities.winter),
  spring: hexToRGBA(seasonalColors.spring, seasonalOpacities.spring),
  summer: hexToRGBA(seasonalColors.summer, seasonalOpacities.summer),
};

// Cover image for the Vancouver card, slightly faded (opacity 0.9) with a thin white wash on top
const vancouverImage = require('../assets/cities/VancouverCoverIMG.png');
const COVER_IMAGE_OPACITY = 0.9;

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * HomeScreen Component
 *
 * This component serves as the main landing screen of the application.
 * It greets the user and displays the location categories (currently just Vancouver).
 * Vancouver opens VancouverScreen, which leads to the seasons (Fall, Winter, Spring, Summer).
 * The component also includes animations for a dynamic and engaging user experience.
 */
export default function HomeScreen() {
  const floatingScrollStyle = useFloatingScrollStyle(styles.scrollContent);
  // Initializing navigation hook to enable screen navigation
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // Re-tapping this section scrolls back to the top

  // Accessing the authenticated user from AuthContext
  const { user, username } = useContext(AuthContext);

  // =========================
  // STATE VARIABLES SECTION
  // =========================

  // Known from the sign-in profile check, so the greeting is complete on the first frame
  const [userName, setUserName] = useState(username || '');

  const entrance = useEntrance(2);

  // =========================
  // DATA FETCHING FUNCTIONS
  // =========================

  /**
   * fetchUserName Function
   *
   * Fetches the authenticated user's name from Firebase Firestore.
   * If the user's document exists, it retrieves the username; otherwise, defaults to 'User'.
   */
  const fetchUserName = async () => {
    try {
      const userRef = doc(db, 'users', user.uid); // Reference to the user's document
      const userSnap = await getDoc(userRef); // Fetching the document snapshot

      if (userSnap.exists()) {
        setUserName(userSnap.data().username); // Setting the username from Firestore
      } else {
        setUserName('User'); // Default username if document doesn't exist
      }
    } catch (error) {
      console.error('Error fetching user name:', error); // Logging any errors
      setUserName('User'); // Default username in case of error
    }
  };

  // =========================
  // USE EFFECTS SECTION
  // =========================

  useEffect(() => {
    if (!username) fetchUserName(); // App normally already has the name from the sign-in profile check
  }, []);

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <SignedInScreen style={styles.container}>
      {/* ScrollView to allow vertical scrolling of content */}
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}>
        {/* Greeting Container with Animations */}
        <Animated.View style={[styles.greetingContainer, entrance[0]]}>
          {/* Greeting Text */}
          <Text style={styles.greetingText}>Hello, {userName}!</Text>

          {/* Subtext indicating the location categories */}
          <Text style={styles.subtext}>Locations</Text>
        </Animated.View>

        {/* Location Categories Container */}
        <View style={styles.seasonContainer}>
          {/* =========================
              VANCOUVER CARD
              ========================= */}
          <Animated.View style={entrance[1]}>
            <TouchableOpacity
              style={styles.seasonTouchable} // Base styles for the touchable area
              onPress={() => navigation.navigate('VancouverScreen')} // Navigates to VancouverScreen on press
              accessible={true} // Enables accessibility
              accessibilityRole="button"
              accessibilityLabel="Vancouver - View Vancouver" // Accessibility label for screen readers
            >
              {/* Background image for the Vancouver card */}
              <ImageBackground
                source={vancouverImage}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 12, opacity: COVER_IMAGE_OPACITY }}
              >
                {/* Thin white layer over the image to wash out the colours a little */}
                <View style={styles.imageWash} pointerEvents="none" />

                {/* Text Container for the card title */}
                <View style={styles.textContainer}>
                  <Text style={styles.seasonTitle}>Vancouver</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Spacer at the bottom of the cards */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </SignedInScreen>
  );
}

// =========================
// STYLESHEET SECTION
// =========================

/**
 * Styles for HomeScreen components
 *
 * This stylesheet defines the visual appearance of the HomeScreen, including layout, colors, fonts, and spacing.
 */
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

  // Greeting Container
  greetingContainer: {
    marginTop: 40, // Space above the greeting
    paddingHorizontal: 20, // Horizontal padding inside the container
  },

  // Greeting Text Style
  greetingText: {
    fontSize: 55, // Large font size for prominence
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#333333', // Dark gray color for readability
  },

  // Subtext Style below the greeting
  subtext: {
    marginTop: 20, // Space above the subtext
    fontSize: 18, // Font size for the subtext
    marginBottom: -12, // Negative margin to adjust spacing
    color: '#C2B697', // Medium brown color for subtlety
    fontWeight: 'bold', // Bold font weight for emphasis
  },

  // Location Categories Container
  seasonContainer: {
    paddingHorizontal: 20, // Horizontal padding inside the container
    marginTop: 24, // Space above the cards
  },

  // Touchable Area for Each Card
  seasonTouchable: {
    width: '100%', // Full width of the container
    height: 160, // Fixed height for consistency
    borderRadius: 12, // Rounded corners for aesthetics
    marginBottom: 24, // Space below each card
    overflow: 'hidden', // Clips any child content outside the container
  },

  // Image background inside cards
  imageBackground: {
    flex: 1, // Takes up the full available space
    justifyContent: 'flex-start', // Aligns children at the top
  },

  // Thin white layer over the cover image
  imageWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Text Container within Cards
  textContainer: {
    paddingHorizontal: 20, // Horizontal padding inside the container
    paddingTop: 20, // Top padding for spacing
  },

  // Card Title Text Style
  seasonTitle: {
    fontSize: 35, // Large font size for the card title
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#FFFFFF', // White color for contrast against the card image
    textShadowColor: 'rgba(0, 0, 0, 0.55)', // Soft shadow keeps the title readable on light parts of the image
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Loading Container for ActivityIndicator
  loadingContainer: {
    flex: 1, // Takes up the full available space
    justifyContent: 'center', // Centers children vertically
    alignItems: 'center', // Centers children horizontally
  },
});
