// screens/FallDatesScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../firebaseConfig'; // Import Firebase config
import { AuthContext } from '../App'; // Import AuthContext
import NavBar from '../components/NavBar'; // Adjust the path if necessary

export default function FallDatesScreen({ navigation }) {
  const { user } = useContext(AuthContext); // Access user context
  const [favorites, setFavorites] = useState({}); // Local state for favorites

  const categories = [
    {
      title: 'Aldor Family Farm',
      spots: [
        {
          name: 'Aldor Family Farm',
          address: '24990 84 Ave, Langley',
        },
        {
          name: 'Eagle Acres Dairy',
          address: '789 Fall Blvd',
        },
        {
          name: 'Laity Pumpkin Patch',
          address: '2725 Laity St, Maple Ridge, BC',
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

  // Fetch and synchronize user's favorites from Firestore on component mount
  React.useEffect(() => {
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
      // Fetch existing favorites from Firestore
      const docSnap = await getDoc(userFavoritesRef);
      let userFavorites = docSnap.exists() ? docSnap.data() : {};

      // Add or remove favorite
      if (userFavorites[spotName]) {
        delete userFavorites[spotName];
        Alert.alert('Removed from Favorites', `${spotName} has been removed.`);
      } else {
        userFavorites[spotName] = true;
        Alert.alert('Added to Favorites', `${spotName} has been added.`);
      }

      // Update Firestore
      await setDoc(userFavoritesRef, userFavorites);

      // Update local state
      setFavorites(userFavorites);
    } catch (error) {
      console.error('Error updating favorites:', error);
      Alert.alert('Error', 'Could not update favorites. Please try again.');
    }
  };

  const handleSpotPress = (spot) => {
    if (spot.name === 'Aldor Family Farm') {
      navigation.navigate('AldorFamilyFarmScreen');
    } else if (spot.name === 'Eagle Acres Dairy') {
      navigation.navigate('EagleAcresDairy'); // Navigate to Eagle Acres Dairy screen
    } else if (spot.name === 'Laity Pumpkin Patch') {
      navigation.navigate('LaityPumpkinPatch'); // Navigate to the new screen
    } else {
      Alert.alert('Coming Soon', 'This feature is coming soon.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Integrated Navigation Bar */}
      <NavBar />

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Screen Title */}
        <Text style={styles.mainTitle}>Fall Dates</Text>

        {/* Categories and Their Spots */}
        {categories.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dateSpotCard}
                onPress={() => handleSpotPress(spot)}
                accessibilityLabel={`View details for ${spot.name}`}
                accessibilityRole="button"
              >
                {/* Favorite Icon */}
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

                {/* Spot Information */}
                <View style={styles.cardTextContainer}>
                  <Text style={styles.dateSpotName}>{spot.name}</Text>
                  <Text style={styles.addressText}>{spot.address}</Text>
                </View>

                {/* Navigation Arrow Icon */}
                <TouchableOpacity
                  style={styles.cardArrowIcon}
                  onPress={() => handleSpotPress(spot)}
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
    backgroundColor: '#F4A460',
  },

  /* Main Content Styles */
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    color: '#F5F5DC',
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },

  /* Category Section Styles */
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#F5F5DC',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },

  /* Date Spot Card Styles */
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