// screens/HomeScreen.js

import React, { useEffect, useState, useContext, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../App'; // Ensure AuthContext provides the authenticated user
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import NavBar from '../components/NavBar'; // Ensure NavBar component exists

/**
 * Helper function to convert HEX color codes to RGBA.
 * @param {string} hex - The HEX color code (e.g., '#FFFFFF' or '#FFF').
 * @param {number} alpha - The alpha value for opacity (0 to 1).
 * @returns {string} - The RGBA color string.
 */
const hexToRGBA = (hex, alpha) => {
  let r = 0, g = 0, b = 0;

  // Handle 3-digit HEX
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // Handle 6-digit HEX
  else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Define the seasonal images (ensure these assets exist in your project)
const seasonalImages = {
  fall: require('../assets/fall2.png'),
  winter: require('../assets/winter2.png'),
  spring: require('../assets/spring2.png'),
  summer: require('../assets/summer3.png'),
};

// Define the base colors for each season (used for overlays)
const seasonalColors = {
  fall: '#FF8657',
  winter: '#B9CCEC',
  spring: '#FF9FD2',
  summer: '#F8DD74',
};

// Define the opacity levels for each season (0 to 1)
const seasonalOpacities = {
  fall: 0.1,
  winter: 0.3,
  spring: 0.3,
  summer: 0.3,
};

// Compute the overlay colors with dynamic opacity
const seasonalOverlays = {
  fall: hexToRGBA(seasonalColors.fall, seasonalOpacities.fall),
  winter: hexToRGBA(seasonalColors.winter, seasonalOpacities.winter),
  spring: hexToRGBA(seasonalColors.spring, seasonalOpacities.spring),
  summer: hexToRGBA(seasonalColors.summer, seasonalOpacities.summer),
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext); // Assumes AuthContext provides 'user' object

  // State variables
  const [userName, setUserName] = useState('');
  const [fallCount, setFallCount] = useState(0);
  const [winterCount, setWinterCount] = useState(0);
  const [springCount, setSpringCount] = useState(0);
  const [summerCount, setSummerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Animated values for greeting text
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(-20)).current;

  // Animated values for season blocks
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

  /**
   * Fetches the username from Firestore's 'users' collection using the authenticated user's UID.
   */
  const fetchUserName = async () => {
    try {
      // Reference to the user's document in 'users' collection
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUserName(userSnap.data().username); // Set the fetched username
      } else {
        setUserName('User'); // Fallback if no username is found
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
      setUserName('User'); // Fallback on error
    }
  };

  /**
   * Fetches the active date ideas count for each season from Firestore's 'dateCounts' collection.
   */
  const fetchDateCounts = async () => {
    try {
      // Fetch Fall count
      const fallDatesRef = doc(db, 'dateCounts', 'fall');
      const fallDatesSnap = await getDoc(fallDatesRef);
      setFallCount(fallDatesSnap.exists() ? fallDatesSnap.data().count : 7); // Default to 12 if not found

      // Fetch Winter count
      const winterDatesRef = doc(db, 'dateCounts', 'winter');
      const winterDatesSnap = await getDoc(winterDatesRef);
      setWinterCount(winterDatesSnap.exists() ? winterDatesSnap.data().count : 4); // Default to 4 if not found

      // Fetch Spring count
      const springDatesRef = doc(db, 'dateCounts', 'spring');
      const springDatesSnap = await getDoc(springDatesRef);
      setSpringCount(springDatesSnap.exists() ? springDatesSnap.data().count : 4); // Default to 2 if not found

      // Fetch Summer count
      const summerDatesRef = doc(db, 'dateCounts', 'summer');
      const summerDatesSnap = await getDoc(summerDatesRef);
      setSummerCount(summerDatesSnap.exists() ? summerDatesSnap.data().count : 3); // Default to 2 if not found
    } catch (error) {
      console.error('Error fetching date counts:', error);
      // Reset counts to 0 if error occurs
      setFallCount(0);
      setWinterCount(0);
      setSpringCount(0);
      setSummerCount(0);
    }
  };

  /**
   * Combined function to fetch both username and date counts.
   */
  const fetchData = async () => {
    await fetchUserName();
    await fetchDateCounts();
    setLoading(false); // Stop loading once data is fetched
  };

  /**
   * useEffect hook to fetch data on component mount.
   */
  useEffect(() => {
    fetchData();
  }, []);

  /**
   * useEffect hook to trigger animations after data is loaded.
   */
  useEffect(() => {
    if (!loading) {
      // Animate the greeting text
      Animated.parallel([
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(greetingTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the season blocks with staggered delays
      seasonAnimations.forEach((anim, index) => {
        const delay = 500 + index * 300; // Stagger each animation by 300ms
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 600,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 600,
            delay: delay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            delay: delay,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [loading]);

  /**
   * If data is still loading, display a loading spinner.
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  /**
   * Render the main HomeScreen content.
   */
  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <NavBar />

      {/* Main scrollable content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome message for the user */}
        <Animated.View
          style={[
            styles.greetingContainer,
            {
              opacity: greetingOpacity,
              transform: [{ translateY: greetingTranslateY }],
            },
          ]}
        >
          <Text style={styles.greetingText}>Hello, {userName}!</Text>
          <Text style={styles.subtext}>Seasons</Text>
        </Animated.View>

        {/* Seasonal blocks with active date counts */}
        <View style={styles.seasonContainer}>
          {/* Fall Block */}
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[0].opacity,
                transform: [
                  { translateY: seasonAnimations[0].translateY },
                  { scale: seasonAnimations[0].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.seasonTouchable}
              onPress={() => navigation.navigate('FallDatesScreen')}
              accessible={true}
              accessibilityLabel="Fall Season - View Active Date Ideas"
            >
              <ImageBackground
                source={seasonalImages.fall}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 12, opacity: 1 }} // Keep image opacity at 1; overlay controls tint
              >
                {/* Removed the overlay View to eliminate tint */}
                {/* <View
                  style={[
                    styles.imageOverlay,
                    { backgroundColor: seasonalOverlays.fall },
                  ]}
                /> */}
                {/* Text Container */}
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.fallTitle]}>Fall</Text>
                  <Text style={[styles.seasonSubtitle, styles.fallSubtitle]}>
                    {fallCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Winter Block */}
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
                {/* Removed the overlay View to eliminate tint */}
                {/* <View
                  style={[
                    styles.imageOverlay,
                    { backgroundColor: seasonalOverlays.winter },
                  ]}
                /> */}
                {/* Text Container */}
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.winterTitle]}>Winter</Text>
                  <Text style={[styles.seasonSubtitle, styles.winterSubtitle]}>
                    {winterCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Spring Block */}
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
                {/* Removed the overlay View to eliminate tint */}
                {/* <View
                  style={[
                    styles.imageOverlay,
                    { backgroundColor: seasonalOverlays.spring },
                  ]}
                /> */}
                {/* Text Container */}
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.springTitle]}>Spring</Text>
                  <Text style={[styles.seasonSubtitle, styles.springSubtitle]}>
                    {springCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Summer Block */}
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
                {/* Removed the overlay View to eliminate tint */}
                {/* <View
                  style={[
                    styles.imageOverlay,
                    { backgroundColor: seasonalOverlays.summer },
                  ]}
                /> */}
                {/* Text Container */}
                <View style={styles.textContainer}>
                  <Text style={[styles.seasonTitle, styles.summerTitle]}>Summer</Text>
                  <Text style={[styles.seasonSubtitle, styles.summerSubtitle]}>
                    {summerCount} Active Ideas
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom padding for scroll view */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Stylesheet for HomeScreen components.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E4', // Light cream background color
  },
  scrollContent: {
    paddingBottom: 20, // Prevent content cutoff
  },
  greetingContainer: {
    marginTop: 40, // Vertical space for greeting
    paddingHorizontal: 20, // Horizontal padding for greeting
  },
  greetingText: {
    fontSize: 55,
    fontWeight: 'bold',
    color: '#333333', // Greeting text color
  },
  subtext: {
    marginTop: 20, // Space below greeting
    fontSize: 18,
    marginBottom: -12,
    color: '#C2B697', // Subtext color
    fontWeight: 'bold',
  },
  seasonContainer: {
    paddingHorizontal: 20, // Padding for season blocks
    marginTop: 24, // Space above season blocks
  },
  seasonTouchable: {
    width: '100%',
    height: 160,
    borderRadius: 12, // Rounded corners
    marginBottom: 24, // Space between blocks
    overflow: 'hidden', // Ensure children respect borderRadius
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-start', // Align text at the top
  },
  // Removed imageOverlay style as it's no longer needed
  textContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  seasonTitle: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FFFFFF', // Default color; can be overridden
  },
  seasonSubtitle: {
    marginTop: 2, // Space below season title
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', // Default color; can be overridden
  },
  fallTitle: {
    color: '#FFFFFF', // Ensure contrast against fall overlay
  },
  fallSubtitle: {
    color: '#FFFFFF',
  },
  winterTitle: {
    color: '#FFFFFF', // Adjust based on winter overlay tint
  },
  winterSubtitle: {
    color: '#FFFFFF',
  },
  springTitle: {
    color: '#FFFFFF', // Adjust based on spring overlay tint
  },
  springSubtitle: {
    color: '#FFFFFF',
  },
  summerTitle: {
    color: '#FFFFFF', // Adjust based on summer overlay tint
  },
  summerSubtitle: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});