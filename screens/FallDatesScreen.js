// screens/FallDatesScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
// Make sure to install react-native-vector-icons and link it properly
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function FallDatesScreen({ navigation }) {
  const categories = [
    {
      title: 'Aldor Family Farm',
      spots: [
        {
          name: 'Aldor Family Farm',
          address: ' 24990 84 Ave, Langley',
        },
        {
          name: 'Autumn Acres',
          address: '789 Fall Blvd',
        },
      ],
    },
    {
      title: 'Hikes with a View',
      spots: [
        {
          name: 'Sunset Summit',
          address: '456 Mountain Rd',
        },
        {
          name: 'Leaf Trail',
          address: '321 Forest Path',
        },
      ],
    },
    {
      title: 'Park and a Picnic',
      spots: [
        {
          name: 'Maple Park',
          address: '654 Maple St',
        },
        {
          name: 'Riverfront Meadows',
          address: '987 River Rd',
        },
      ],
    },
  ];

  // State to manage favorite spots
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
            <Icon name="favorite-border" size={24} color="#FFA07A" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile Icon */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="person-outline" size={24} color="#FFA07A" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main Title */}
        <Text style={styles.mainTitle}>Fall Dates</Text>
        {/* Categories */}
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => navigation.navigate('DateSpotDetail', { spot })}
                accessibilityLabel={`View details for ${spot.name}`}
                accessibilityRole="button"
              >
                {/* Favorite Heart Icon */}
                <TouchableOpacity
                  style={styles.cardHeartIcon}
                  onPress={() => toggleFavorite(spot.name)}
                  accessibilityLabel={`Favorite ${spot.name}`}
                  accessibilityRole="button"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4A460', // Warm muted orange background
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
    color: '#FFA07A', // Light orange
    fontSize: 22,
    fontWeight: 'bold',
  },
  navigationIcons: {
    flexDirection: 'row',
  },
  navIcon: {
    marginLeft: 15,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    color: '#F5F5DC', // Cream color
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#F5F5DC', // Light beige
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
    color: '#000', // Black
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
