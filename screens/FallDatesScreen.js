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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../App';
import NavBar from '../components/NavBar';
import LottieView from 'lottie-react-native';
import fallingLeaves from '../assets/fallingLeaves.json';

export default function FallDatesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState({});

  // NEW STATES: Notification and Modal Controls
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

    // Animate title
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

    // Animate categories and spots with staggered delays
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

  // NEW FUNCTION: Fetch user-defined collections
  const fetchUserCollections = async () => {
    if (!user) return;
    try {
      const favouritesDoc = doc(db, 'favourites', user.uid);
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
      console.error('Error fetching user-defined collections:', error);
    }
  };

  // NEW FUNCTION: Add spot to a specific collection
  const addSpotToCollection = async (collectionTitle, spotName) => {
    try {
      const favouritesDoc = doc(db, 'favourites', user.uid);
      const docSnap = await getDoc(favouritesDoc);

      if (!docSnap.exists()) return;

      const data = docSnap.data();
      if (!data.collections) {
        data.collections = [];
      }

      // Find the target collection
      const targetCollectionIndex = data.collections.findIndex(
        (col) => col.title === collectionTitle
      );

      if (targetCollectionIndex === -1) {
        Alert.alert('Error', 'Collection not found.');
        return;
      }

      const targetCollection = data.collections[targetCollectionIndex];
      if (!targetCollection.dates) {
        targetCollection.dates = [];
      }

      // Prevent duplicates
      if (targetCollection.dates.includes(spotName)) {
        Alert.alert('Info', 'This spot is already in the collection.');
        return;
      }

      targetCollection.dates.push(spotName);
      data.collections[targetCollectionIndex] = targetCollection;

      await setDoc(favouritesDoc, data, { merge: true });

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding spot to collection:', error);
      Alert.alert('Error', 'Failed to add spot to collection.');
    }
  };

  // MODIFIED FUNCTION: Toggle favorite with new notification logic
  const toggleFavorite = async (spotName, spotAddress) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add favorites.');
      return;
    }

    const userFavoritesRef = doc(db, 'favourites', user.uid);

    try {
      const docSnap = await getDoc(userFavoritesRef);
      let userFavorites = docSnap.exists() ? docSnap.data() : {};

      if (userFavorites[spotName]) {
        // Remove favorite
        delete userFavorites[spotName];
        Alert.alert('Removed from Favorites', `${spotName} has been removed.`);
      } else {
        // Add favorite with a 'season' property of "Fall"
        userFavorites[spotName] = {
          isFavourite: true,
          season: 'Fall',
          location: spotAddress,
        };
        Alert.alert('Added to Favorites', `${spotName} has been added.`);

        // NEW: Show "Choose Collection" notification
        setNewlyFavouritedSpot({ name: spotName });
        setShowChooseCollectionNotification(true);

        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setShowChooseCollectionNotification(false);
        }, 3000);
      }

      await setDoc(userFavoritesRef, userFavorites);
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
      navigation.navigate('EagleAcresDairy');
    } else if (spot.name === 'Laity Pumpkin Patch') {
      navigation.navigate('LaityPumpkinPatch');
    } else {
      Alert.alert('Coming Soon', 'This feature is coming soon.');
    }
  };

  // NEW FUNCTION: Handle "Choose Collection" button press in notification
  const handleChooseCollectionPress = async () => {
    // Hide the notification bar
    setShowChooseCollectionNotification(false);

    // Fetch user collections
    await fetchUserCollections();

    // Open the choose collection modal
    setShowChooseCollectionModal(true);
  };

  // NEW FUNCTION: Handle user selecting a collection in the modal
  const handleCollectionSelect = (collectionTitle) => {
    if (!newlyFavouritedSpot) return;
    addSpotToCollection(collectionTitle, newlyFavouritedSpot.name);

    // Close the modal
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
                        favorites[spot.name]?.isFavourite
                          ? 'favorite'
                          : 'favorite-border'
                      }
                      size={20}
                      color={
                        favorites[spot.name]?.isFavourite
                          ? '#FF0000'
                          : '#A9A9A9'
                      }
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

      {/* NEW: "Choose Collection" Notification Styled Like Success Notification */}
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

      {/* NEW: Success Notification */}
      {showSuccessNotification && (
        <View style={styles.successNotification}>
          <Text style={styles.successNotificationText}>
            Added to Collection
          </Text>
        </View>
      )}

      {/* NEW: Choose Collection Modal */}
      <Modal
        visible={showChooseCollectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChooseCollectionModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowChooseCollectionModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>X</Text>
            </TouchableOpacity>
            {/* Modal Title */}
            <Text style={styles.modalTitle}>Collections</Text>

            {userCollections.length > 0 ? (
              // NEW: Scrollable Container for Collections (Visible 4 at a time)
              <View style={styles.collectionListContainer}>
                <ScrollView>
                  {userCollections.map((collection, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.collectionButton,
                        { backgroundColor: collection.color },
                      ]}
                      onPress={() => handleCollectionSelect(collection.title)}
                      accessibilityLabel={`Add to ${collection.title} Collection`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.collectionButtonText}>
                        {collection.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <Text style={styles.noCollectionsText}>
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

  // NEW: Success and "Choose Collection" Notification Styles
  successNotification: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: '#4A90E2', // Blue background
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  successNotificationText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // NEW: Modal Styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxHeight: '70%', // Ensures the modal doesn't exceed 70% of screen height
    backgroundColor: '#fff', // Light beige background
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

  // NEW: Collection List Container for Scrollable List (Visible 4 items)
  collectionListContainer: {
    width: '100%',
    height: 240, // 4 items * (50px height + 10px margin) = 240px
  },
  collectionButton: {
    marginVertical: 5, // 10px total vertical gap between buttons
    borderRadius: 8,
    height: 50, // Fixed height per collection button
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'center',
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
  noCollectionsText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
  },
});
