// SCREENS/VANCOUVERSCREEN.JS
// Second level of the home hierarchy: Home -> VancouverScreen -> SeasonsScreen -> season screens.
// Currently holds a single "Seasons" card.

// =========================
// IMPORTS SECTION
// =========================

import React, { useEffect, useRef } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';

// Importing navigation hook to navigate between screens
import { useNavigation } from '@react-navigation/native';

// Importing a custom navigation bar component
import NavBar from '../components/NavBar';

// =========================
// CONSTANTS SECTION
// =========================

// Flat card colour (no photo yet) for the Seasons card
const seasonsCardColor = '#7A8F5C';

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * VancouverScreen Component
 *
 * Shows the categories available for Vancouver. For now there is one: Seasons,
 * which opens the SeasonsScreen with the four seasonal date lists.
 */
export default function VancouverScreen() {
  // Initializing navigation hook to enable screen navigation
  const navigation = useNavigation();

  // Entrance animation values for the Seasons card
  const cardAnimation = {
    translateY: useRef(new Animated.Value(30)).current,
    opacity: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0.9)).current,
  };

  /**
   * useEffect Hook: Animates the card in (fade-in, slide-up, scale) when the screen mounts.
   */
  useEffect(() => {
    const delay = 500; // Same initial delay the Home cards use

    Animated.parallel([
      Animated.timing(cardAnimation.opacity, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimation.translateY, {
        toValue: 0,
        duration: 600,
        delay: delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(cardAnimation.scale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Custom Navigation Bar */}
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.subtext}>Vancouver</Text>
        </View>

        <View style={styles.cardContainer}>
          {/* =========================
              SEASONS CARD
              ========================= */}
          <Animated.View
            style={[
              {
                opacity: cardAnimation.opacity,
                transform: [
                  { translateY: cardAnimation.translateY },
                  { scale: cardAnimation.scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.cardTouchable, { backgroundColor: seasonsCardColor }]}
              onPress={() => navigation.navigate('SeasonsScreen')} // Opens the four seasons
              accessible={true}
              accessibilityLabel="Seasons - View Seasons"
            >
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>Seasons</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E4', // Same light background as the other home screens
  },

  scrollContent: {
    paddingBottom: 20,
  },

  headingContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },

  // Heading text style (same look as the Home screen's label)
  subtext: {
    marginTop: 20,
    fontSize: 18,
    marginBottom: -12,
    color: '#C2B697',
    fontWeight: 'bold',
  },

  cardContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },

  // Same size and shape as the season cards
  cardTouchable: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },

  textContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  cardTitle: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
