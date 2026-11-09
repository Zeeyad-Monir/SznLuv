import { toggleSavedSpot, updateCollection } from '../services/favourites';
import { openVenue } from '../services/venueNavigation';
import { openCollectionPicker } from '../services/collectionPicker';
import useEntrance from '../hooks/useEntrance';
import { fallCategories } from '../services/spots';
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../contexts/AuthContext';
import BackgroundLottie from '../components/BackgroundLottie';
import fallingLeaves from '../assets/fallingLeaves.json';

export default function FallDatesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState({});

  const [showChooseCollectionNotification, setShowChooseCollectionNotification] = useState(false);
  const [newlyFavouritedSpot, setNewlyFavouritedSpot] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Sections and spots come from services/spots.js so the list, venue pages, favourites and wheel stay in sync.
  const categories = fallCategories;

  // The header and each category section ease in together; the push itself carries the page.
  const entrance = useEntrance(1 + categories.length);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'favourites', user.uid), snapshot => {
      setFavorites(snapshot.exists() ? snapshot.data() : {});
    }, error => {
      console.error('Favourites subscription failed:', { code: error.code });
      Alert.alert('Favourites unavailable', 'Could not load your saved spots. Please check your connection and account access.');
    });
  }, [user]);

  const addSpotToCollection = async (collectionTitle, spotName) => {
    try {
      await updateCollection(user?.uid, { type: 'add', title: collectionTitle, spot: spotName });
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 2000);
    } catch (error) {
      console.error('Error adding spot to collection:', error);
      Alert.alert('Could not save spot', error.message);
    }
  };

  const toggleFavorite = async (spotName, spotAddress) => {
    try {
      const next = await toggleSavedSpot(user?.uid, spotName, {
        isFavourite: true, season: 'Fall', location: spotAddress,
      });
      setFavorites(next);
      const added = !!next[spotName]?.isFavourite;
      Alert.alert(added ? 'Added to Favorites' : 'Removed from Favorites', spotName);
      if (added) {
        setNewlyFavouritedSpot({ name: spotName });
        setShowChooseCollectionNotification(true);
        setTimeout(() => setShowChooseCollectionNotification(false), 5000);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      Alert.alert('Could not save favourite', 'Your change was not saved. Please check your connection and try again.');
    }
  };

  const handleSpotPress = (spot) => openVenue(navigation, Alert.alert, spot.name);

  const handleChooseCollectionPress = () => {
    setShowChooseCollectionNotification(false);
    openCollectionPicker(navigation, favorites.collections || [], handleCollectionSelect);
  };

  const handleCollectionSelect = (collectionTitle) => {
    if (!newlyFavouritedSpot) return;
    addSpotToCollection(collectionTitle, newlyFavouritedSpot.name);
  };

  return (
    <View style={styles.container}>
      <BackgroundLottie
        source={fallingLeaves}
        style={styles.leavesAnimation}
        speed={0.6}
      />

      <Animated.View style={[styles.headerContainer, entrance[0]]}>
        <Text style={styles.mainTitle}>Fall Dates</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {categories.map((category, index) => (
          <Animated.View key={index} style={[styles.categorySection, entrance[index + 1]]}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <View key={idx} style={styles.dateSpotCard}>
                <TouchableOpacity
                  style={styles.dateSpotCardContent}
                  accessibilityActions={[{ name: 'favorite', label: favorites[spot.name]?.isFavourite ? 'Remove from favourites' : 'Add to favourites' }]}
                  onAccessibilityAction={() => toggleFavorite(spot.name, spot.address)}
                  onPress={() => handleSpotPress(spot)}
                  accessibilityLabel={`View details for ${spot.name}`}
                  accessibilityRole="button"
                >
                  <TouchableOpacity
                    style={styles.cardHeartIcon}
                    hitSlop={11}
                    onPress={() => toggleFavorite(spot.name, spot.address)}
                    accessibilityLabel={`Favorite ${spot.name}`}
                    accessibilityRole="button"
                  >
                    <Icon
                      name={
                        favorites[spot.name]?.isFavourite ? 'favorite' : 'favorite-border'
                      }
                      size={23}
                      color={favorites[spot.name]?.isFavourite ? '#FF0000' : '#A9A9A9'}
                    />
                  </TouchableOpacity>

                  <View style={styles.cardTextContainer}>
                    <Text
                      style={styles.dateSpotName}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                      maxFontSizeMultiplier={1.2}
                    >
                      {spot.name}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cardArrowIcon}
                    hitSlop={13}
                    onPress={() => handleSpotPress(spot)}
                    accessibilityLabel={`View details for ${spot.name}`}
                    accessibilityRole="button"
                  >
                    <Icon name="chevron-right" size={18} color="#000" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        ))}
      </ScrollView>

      {/* "Choose Collection" notification styled identically to success notification */}
      {showChooseCollectionNotification && (
        <TouchableOpacity
          style={styles.successNotification}
          onPress={handleChooseCollectionPress}
          accessibilityLabel="Choose Collection"
          accessibilityRole="button"
        >
          <Text style={styles.successNotificationText}>Choose Collection</Text>
        </TouchableOpacity>
      )}

      {/* Success Notification */}
      {showSuccessNotification && (
        <View style={styles.successNotification}>
          <Text style={styles.successNotificationText}>Added to Collection</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4A460',
  },
  leavesAnimation: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').height * 1.5,
    top: -Dimensions.get('window').height * 0.2,
    left: -Dimensions.get('window').width * 0.25,
    transform: [{ scale: 1.65 }],
    opacity: 0.6,
  },
  headerContainer: {},
  mainTitle: {
    color: '#F5F5DC',
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#F5F5DC',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateSpotCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    height: 74, // Same height for every spot card (the name is a single shrink-to-fit line)
    marginBottom: 24.15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateSpotCardContent: {
    padding: 14, // On the touchable, so the whole card responds and not just its middle
    alignSelf: 'stretch',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  cardArrowIcon: {
    marginLeft: 16,
  },
  
  // Use the same styling as success notification
  successNotification: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  successNotificationText: {
    color: '#fff',
    fontWeight: '600',
  },

});
