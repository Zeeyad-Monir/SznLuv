// screens/SpringDatesScreen.js

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

export default function SpringDatesScreen({ navigation }) {
  // Categories of date spots for Spring
  const categories = [
    {
      title: 'Botanical Gardens',
      spots: [
        {
          name: 'Blossom Garden',
          address: '123 Flower St',
        },
        {
          name: 'Spring Haven',
          address: '456 Bloom Blvd',
        },
      ],
    },
    {
      title: 'Bike Rides',
      spots: [
        {
          name: 'River Trail',
          address: '789 River Rd',
        },
        {
          name: 'Meadow Path',
          address: '321 Field Ln',
        },
      ],
    },
  ];

  // State to keep track of favorite spots
  const [favorites, setFavorites] = useState({});

  // Toggle favorite status, updating the state and showing a quick alert
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

  return (
    <View style={styles.container}>
      {/* Navigation bar at the top with logo and icons */}
      <View style={styles.navigationBar}>
        {/* App logo text, returns user to Home when pressed */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logoText}>SznLuv</Text>
        </TouchableOpacity>
        <View style={styles.navigationIcons}>
          {/* Heart icon that links to the Favorites screen */}
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <Icon name="favorite-border" size={24} color="#FFB6C1" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile icon that links to the Profile screen */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="person-outline" size={24} color="#FFB6C1" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning banner for out-of-season Spring dates */}
      <TouchableOpacity
        style={styles.disclaimerBanner}
        onPress={() =>
          Alert.alert(
            'Spring Dates Not in Season',
            'Currently, spring dates are not in season. Please check back later for updates.',
            [{ text: 'OK' }]
          )
        }
      >
        <Text style={styles.disclaimerText}>⚠️ Spring Dates are not in season.</Text>
      </TouchableOpacity>

      {/* Scrollable section for content with all date categories and spots */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main title for Spring Dates */}
        <Text style={styles.mainTitle}>Spring Dates</Text>
        
        {/* Loop through each category to display spots */}
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            {/* Display category title (e.g., Botanical Gardens) */}
            <Text style={styles.categoryTitle}>{category.title}</Text>
            
            {/* Loop through each spot within the category */}
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => navigation.navigate('DateSpotDetail', { spot })}
                accessibilityLabel={`View details for ${spot.name}`}
                accessibilityRole="button"
              >
                {/* Favorite icon to toggle favorite status */}
                <TouchableOpacity
                  style={styles.cardHeartIcon}
                  onPress={() => toggleFavorite(spot.name)}
                  accessibilityLabel={`Favorite ${spot.name}`}
                  accessibilityRole="button"
                >
                  <Icon
                    name={favorites[spot.name] ? 'favorite' : 'favorite-border'}
                    size={20}
                    color={favorites[spot.name] ? '#FF0000' : '#A9A9A9'} // Red if favorited, gray if not
                  />
                </TouchableOpacity>

                {/* Display the name and address of the spot */}
                <View style={styles.cardTextContainer}>
                  <Text style={styles.dateSpotName}>{spot.name}</Text>
                  <Text style={styles.addressText}>{spot.address}</Text>
                </View>

                {/* Arrow icon to indicate navigation to spot details */}
                <TouchableOpacity
                  style={styles.cardArrowIcon}
                  onPress={() => navigation.navigate('DateSpotDetail', { spot })}
                  accessibilityLabel={`View details for ${spot.name}`}
                  accessibilityRole="button"
                >
                  <Icon name="chevron-right" size={18} color="#000" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// Styles for the components in SpringDatesScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFB6C1', // Light pink background for a Spring theme
  },
  navigationBar: {
    height: 60,
    backgroundColor: '#333333', // Dark bar for contrast
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15, // Padding for sides of navigation bar
  },
  logoText: {
    color: '#FFB6C1', // Match logo color to pink theme
    fontSize: 22,
    fontWeight: 'bold',
  },
  navigationIcons: {
    flexDirection: 'row', // Layout icons horizontally
  },
  navIcon: {
    marginLeft: 15, // Space between navigation icons
  },
  disclaimerBanner: {
    backgroundColor: '#FF6347', // Coral red banner to catch attention
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disclaimerText: {
    color: '#FFFFFF', // White text for visibility on red banner
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    paddingHorizontal: 20, // Padding for main content on the sides
    paddingBottom: 20, // Space at bottom to prevent cutoff
  },
  mainTitle: {
    color: '#FFF8F0', // Soft cream color for the main title
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20, // Space around main title
  },
  categorySection: {
    marginBottom: 40, // Separate each category with space
  },
  categoryTitle: {
    color: '#F5F5F5', // Light color for category titles
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15, // Space below each category title
  },
  dateSpotCard: {
    backgroundColor: '#FFF8F0', // Soft cream for card background
    borderRadius: 14, // Rounded corners for a softer look
    flexDirection: 'row', // Layout card items in a row
    alignItems: 'center',
    padding: 14,
    marginBottom: 18, // Space between each card
    shadowColor: '#000', // iOS shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Shadow effect for Android
  },
  cardHeartIcon: {
    marginRight: 16, // Space between heart icon and text
  },
  cardTextContainer: {
    flex: 1, // Fill available space with text container
  },
  dateSpotName: {
    color: '#000', // Black for readability
    fontSize: 22,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#696969', // Medium gray for subtle address text
    fontSize: 16,
    marginTop: 4, // Space below spot name
  },
  cardArrowIcon: {
    marginLeft: 16, // Space between text and arrow icon
  },
});