
// screens/WinterDatesScreen.js
// IN PROGRESS- not much changed

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
// Ensure react-native-vector-icons is installed and linked
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function WinterDatesScreen({ navigation }) {
  const categories = [
    {
      title: 'Ice Skating',
      spots: [
        {
          name: 'Glacier Rink',
          address: '123 Ice Lane',
        },
        {
          name: 'Frosty Pond',
          address: '456 Snowy Path',
        },
      ],
    },
    {
      title: 'Christmas Tree Farms',
      spots: [
        {
          name: 'Evergreen Acres',
          address: '789 Pine Road',
        },
        {
          name: 'Snowy Pines',
          address: '321 Winter Blvd',
        },
      ],
    },
  ];

  // Disclaimer alert for out-of-season dates
  const handleDisclaimerPress = () => {
    Alert.alert(
      "Winter Dates Not in Season",
      "Currently, winter dates are not in season. Please check back later for updates.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top navigation bar with logo and icons */}
      <View style={styles.navigationBar}>
        {/* App logo, returns to Home */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logoText}>SznLuv</Text>
        </TouchableOpacity>
        <View style={styles.navigationIcons}>
          {/* Favorites screen icon */}
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <Icon name="favorite-border" size={24} color="#ADD8E6" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile screen icon */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="person-outline" size={24} color="#ADD8E6" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner for out-of-season warning */}
      <TouchableOpacity style={styles.disclaimerBanner} onPress={handleDisclaimerPress}>
        <Text style={styles.disclaimerText}>⚠️ Winter Dates are not in season.</Text>
      </TouchableOpacity>

      {/* Main scrollable content section */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main title for winter dates */}
        <Text style={styles.mainTitle}>Winter Dates</Text>

        {/* Category listings */}
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => navigation.navigate('DateSpotDetail', { spot })}
              >
                {/* Favorite button for each spot */}
                <TouchableOpacity
                  style={styles.cardHeartIcon}
                  onPress={() => {
                    // Toggle favorite alert for spot
                    Alert.alert(
                      "Favorite",
                      `You have favorited ${spot.name}`,
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Icon name="favorite-border" size={20} color="#A9A9A9" />
                </TouchableOpacity>

                {/* Spot name and address */}
                <View style={styles.cardTextContainer}>
                  <Text style={styles.dateSpotName}>{spot.name}</Text>
                  <Text style={styles.addressText}>{spot.address}</Text>
                </View>

                {/* Arrow icon to go to detailed view */}
                <TouchableOpacity
                  style={styles.cardArrowIcon}
                  onPress={() => navigation.navigate('DateSpotDetail', { spot })}
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

// Style definitions for WinterDatesScreen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B9CCEC', // Soft light blue for winter theme
  },
  navigationBar: {
    height: 60, // Height for top navigation
    backgroundColor: '#333333', // Dark background
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15, // Padding for navigation items
  },
  logoText: {
    color: '#B9CCEC', // Light blue for logo text
    fontSize: 22,
    fontWeight: 'bold',
  },
  navigationIcons: {
    flexDirection: 'row',
  },
  navIcon: {
    marginLeft: 15, // Space between icons
  },
  disclaimerBanner: {
    backgroundColor: '#FF6347', // Coral red for warning banner
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disclaimerText: {
    color: '#FFFFFF', // White text for visibility
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    paddingHorizontal: 20, // Padding for main content
    paddingBottom: 20, // Bottom padding to avoid cutoff
  },
  mainTitle: {
    color: '#FFFFFF', // White main title text
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20, // Vertical space for title
  },
  categorySection: {
    marginBottom: 40, // Space between categories
  },
  categoryTitle: {
    color: '#F5F5F5', // Soft gray for category title
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15, // Space below category title
  },
  dateSpotCard: {
    backgroundColor: '#FFF8F0', // Soft cream for spot card
    borderRadius: 14, // Rounded corners
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 18, // Space between cards
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Elevation for Android shadow
  },
  cardHeartIcon: {
    marginRight: 16, // Space between heart icon and text
  },
  cardTextContainer: {
    flex: 1,
  },
  dateSpotName: {
    color: '#000000', // Black for spot name
    fontSize: 22,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#696969', // Medium gray for address
    fontSize: 16,
    marginTop: 4, // Space below spot name
  },
  cardArrowIcon: {
    marginLeft: 16, // Space between text and arrow icon
  },
});