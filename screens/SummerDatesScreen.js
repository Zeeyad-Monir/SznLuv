

// screens/SummerDatesScreen.js
// IN PROGRESS- not much changed

// screens/SummerDatesScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  
} from 'react-native';


import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';


const Header = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>SznLuv</Text>
        <View style={styles.logoUnderline} />
      </View>
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
          <Icon name="favorite" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="person" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SummerDatesScreen() {
  const [favorites, setFavorites] = useState({});

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
      { name: 'Sunset Beach', address: '123 Ocean Drive' },
      { name: 'Golden Sands', address: '456 Shoreline Ave' },
      { name: 'Coral Cove', address: '789 Seaside Blvd' },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Use HomeScreen Header */}
      <Header />

      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>⚠️ Summer Dates are not in season.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.mainTitle}>Summer Dates</Text>
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.spots.map((spot, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.dateSpotCard}
              onPress={() => Alert.alert('Details', 'Date Spot Detail screen is not available yet.')}
            >
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8DD74',
  },
  header: {
    height: 130,
    backgroundColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 45, // Align with the HomeScreen header position
  },
  logoContainer: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoUnderline: {
    height: 2,
    backgroundColor: '#C1A9E5',
    marginTop: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    color: '#000000',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#8B4513',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateSpotCard: {
    backgroundColor: '#FFF8DC',
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
    color: '#000000',
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

