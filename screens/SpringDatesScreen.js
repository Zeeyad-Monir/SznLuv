

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
      {/* Top navigation bar copied from HomeScreen */}
      <View style={styles.navigationBar}>
        {/* Logo that links back to Home */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logoText}>SznLuv</Text>
        </TouchableOpacity>
        <View style={styles.navigationIcons}>
          {/* Heart icon for Favorites screen */}
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <Icon name="favorite-border" size={24} color="#FFD700" style={styles.navIcon} />
          </TouchableOpacity>
          {/* Profile icon for Profile screen */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="person-outline" size={24} color="#FFD700" style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning banner for out-of-season Spring dates */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>⚠️ Spring Dates are not in season.</Text>
      </View>

      {/* Scrollable section for content with all date categories and spots */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main title for Spring Dates */}
        <Text style={styles.mainTitle}>Spring Dates</Text>
        
        {/* Loop through each category to display spots */}
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => navigation.navigate('DateSpotDetail', { spot })}
              >
                {/* Favorite icon that toggles favorite status */}
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

                <View style={styles.cardTextContainer}>
                  <Text style={styles.dateSpotName}>{spot.name}</Text>
                  <Text style={styles.addressText}>{spot.address}</Text>
                </View>

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

// Styles for SpringDatesScreen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFB6C1', // Light pink for a spring vibe
  },
  navigationBar: {
    height: 60,
    backgroundColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  logoText: {
    color: '#FFB6C1',
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
    backgroundColor: '#FF6347',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    color: '#FFF8F0',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateSpotCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeartIcon: {
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  dateSpotName: {
    color: '#000',
    fontSize: 22,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#696969',
    fontSize: 16,
    marginTop: 4,
  },
  cardArrowIcon: {
    marginLeft: 16,
  },
});
