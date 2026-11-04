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
  ImageBackground,
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

// Importing seasonal images for different seasons
const seasonalImages = {
  fall: require('../assets/fall2.png'),
  winter: require('../assets/winter2.png'),
  spring: require('../assets/spring2.png'),
  summer: require('../assets/summer3.png'),
};

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

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * HomeScreen Component
 * 
 * This component serves as the main landing screen of the application.
 * It greets the user, displays seasonal categories (Fall, Winter, Spring, Summer) with active date idea counts,
 * and allows navigation to respective seasonal date screens.
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

  // States to store the count of active date ideas for each season
  const [fallCount, setFallCount] = useState(0);
  const [winterCount, setWinterCount] = useState(0);
  const [springCount, setSpringCount] = useState(0);
  const [summerCount, setSummerCount] = useState(0);

  // State to manage the loading indicator visibility
  const [loading, setLoading] = useState(true);

  // =========================
  // ANIMATED VALUES SECTION
  // =========================

  // Animated values for the greeting text animations
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(-20)).current;

  // Animated values for each seasonal category's entrance animations
  const seasonAnimations = [
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
  ];

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
   * fetchDateCounts Function
   * 
   * Fetches the count of active date ideas for each season from Firebase Firestore.
   * If the count documents exist, it retrieves the counts; otherwise, sets default values.
   */
  const fetchDateCounts = async () => {
    try {
      // Fetching Fall date count
      const fallDatesRef = doc(db, 'dateCounts', 'fall');
      const fallDatesSnap = await getDoc(fallDatesRef);
      setFallCount(fallDatesSnap.exists() ? fallDatesSnap.data().count : 7);

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
      setFallCount(0);
      setWinterCount(0);
      setSpringCount(0);
      setSummerCount(0);
    }
  };

  /**
   * fetchData Function
   * 
   * Aggregates data fetching functions to retrieve user information and date counts.
   * Sets the loading state to false once data fetching is complete.
   */
  const fetchData = async () => {
    await fetchUserName(); // Fetching user's name
    await fetchDateCounts(); // Fetching date counts for each season
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
   * - Animates each seasonal category's entrance with fade-in, slide-up, and scaling effects.
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

      // Animating each seasonal category
      seasonAnimations.forEach((anim, index) => {
        const delay = 500 + index * 300; // Staggered delay for each animation

        Animated.parallel([
          // Animating opacity
          Animated.timing(anim.opacity, {
            toValue: 1, // Final opacity
            duration: 600, // Duration of the animation
            delay: delay, // Delay before the animation starts
            useNativeDriver: true,
          }),
          // Animating vertical translation
          Animated.timing(anim.translateY, {
            toValue: 0, // Final vertical position
            duration: 600,
            delay: delay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          // Animating scaling
          Animated.spring(anim.scale, {
            toValue: 1, // Final scale
            friction: 5, // Friction for the spring effect
            tension: 40, // Tension for the spring effect
            delay: delay,
            useNativeDriver: true,
          }),
        ]).start(); // Starting the parallel animations
      });
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

          {/* Subtext indicating the seasonal categories */}
          <Text style={styles.subtext}>Seasons</Text>
        </Animated.View>

        {/* Seasonal Categories Container */}
        <View style={styles.seasonContainer}>
          {/* =========================
              FALL SEASON CARD
              ========================= */}
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[0].opacity, // Animated opacity
                transform: [
                  { translateY: seasonAnimations[0].translateY }, // Animated vertical translation
                  { scale: seasonAnimations[0].scale }, // Animated scaling
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.seasonTouchable} // Base styles for the touchable area
              onPress={() => navigation.navigate('FallDatesScreen')} // Navigates to FallDatesScreen on press
              accessible={true} // Enables accessibility
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
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[1].opacity,
                transform: [
                  { translateY: seasonAnimations[1].translateY },
                  { scale: seasonAnimations[1].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => navigation.navigate('WinterDatesScreen')}
              accessible={true}
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
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[2].opacity,
                transform: [
                  { translateY: seasonAnimations[2].translateY },
                  { scale: seasonAnimations[2].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => navigation.navigate('SpringDatesScreen')}
              accessible={true}
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
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[3].opacity,
                transform: [
                  { translateY: seasonAnimations[3].translateY },
                  { scale: seasonAnimations[3].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => navigation.navigate('SummerDatesScreen')}
              accessible={true}
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