import { winterCategories } from '../services/seasonSpots';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import { openVenue } from '../services/venueNavigation';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import useEntrance from '../hooks/useEntrance';
import useSpotDiscovery from '../hooks/useSpotDiscovery';
import SpotDiscoveryControls, { SpotEmptyState } from '../components/SpotDiscoveryControls';
// SCREENS/WINTERDATESSCREEN.JS
// Detailed comments are added by ChatGPT to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. As well as helps remember everything going on.

// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and hooks from React
import React, { useState, useContext, useEffect } from 'react';

// Importing React Native components and APIs
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';

// Importing Material Icons for icon usage in the UI
import Icon from 'react-native-vector-icons/MaterialIcons';



// Importing AuthContext to access authenticated user information
import { AuthContext } from '../contexts/AuthContext';

// Looping seasonal background animation
import BackgroundLottie from '../components/BackgroundLottie';

// Importing the snow falling animation JSON file
import snowFalling from '../assets/snowFalling.json';

// =========================
// CONSTANTS SECTION
// =========================

// Getting device screen dimensions for responsive design
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// =========================
// COMPONENT DEFINITION
// =========================

// Sections and spots live in services/seasonSpots.js so lists, search and this screen stay in sync.
const categories = winterCategories;

/**
 * WinterDatesScreen Component
 * 
 * This component displays a list of winter date spots categorized under different activities.
 * It includes animations for a visually appealing UI and allows users to favorite spots.
 * Favorites are synchronized with Firestore for persistence.
 * Additionally, users can add favorite spots to specific collections.
 */
