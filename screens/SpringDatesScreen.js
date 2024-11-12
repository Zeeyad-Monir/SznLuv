
// screens/SpringDatesScreen.js
// IN PROGRESS- not much changed

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

export default function SpringDatesScreen() {
  const navigation = useNavigation();

  // Categories of date spots for Spring
  const categories = [
    {
      title: 'Botanical Gardens',
      spots: [
        { name: 'Blossom Garden', address: '123 Flower St' },
        { name: 'Spring Haven', address: '456 Bloom Blvd' },
      ],
    },
    {
      title: 'Bike Rides',
      spots: [
        { name: 'River Trail', address: '789 River Rd' },
        { name: 'Meadow Path', address: '321 Field Ln' },
      ],
    },
  ];

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

  return (
    <View style={styles.container}>
      
      {/* Header with navigation icons copied from HomeScreen */}
      <View style={styles.header}>
        <Text style={styles.logoText}>SznLuv</Text>
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <View style={styles.iconCircle}>
              <Image source={require('../assets/FAVOURITES.png')} style={styles.iconImage} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
            <View style={styles.iconCircle}>
              <Image source={require('../assets/PROFILE.png')} style={styles.iconImage} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SpinTheWheel')}>
            <View style={styles.iconCircle}>
              <Image source={require('../assets/SPINTHEWHEEL.png')} style={styles.iconImage} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning banner */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>⚠️ Spring Dates are not in season.</Text>
      </View>

      {/* Scrollable section for content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.mainTitle}>Spring Dates</Text>
        
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => navigation.navigate('DateSpotDetail', { spot })}
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
  // Existing styles in SpringDatesScreen plus copied navigation styles
  container: {
    flex: 1,
    backgroundColor: '#FFB6C1',
  },
  header: {
    height: 130,
    backgroundColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoText: {
    marginTop: 45,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  iconContainer: {
    marginTop: 45,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  iconImage: {
    width: 43,
    height: 43,
    resizeMode: 'contain',
  },
  // Existing styles
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
