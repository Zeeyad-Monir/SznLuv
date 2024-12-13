// Favourites.js

import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import NavBar from '../components/NavBar';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Favourites = () => {
  const navigation = useNavigation();

  // Animation references for title and subtitle
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-20)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(-20)).current;

  // Animation references for the four season items
  const seasonsAnimations = [
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

  // Handler to navigate to a specific seasonal favourites screen
  const handleSeasonPress = (season) => {
    navigation.navigate('SeasonalFavourites', { season });
  };

  // Trigger animations on mount
  useEffect(() => {
    // Animate title
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Animate subtitle after the title finishes
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Animate seasons with a staggered delay
    seasonsAnimations.forEach((anim, index) => {
      const delay = 800 + index * 300; // start after title/subtitle
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    });

  }, []);

  return (
    <View style={styles.container}>
      <NavBar />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header Text with animations */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          Favourites
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          Can’t wait to see where these take you!
        </Animated.Text>

        {/* Seasonal Folders Grid */}
        <View style={styles.gridContainer}>
          {/* Fall */}
          <Animated.View
            style={{
              opacity: seasonsAnimations[0].opacity,
              transform: [
                { translateY: seasonsAnimations[0].translateY },
                { scale: seasonsAnimations[0].scale },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Fall')}
              accessibilityLabel="View Fall Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/fall2.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Fall</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Winter */}
          <Animated.View
            style={{
              opacity: seasonsAnimations[1].opacity,
              transform: [
                { translateY: seasonsAnimations[1].translateY },
                { scale: seasonsAnimations[1].scale },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Winter')}
              accessibilityLabel="View Winter Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/winter2.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Winter</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Spring */}
          <Animated.View
            style={{
              opacity: seasonsAnimations[2].opacity,
              transform: [
                { translateY: seasonsAnimations[2].translateY },
                { scale: seasonsAnimations[2].scale },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Spring')}
              accessibilityLabel="View Spring Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/spring2.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Spring</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* Summer */}
          <Animated.View
            style={{
              opacity: seasonsAnimations[3].opacity,
              transform: [
                { translateY: seasonsAnimations[3].translateY },
                { scale: seasonsAnimations[3].scale },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Summer')}
              accessibilityLabel="View Summer Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/summer3.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Summer</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};

// Define box sizes based on device width for responsiveness
const getBoxSize = () => {
  if (width >= 768) { // Tablet/Desktop
    return 200;
  } else if (width >= 480) { // Small tablets
    return 160;
  } else if (width >= 400) { // Small tablets
    return 155;
  } else if (width >= 250) { // Small tablets
    return 140;
  } else { // Mobile
    return 130;
  }
};

const BOX_SIZE = getBoxSize();

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5E7D8", // Beige background
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    width: '90%', // Main container width
    alignSelf: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: "#4A4A4A",
    textAlign: 'center',
    marginBottom: 16, // Space below title
    marginTop: -240,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: "#707070",
    textAlign: 'center',
    marginBottom: 32, // Space below subtitle
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridItem: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 15,
    marginBottom: 30,
    marginRight: 3,
    overflow: 'hidden',
    // Accessibility touch target
    minWidth: 50,
    minHeight: 50,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  gridItemText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default Favourites;