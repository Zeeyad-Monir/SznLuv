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
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';

// Importing navigation hook to navigate between screens
import { useNavigation } from '@react-navigation/native';

// Importing AuthContext to access authenticated user information
import { AuthContext } from '../contexts/AuthContext';

// Importing Firebase authentication and database functions
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Importing a custom navigation bar component
import NavBar from '../components/NavBar';

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

// Flat card colour (no photo yet) for the Vancouver card
const vancouverCardColor = '#4A6FA5';

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
  // Initializing navigation hook to enable screen navigation
  const navigation = useNavigation();

  // Accessing the authenticated user from AuthContext
  const { user } = useContext(AuthContext);

  // =========================
  // STATE VARIABLES SECTION
  // =========================

  // State to store the user's name
  const [userName, setUserName] = useState('');

  // State to manage the loading indicator visibility
  const [loading, setLoading] = useState(true);

  // =========================
  // ANIMATED VALUES SECTION
  // =========================

  // Animated values for the greeting text animations
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(-20)).current;

  // Animated values for the Vancouver card's entrance animation
  const vancouverAnimation = {
    translateY: useRef(new Animated.Value(30)).current,
    opacity: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0.9)).current,
  };

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

  /**
   * fetchData Function
   *
   * Retrieves user information.
   * Sets the loading state to false once data fetching is complete.
   */
  const fetchData = async () => {
    await fetchUserName(); // Fetching user's name
    setLoading(false); // Setting loading to false after data is fetched
  };

  // =========================
  // USE EFFECTS SECTION
  // =========================

  /**
   * useEffect Hook: Fetches initial data when the component mounts.
   */
  useEffect(() => {
    fetchData(); // Initiates data fetching on component mount
  }, []);

  /**
   * useEffect Hook: Triggers animations once the loading state changes.
   *
   * - Animates the greeting text fading in and sliding into position.
   * - Animates the Vancouver card's entrance with fade-in, slide-up, and scaling effects.
   */
  useEffect(() => {
    if (!loading) {
      // Animating the greeting container
      Animated.parallel([
        Animated.timing(greetingOpacity, {
          toValue: 1, // Final opacity
          duration: 700, // Duration of the animation
          useNativeDriver: true, // Enables native driver for better performance
        }),
        Animated.timing(greetingTranslateY, {
          toValue: 0, // Final vertical position
          duration: 700,
          easing: Easing.out(Easing.ease), // Easing function for smoothness
          useNativeDriver: true,
        }),
      ]).start();

      // Animating the Vancouver card
      const delay = 500; // Delay before the animation starts

      Animated.parallel([
        // Animating opacity
        Animated.timing(vancouverAnimation.opacity, {
          toValue: 1, // Final opacity
          duration: 600, // Duration of the animation
          delay: delay, // Delay before the animation starts
          useNativeDriver: true,
        }),
        // Animating vertical translation
        Animated.timing(vancouverAnimation.translateY, {
          toValue: 0, // Final vertical position
          duration: 600,
          delay: delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // Animating scaling
        Animated.spring(vancouverAnimation.scale, {
          toValue: 1, // Final scale
          friction: 5, // Friction for the spring effect
          tension: 40, // Tension for the spring effect
          delay: delay,
          useNativeDriver: true,
        }),
      ]).start(); // Starting the parallel animations
    }
  }, [loading]);

  // =========================
  // CONDITIONAL RENDERING SECTION
  // =========================

  let content;

  if (loading) {
    // Display a loading indicator while data is being fetched
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* Custom Navigation Bar */}
      <NavBar />

      {/* ScrollView to allow vertical scrolling of content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Greeting Container with Animations */}
        <Animated.View
          style={[
            styles.greetingContainer, // Base styles
            {
              opacity: greetingOpacity, // Animated opacity
              transform: [{ translateY: greetingTranslateY }], // Animated vertical translation
            },
          ]}
        >
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
          <Animated.View
            style={[
              {
                opacity: vancouverAnimation.opacity, // Animated opacity
                transform: [
                  { translateY: vancouverAnimation.translateY }, // Animated vertical translation
                  { scale: vancouverAnimation.scale }, // Animated scaling
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.seasonTouchable, { backgroundColor: vancouverCardColor }]} // Base card styles with a flat colour
              onPress={() => navigation.navigate('VancouverScreen')} // Navigates to VancouverScreen on press
              accessible={true} // Enables accessibility
              accessibilityLabel="Vancouver - View Vancouver" // Accessibility label for screen readers
            >
              {/* Text Container for the card title */}
              <View style={styles.textContainer}>
                <Text style={styles.seasonTitle}>Vancouver</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Spacer at the bottom of the cards */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
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

  // Text Container within Cards
  textContainer: {
    paddingHorizontal: 20, // Horizontal padding inside the container
    paddingTop: 20, // Top padding for spacing
  },

  // Card Title Text Style
  seasonTitle: {
    fontSize: 35, // Large font size for the card title
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#FFFFFF', // White color for contrast against the card colour
  },

  // Loading Container for ActivityIndicator
  loadingContainer: {
    flex: 1, // Takes up the full available space
    justifyContent: 'center', // Centers children vertically
    alignItems: 'center', // Centers children horizontally
  },
});
