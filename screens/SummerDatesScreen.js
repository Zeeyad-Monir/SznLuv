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
import { useNavigation } from '@react-navigation/native';

export default function SummerDatesScreen() {
  const navigation = useNavigation();
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
      {/* Header with logo and icons */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SznLuv</Text>
          <View style={styles.logoUnderline} />
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconPlaceholderText}>♡</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconPlaceholderText}>☺</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

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
  },
  logoContainer: {
    marginTop: 45,
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
    marginTop: 45,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A9A9A9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  iconPlaceholderText: {
    fontSize: 20,
    color: '#333333',
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
