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
  ImageBackground,
} from 'react-native';

// Importing navigation hook to navigate between screens
import { useNavigation } from '@react-navigation/native';

// Importing a custom navigation bar component
import NavBar from '../components/NavBar';

// =========================
// CONSTANTS SECTION
// =========================

// Cover image for the Seasons card, slightly faded (opacity 0.9) with a thin white wash on top
const seasonsImage = require('../assets/Seasonal/SeasonalCoverIMG.png');
const COVER_IMAGE_OPACITY = 0.9;

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
              style={styles.cardTouchable}
              onPress={() => navigation.navigate('SeasonsScreen')} // Opens the four seasons
              accessible={true}
              accessibilityLabel="Seasons - View Seasons"
            >
              <ImageBackground
                source={seasonsImage}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 12, opacity: COVER_IMAGE_OPACITY }}
              >
                {/* Thin white layer over the image to wash out the colours a little */}
                <View style={styles.imageWash} pointerEvents="none" />

                <View style={styles.textContainer}>
                  <Text style={styles.cardTitle}>Seasons</Text>
                </View>
              </ImageBackground>
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

  imageBackground: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  imageWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  textContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  cardTitle: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.55)', // Keeps the title readable on the light sky in the image
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
