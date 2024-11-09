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
  const [favorites, setFavorites] = useState({});

  // Handler to toggle favorite status
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
      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        {/* Logo Text */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logoText}>SznLuv</Text>
        </TouchableOpacity>
        <View style={styles.navigationIcons}>
          {/* Heart Icon */}
          <TouchableOpacity onPress={() => Alert.alert('Favorites', 'Favorites screen is not available yet.')}>
            <Icon name="favorite-border" size={24} color="#FFD700" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile Icon */}
          <TouchableOpacity onPress={() => Alert.alert('Profile', 'Profile screen is not available yet.')}>
            <Icon name="person-outline" size={24} color="#FFD700" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Red Warning Banner */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>⚠️ Summer Dates are not in season.</Text>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main Title */}
        <Text style={styles.mainTitle}>Summer Dates</Text>

        {/* Category Section */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.spots.map((spot, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.dateSpotCard}
              onPress={() => Alert.alert('Details', 'Date Spot Detail screen is not available yet.')}
            >
              {/* Favorite Heart Icon */}
              <TouchableOpacity
                style={styles.cardHeartIcon}
                onPress={() => toggleFavorite(spot.name)}
              >
                <Icon
                  name={favorites[spot.name] ? 'favorite' : 'favorite-border'}
                  size={20}
                  color={favorites[spot.name] ? '#FF0000' : '#A9A9A9'}
                />
              </TouchableOpacity>

              {/* Text Container */}
              <View style={styles.cardTextContainer}>
                <Text style={styles.dateSpotName}>{spot.name}</Text>
                <Text style={styles.addressText}>{spot.address}</Text>
              </View>

              {/* Arrow Icon */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8DD74', // Warm muted yellow for summer
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
    color: '#F8DD74', // Bright yellow to match the background
    fontSize: 22,
    fontWeight: 'bold',
  },
  navigationIcons: {
    flexDirection: 'row',
  },
  navIcon: {
    marginLeft: 15,
  },
  warningBanner: {
    backgroundColor: '#FF6347', // Coral red
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    color: '#000000', // Black
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#8B4513', // Muted beige or light tan
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateSpotCard: {
    backgroundColor: '#FFF8DC', // Light cream
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