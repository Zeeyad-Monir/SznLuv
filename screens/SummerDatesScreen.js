// screens/SummerDatesScreen.js

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Firebase configuration
import { AuthContext } from '../App'; // Authentication context
import NavBar from '../components/NavBar'; // Import NavBar

export default function SummerDatesScreen({ navigation }) {
  const { user } = useContext(AuthContext); // Access user context
  const [favorites, setFavorites] = useState({}); // Local state for favorites

  const category = {
    title: 'Beaches (NOT ACTIVE)',
    spots: [
      { name: 'Sunset Beach', address: '123 Ocean Drive' },
      { name: 'Golden Sands', address: '456 Shoreline Ave' },
      { name: 'Coral Cove', address: '789 Seaside Blvd' },
    ],
  };

  // Fetch and synchronize user's favorites from Firestore on component mount
  useEffect(() => {
    if (user) {
      const fetchFavorites = async () => {
        const userFavoritesRef = doc(db, 'favourites', user.uid);
        try {
          const docSnap = await getDoc(userFavoritesRef);
          if (docSnap.exists()) {
            setFavorites(docSnap.data());
          }
        } catch (error) {
          console.error('Error fetching favorites:', error);
        }
      };

      fetchFavorites();
    }
  }, [user]);

  const toggleFavorite = async (spotName) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add favorites.');
      return;
    }

    const userFavoritesRef = doc(db, 'favourites', user.uid);

    try {
      const docSnap = await getDoc(userFavoritesRef);
      let userFavorites = docSnap.exists() ? docSnap.data() : {};

      if (userFavorites[spotName]) {
        delete userFavorites[spotName];
        Alert.alert('Removed from Favorites', `${spotName} has been removed.`);
      } else {
        userFavorites[spotName] = true;
        Alert.alert('Added to Favorites', `${spotName} has been added.`);
      }

      await setDoc(userFavoritesRef, userFavorites);
      setFavorites(userFavorites);
    } catch (error) {
      console.error('Error updating favorites:', error);
      Alert.alert('Error', 'Could not update favorites. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <NavBar />

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
              accessibilityLabel={`View details for ${spot.name}`}
              accessibilityRole="button"
            >
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
              <View style={styles.cardTextContainer}>
                <Text style={styles.dateSpotName}>{spot.name}</Text>
                <Text style={styles.addressText}>{spot.address}</Text>
              </View>
              <TouchableOpacity
                style={styles.cardArrowIcon}
                onPress={() => Alert.alert('Details', 'Date Spot Detail screen is not available yet.')}
                accessibilityLabel={`View details for ${spot.name}`}
                accessibilityRole="button"
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
    backgroundColor: '#F8DD74',
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