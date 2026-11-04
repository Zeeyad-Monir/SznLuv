import { toggleSavedSpot, updateCollection } from '../services/favourites';
import { openVenue } from '../services/venueNavigation';
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../contexts/AuthContext';
import NavBar from '../components/NavBar';
import LottieView from 'lottie-react-native';
import fallingLeaves from '../assets/fallingLeaves.json';

export default function FallDatesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState({});

  const [showChooseCollectionNotification, setShowChooseCollectionNotification] = useState(false);
  const [newlyFavouritedSpot, setNewlyFavouritedSpot] = useState(null);
  const [showChooseCollectionModal, setShowChooseCollectionModal] = useState(false);
  const [userCollections, setUserCollections] = useState([]);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-50)).current;

  const categories = [
    {
      title: 'Pumpkin Patches',
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

  const categoryAnimations = categories.map(() => ({
    translateX: useRef(new Animated.Value(-50)).current,
    opacity: useRef(new Animated.Value(0)).current,
  }));

  const cardAnimations = categories.map((category) =>
    category.spots.map(() => ({
      translateY: useRef(new Animated.Value(20)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.8)).current,
    }))
  );

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'favourites', user.uid), snapshot => {
      setFavorites(snapshot.exists() ? snapshot.data() : {});
    }, error => {
      console.error('Favourites subscription failed:', { code: error.code });
      Alert.alert('Favourites unavailable', 'Could not load your saved spots. Please check your connection and account access.');
    });
  }, [user]);

  useEffect(() => {

    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    let currentDelay = 500;

    categories.forEach((category, categoryIndex) => {
      const categoryDelay = currentDelay + categoryIndex * 400;

      Animated.parallel([
        Animated.timing(categoryAnimations[categoryIndex].translateX, {
          toValue: 0,
          duration: 500,
          delay: categoryDelay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(categoryAnimations[categoryIndex].opacity, {
          toValue: 1,
          duration: 500,
          delay: categoryDelay,
          useNativeDriver: true,
        }),
      ]).start();

      category.spots.forEach((spot, spotIndex) => {
        const spotDelay = categoryDelay + (spotIndex + 1) * 300;

        Animated.parallel([
          Animated.timing(cardAnimations[categoryIndex][spotIndex].translateY, {
            toValue: 0,
            duration: 500,
            delay: spotDelay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(cardAnimations[categoryIndex][spotIndex].opacity, {
            toValue: 1,
            duration: 500,
            delay: spotDelay,
            useNativeDriver: true,
          }),
          Animated.spring(cardAnimations[categoryIndex][spotIndex].scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            delay: spotDelay,
            useNativeDriver: true,
          }),
        ]).start();

        const spotAnimationEnd = spotDelay + 1;
        if (spotAnimationEnd > currentDelay) {
          currentDelay = spotAnimationEnd;
        }
      });

      currentDelay += 1;
    });
  }, []);

  const fetchUserCollections = async () => {
    if (!user) return;
    try {
      const favouritesDoc = doc(db, "favourites", user.uid);
      const docSnap = await getDoc(favouritesDoc);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.collections && Array.isArray(data.collections)) {
          setUserCollections(data.collections);
        } else {
          setUserCollections([]);
        }
      }
    } catch (error) {
      console.error("Error fetching user-defined collections:", error);
    }
  };

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

  const handleChooseCollectionPress = async () => {
    setShowChooseCollectionNotification(false);
    await fetchUserCollections();
    setShowChooseCollectionModal(true);
  };

  const handleCollectionSelect = (collectionTitle) => {
    if (!newlyFavouritedSpot) return;
    addSpotToCollection(collectionTitle, newlyFavouritedSpot.name);
    setShowChooseCollectionModal(false);
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={fallingLeaves}
        autoPlay
        loop
        style={styles.leavesAnimation}
        speed={0.6}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        <NavBar />
        <Text style={styles.mainTitle}>Fall Dates</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {categories.map((category, index) => (
          <Animated.View
            key={index}
            style={[
              styles.categorySection,
              {
                transform: [
                  { translateX: categoryAnimations[index].translateX },
                ],
                opacity: categoryAnimations[index].opacity,
              },
            ]}
          >
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {category.spots.map((spot, idx) => (
              <Animated.View
                key={idx}
                style={[
                  styles.dateSpotCard,
                  {
                    transform: [
                      { translateY: cardAnimations[index][idx].translateY },
                      { scale: cardAnimations[index][idx].scale },
                    ],
                    opacity: cardAnimations[index][idx].opacity,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.dateSpotCardContent}
                  onPress={() => handleSpotPress(spot)}
                  accessibilityLabel={`View details for ${spot.name}`}
                  accessibilityRole="button"
                >
                  <TouchableOpacity
                    style={styles.cardHeartIcon}
                    onPress={() => toggleFavorite(spot.name, spot.address)}
                    accessibilityLabel={`Favorite ${spot.name}`}
                    accessibilityRole="button"
                  >
                    <Icon
                      name={
                        favorites[spot.name]?.isFavourite ? 'favorite' : 'favorite-border'
                      }
                      size={20}
                      color={favorites[spot.name]?.isFavourite ? '#FF0000' : '#A9A9A9'}
                    />
                  </TouchableOpacity>

                  <View style={styles.cardTextContainer}>
                    <Text style={styles.dateSpotName}>{spot.name}</Text>
                    <Text style={styles.addressText}>{spot.address}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cardArrowIcon}
                    onPress={() => handleSpotPress(spot)}
                    accessibilityLabel={`View details for ${spot.name}`}
                    accessibilityRole="button"
                  >
                    <Icon name="chevron-right" size={18} color="#000" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
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

      {/* Choose Collection Modal */}
      <Modal
        visible={showChooseCollectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChooseCollectionModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowChooseCollectionModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Collections</Text>

            {userCollections.length > 0 ? (
              <ScrollView style={{ width: '100%' }}>
                {userCollections.map((collection, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.collectionButton, { backgroundColor: collection.color }]}
                    onPress={() => handleCollectionSelect(collection.title)}
                  >
                    <Text style={styles.collectionButtonText}>{collection.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ marginTop: 20, textAlign: 'center' }}>
                No Collections Available. Create one first!
              </Text>
            )}
          </View>
        </View>
      </Modal>
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
    padding: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateSpotCardContent: {
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
  addressText: {
    color: '#696969',
    fontSize: 16,
    marginTop: 4,
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

  // Modal styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#323232',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'transparent',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  collectionButton: {
    marginVertical: 10,
    borderRadius: 8,
    paddingVertical: 12,
    width: '90%',
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  collectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