export default function WinterDatesScreen({ navigation }) {
  const floatingScrollStyle = useFloatingScrollStyle(styles.contentContainer);

  // =========================
  // CONTEXT USAGE
  // =========================

  // Accessing the authenticated user from AuthContext
  const { user } = useContext(AuthContext);

  const entrance = useEntrance(1 + categories.length);
  const discovery = useSpotDiscovery('winter', categories);

  // Saved spots, kept live. The heart saves to Winter favourites and offers "Add to list" in a snackbar.
  const [favorites, setFavorites] = useFavouriteSpots(() => {
    Alert.alert('Favourites unavailable', 'Could not load your saved spots. Please check your connection and account access.');
  });
  const { toggleFavouriteSpot } = useSaveSpot(favorites, setFavorites);
  const toggleFavorite = (spotName, spotAddress) => toggleFavouriteSpot({ name: spotName, address: spotAddress, season: 'Winter' });

  const handleSpotPress = (spot) => {
    Keyboard.dismiss();
    openVenue(navigation, Alert.alert, spot.name);
  };

  return (
    <SignedInScreen style={styles.container}>
      {/* =========================
          SNOW FALLING ANIMATION
          ========================= */}
      
      {/* LottieView component to display the snow falling animation in the background */}
      <BackgroundLottie
        source={snowFalling} // Source of the animation JSON
        style={styles.leavesAnimation} // Styling for the animation
        speed={0.3} // Speed of the animation playback
      />

      {/* =========================
          ANIMATED TITLE AND ICONS
          ========================= */}

      {/* Animated View for the header container, containing the title */}
      <Animated.View style={[styles.headerContainer, entrance[0]]}>
        {/* Screen Title */}
        <Text style={styles.mainTitle}>Winter Dates</Text>
        <SpotDiscoveryControls discovery={discovery} />
      </Animated.View>

      {/* =========================
          MAIN CONTENT
          ========================= */}

      {/* ScrollView to allow vertical scrolling of content */}
      <ScrollView ref={discovery.listRef} contentContainerStyle={floatingScrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {discovery.count === 0 && <SpotEmptyState discovery={discovery} />}
        {/* Mapping through each category to display its spots */}
        {discovery.sections.map(category => (
          <Animated.View key={category.title ?? 'sorted'} style={[styles.categorySection, entrance[category.index + 1]]}>
            {/* Category Title */}
            {category.title && <Text style={styles.categoryTitle}>{category.title}</Text>}

            {/* Mapping through each spot within the category */}
            {category.spots.map(spot => (
              <View key={spot.name} style={styles.dateSpotCard}>
                {/* Touchable area for the entire spot card */}
                <TouchableOpacity
                  style={styles.dateSpotCardContent} // Styles for the content area
                  accessibilityActions={[{ name: 'favorite', label: favorites[spot.name]?.isFavourite ? 'Remove from favourites' : 'Add to favourites' }]}
                  onAccessibilityAction={() => toggleFavorite(spot.name, spot.address)}
                  onPress={() => handleSpotPress(spot)} // Handler for spot press
                  accessibilityLabel={`View details for ${spot.name}`} // Accessibility label for screen readers
                  accessibilityRole="button" // Accessibility role
                >
                  {/* =========================
                      FAVORITE ICON
                      ========================= */}

                  {/* Touchable area for the favorite (heart) icon */}
                  <TouchableOpacity
                    style={styles.cardHeartIcon} // Styles for the heart icon area
                    hitSlop={11}
                    onPress={() => toggleFavorite(spot.name, spot.address)} // Handler for toggling favorite
                    accessibilityLabel={`Favorite ${spot.name}`} // Accessibility label
                    accessibilityRole="button" // Accessibility role
                  >
                    {/* Heart Icon indicating favorite status */}
                    <Icon
                      name={
                        favorites[spot.name]?.isFavourite ? 'favorite' : 'favorite-border' // Icon name based on favorite status
                      }
                      size={23} // Size of the icon
                      color={favorites[spot.name]?.isFavourite ? '#FF0000' : '#A9A9A9'} // Color based on favorite status
                    />
                  </TouchableOpacity>

                  {/* =========================
                      SPOT INFORMATION
                      ========================= */}

                  {/* Container for spot name */}
                  <View style={styles.cardTextContainer}>
                    {/* Spot Name */}
                    <Text
                      style={styles.dateSpotName}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                      maxFontSizeMultiplier={1.2}
                    >
                      {spot.name}
                    </Text>
                  </View>

                  {/* =========================
                      NAVIGATION ARROW ICON
                      ========================= */}

                  {/* Touchable area for the navigation arrow icon */}
                  <TouchableOpacity
                    style={styles.cardArrowIcon} // Styles for the arrow icon area
                    hitSlop={13}
                    onPress={() => handleSpotPress(spot)} // Handler for arrow icon press
                    accessibilityLabel={`View details for ${spot.name}`} // Accessibility label
                    accessibilityRole="button" // Accessibility role
                  >
                    {/* Arrow Icon indicating navigation */}
                    <Icon name="chevron-right" size={18} color="#000" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </SignedInScreen>
  );
}

// =========================
// STYLESHEET SECTION
// =========================

const styles = StyleSheet.create({
  // Container covering the entire screen
  container: {
    flex: 1, // Takes up the full available space
    backgroundColor: '#B9CCEC', // Background color adjusted to winter theme
  },

  // Styling for the snow falling animation
  leavesAnimation: {
    position: 'absolute', // Positioned absolutely to overlay other content
    width: Dimensions.get('window').width * 1.2, // Width relative to screen size
    height: Dimensions.get('window').height * 1.5, // Height relative to screen size
    top: -Dimensions.get('window').height * 0.2, // Positioned slightly above the screen
    left: -Dimensions.get('window').width * 0.25, // Positioned slightly to the left of the screen
    transform: [{ scale: 1.65 }], // Scaling the animation
    opacity: 0.6, // Semi-transparent for subtle effect
  },

  // Styling for the header container (currently empty, can be customized as needed)
  headerContainer: {
    
  },

  // Styling for the main title text
  mainTitle: {
    color: '#FFFFFF', // White text color
    fontSize: 38, // Large font size for prominence
    fontWeight: 'bold', // Bold font weight
    textAlign: 'center', // Centered text alignment
    marginVertical: 20, // Vertical margin for spacing
  },

  // Styling for the content container within the ScrollView
  contentContainer: {
    paddingHorizontal: 20, // Horizontal padding
    paddingBottom: 20, // Bottom padding to prevent content cutoff
    paddingTop: 6, // Top padding for spacing
  },

  // Styling for each category section
  categorySection: {
    marginBottom: 40, // Bottom margin to separate categories
  },

  // Styling for the category title text
  categoryTitle: {
    color: '#FFFFFF', // White text color
    fontSize: 20, // Font size
    fontWeight: '600', // Semi-bold font weight
    marginBottom: 15, // Bottom margin for spacing
  },

  // Styling for each date spot card
  dateSpotCard: {
    backgroundColor: '#FFF8F0', // Light background color for the card
    borderRadius: 14, // Rounded corners
    flexDirection: 'row', // Horizontal layout for child elements
    alignItems: 'center', // Vertically centers child elements
    height: 74, // Same height for every spot card (the name is a single shrink-to-fit line)
    marginBottom: 24.15, // Bottom margin to separate cards
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset for iOS
    shadowOpacity: 0.1, // Shadow opacity for iOS
    shadowRadius: 2, // Shadow radius for iOS
    elevation: 2, // Elevation for Android shadow
  },

  // Styling for the content area within each date spot card
  dateSpotCardContent: {
    padding: 14, // On the touchable, so the whole card responds and not just its middle
    alignSelf: 'stretch',
    flex: 1, // Takes up the full available space
    flexDirection: 'row', // Horizontal layout for child elements
    alignItems: 'center', // Vertically centers child elements
  },

  // Styling for the heart icon area within the card
  cardHeartIcon: {
    marginRight: 16, // Right margin to separate from text
  },

  // Styling for the container holding spot name
  cardTextContainer: {
    flex: 1, // Takes up the remaining space
  },

  // Styling for the spot name text
  dateSpotName: {
    color: '#000000', // Black text color
    fontSize: 22, // Font size
    fontWeight: 'bold', // Bold font weight
  },


  // Styling for the navigation arrow icon area within the card
  cardArrowIcon: {
    marginLeft: 16, // Left margin to separate from text
  },


});
