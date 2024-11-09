// screens/SummerDatesScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function SummerDatesScreen({ navigation }) {
  // Track favorite spots in state
  const [favorites, setFavorites] = useState({});

  // Toggle favorite status for a spot with alert confirmation
  const toggleFavorite = (spotName) => {
    setFavorites((prevFavorites) => {
      const updatedFavorites = { ...prevFavorites };
      if (updatedFavorites[spotName]) {
        delete updatedFavorites[spotName];
        Alert.alert('Removed from Favorites', `${spotName} has been removed from your favorites.`);
      } else {
        updatedFavorites[spotName] = true;
        Alert.alert('Added to Favorites', `${spotName} has been added to your favorites.`);
      }
      return updatedFavorites;
    });
  };

  // Summer category (currently inactive)
  const category = {
    title: 'Beaches (NOT ACTIVE)',
    spots: [
      {
        name: 'Sunset Beach',
        address: '123 Ocean Drive',
      },
      {
        name: 'Golden Sands',
        address: '456 Shoreline Ave',
      },
      {
        name: 'Coral Cove',
        address: '789 Seaside Blvd',
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Top navigation bar */}
      <View style={styles.navigationBar}>
        {/* Logo that links back to Home */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logoText}>SznLuv</Text>
        </TouchableOpacity>
        <View style={styles.navigationIcons}>
          {/* Heart icon for future Favorites screen */}
          <TouchableOpacity onPress={() => Alert.alert('Favorites', 'Favorites screen is not available yet.')}>
            <Icon name="favorite-border" size={24} color="#FFD700" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile icon for future Profile screen */}
          <TouchableOpacity onPress={() => Alert.alert('Profile', 'Profile screen is not available yet.')}>
            <Icon name="person-outline" size={24} color="#FFD700" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning banner to indicate summer dates are out of season */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>⚠️ Summer Dates are not in season.</Text>
      </View>

      {/* Main scrollable content area */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main title for the Summer Dates screen */}
        <Text style={styles.mainTitle}>Summer Dates</Text>

        {/* Display summer category and list of spots */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.spots.map((spot, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.dateSpotCard}
              onPress={() => Alert.alert('Details', 'Date Spot Detail screen is not available yet.')}
            >
              {/* Favorite icon that toggles favorite status */}
              <TouchableOpacity
                style={styles.cardHeartIcon}
                onPress={() => toggleFavorite(spot.name)}
              >
                <Icon
                  name={favorites[spot.name] ? 'favorite' : 'favorite-border'}
                  size={20}
                  color={favorites[spot.name] ? '#FF0000' : '#A9A9A9'} // Red if favorited, gray if not
                />
              </TouchableOpacity>

              {/* Display the name and address of each spot */}
              <View style={styles.cardTextContainer}>
                <Text style={styles.dateSpotName}>{spot.name}</Text>
                <Text style={styles.addressText}>{spot.address}</Text>
              </View>

              {/* Right arrow icon to indicate navigation */}
              <TouchableOpacity
                style={styles.cardArrowIcon}
                onPress={() => Alert.alert('Details', 'Date Spot Detail screen is not available yet.')}
              >
                <Icon name="chevron-right" size={18} color="#000" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Styles for SummerDatesScreen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8DD74', // Warm muted yellow for a summer vibe
  },
  navigationBar: {
    height: 60, // Fixed height for top bar
    backgroundColor: '#333333', // Dark background for contrast
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15, // Space on sides of navigation bar
  },
  logoText: {
    color: '#F8DD74', // Matches yellow background for a unified look
    fontSize: 22,
    fontWeight: 'bold',
  },
  navigationIcons: {
    flexDirection: 'row', // Arrange icons horizontally
  },
  navIcon: {
    marginLeft: 15, // Space between icons
  },
  warningBanner: {
    backgroundColor: '#FF6347', // Coral red to catch attention
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center', // Center-align text inside the banner
  },
  warningText: {
    color: '#FFFFFF', // White text for visibility on red background
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20, // Padding on sides for main content
    paddingBottom: 20, // Bottom padding to prevent cutoff
  },
  mainTitle: {
    color: '#000000', // Black for readability
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20, // Space above and below title
  },
  categorySection: {
    marginBottom: 40, // Space between category sections
  },
  categoryTitle: {
    color: '#8B4513', // Muted beige or tan color for title
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15, // Space below each category title
  },
  dateSpotCard: {
    backgroundColor: '#FFF8DC', // Light cream for each card
    borderRadius: 14, // Soft rounded corners
    flexDirection: 'row', // Horizontal layout for card content
    alignItems: 'center',
    padding: 14, // Padding inside each card
    marginBottom: 18, // Space between cards
    shadowColor: '#000', // iOS shadow color
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Android shadow effect
  },
  cardHeartIcon: {
    marginRight: 16, // Space between heart icon and text content
  },
  cardTextContainer: {
    flex: 1, // Allows text container to use available space
  },
  dateSpotName: {
    color: '#000000', // Black for high contrast
    fontSize: 22,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#696969', // Medium gray for address text
    fontSize: 16,
    marginTop: 4, // Space below the spot name
  },
  cardArrowIcon: {
    marginLeft: 16, // Space between text and arrow icon
  },
});