// screens/WinterDatesScreen.js

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

  // Handler for Disclaimer Banner Press (optional)
  const handleDisclaimerPress = () => {
    Alert.alert(
      "Winter Dates Not in Season",
      "Currently, winter dates are not in season. Please check back later for updates.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        {/* Logo Text Wrapped in TouchableOpacity */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logoText}>SznLuv</Text>
        </TouchableOpacity>
        <View style={styles.navigationIcons}>
          {/* Heart Icon */}
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <Icon name="favorite-border" size={24} color="#ADD8E6" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile Icon */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="person-outline" size={24} color="#ADD8E6" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Disclaimer Banner */}
      <TouchableOpacity style={styles.disclaimerBanner} onPress={handleDisclaimerPress}>
        <Text style={styles.disclaimerText}>⚠️ Winter Dates are not in season.</Text>
      </TouchableOpacity>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main Title */}
        <Text style={styles.mainTitle}>Winter Dates</Text>

        {/* Categories */}
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => navigation.navigate('DateSpotDetail', { spot })}
              >
                {/* Favorite Heart Icon */}
                <TouchableOpacity
                  style={styles.cardHeartIcon}
                  onPress={() => {
                    // Handle favorite toggle here
                    // For example, update state or call a function to favorite the spot
                    Alert.alert(
                      "Favorite",
                      `You have favorited ${spot.name}`,
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Icon name="favorite-border" size={20} color="#A9A9A9" />
                </TouchableOpacity>

                {/* Text Container */}
                <View style={styles.cardTextContainer}>
                  <Text style={styles.dateSpotName}>{spot.name}</Text>
                  <Text style={styles.addressText}>{spot.address}</Text>
                </View>

                {/* Arrow Icon */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B9CCEC', // Soft light blue for winter
  },
  navigationBar: {
    height: 60,
    backgroundColor: '#333333', // Dark charcoal
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  logoText: {
    color: '#B9CCEC', // Light blue
    fontSize: 22,
    fontWeight: 'bold',
  },
  navigationIcons: {
    flexDirection: 'row',
  },
  navIcon: {
    marginLeft: 15,
  },
  disclaimerBanner: {
    backgroundColor: '#FF6347', // Coral red
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disclaimerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    color: '#FFFFFF', // White
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#F5F5F5', // Light cream or soft gray
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateSpotCard: {
    backgroundColor: '#FFF8F0', // Soft cream
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 18,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 2,
  },
  cardHeartIcon: {
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  dateSpotName: {
    color: '#000000', // Black
    fontSize: 22,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#696969', // Medium gray
    fontSize: 16,
    marginTop: 4,
  },
  cardArrowIcon: {
    marginLeft: 16,
  },
});