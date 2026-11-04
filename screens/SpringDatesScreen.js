import { toggleSavedSpot, updateCollection } from '../services/favourites';
import { openVenue } from '../services/venueNavigation';
// SCREENS/SPRINGDATESSCREEN.JS
// Detailed comments are added by ChatGPT to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. As well as helps remember everything going on.

// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and hooks from React
import React, { useState, useContext, useEffect, useRef } from 'react';

// Importing React Native components and APIs
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

// Importing Material Icons for icon usage in the UI
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importing Firestore functions for database interactions
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// Importing Firebase authentication and database configurations
import { auth, db } from '../firebaseConfig'; // Import Firebase config

// Importing AuthContext to access authenticated user information
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

// Importing a custom navigation bar component
import NavBar from '../components/NavBar'; // Import NavBar

// Importing LottieView for animations
import LottieView from 'lottie-react-native';

// Importing the spring falling animation JSON file
import flowerFalling2 from '../assets/flowerFalling2.json'; // Ensure this file exists

// =========================
// CONSTANTS SECTION
// =========================

// Getting device screen dimensions for responsive design
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * SpringDatesScreen Component
 * 
 * This component displays a list of spring date spots categorized under different activities.
 * It includes animations for a visually appealing UI and allows users to favorite spots.
 * Favorites are synchronized with Firestore for persistence.
 * Additionally, users can add favorite spots to specific collections.
 */
export default function SpringDatesScreen({ navigation }) {
  
  // =========================
  // CONTEXT USAGE
  // =========================

  // Accessing the authenticated user from AuthContext
  const { user } = useContext(AuthContext); // Access user context

  // =========================
  // STATE VARIABLES
  // =========================

  // State to manage user's favorite spots
  const [favorites, setFavorites] = useState({}); // Local state for favorites

  // NEW STATES: Notification and Modal Controls
  const [showChooseCollectionNotification, setShowChooseCollectionNotification] = useState(false);
  const [newlyFavouritedSpot, setNewlyFavouritedSpot] = useState(null);
  const [showChooseCollectionModal, setShowChooseCollectionModal] = useState(false);
  const [userCollections, setUserCollections] = useState([]);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // =========================
  // ANIMATED VALUES SECTION
  // =========================

  // Animated value for the opacity of the title
  const titleOpacity = useRef(new Animated.Value(0)).current;

  // Animated value for the vertical translation of the title
  const titleTranslateY = useRef(new Animated.Value(-50)).current;

  // =========================
  // DATA SECTION
  // =========================

  // Defining categories and their respective spots
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

  // Creating animated values for each category's entrance animation
  const categoryAnimations = categories.map(() => ({
    translateX: useRef(new Animated.Value(-50)).current, // Horizontal translation
    opacity: useRef(new Animated.Value(0)).current,     // Opacity for fade-in effect
  }));

  // Creating animated values for each card within the categories
  const cardAnimations = categories.map((category) =>
    category.spots.map(() => ({
      translateY: useRef(new Animated.Value(20)).current, // Vertical translation
      opacity: useRef(new Animated.Value(0)).current,   // Opacity for fade-in effect
      scale: useRef(new Animated.Value(0.8)).current,    // Scale for zoom-in effect
    }))
  );

  // =========================
  // EFFECTS SECTION
  // =========================

  /**
   * useEffect Hook: Fetch and synchronize user's favorites from Firestore on component mount
   * 
   * This effect runs once when the component mounts. It retrieves the user's favorites from Firestore
   * and initializes the favorites state. It also triggers animations for the title, categories, and cards.
   */
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
    // Function to fetch user's favorites from Firestore

    Animated.parallel([
      // Animate the opacity of the title from 0 to 1
      Animated.timing(titleOpacity, {
        toValue: 1, // Final opacity value
        duration: 1000, // Duration of the animation in milliseconds
        useNativeDriver: true, // Use native driver for better performance
      }),
      // Animate the vertical translation of the title from -50 to 0
      Animated.timing(titleTranslateY, {
        toValue: 0, // Final translation value
        duration: 1000, // Duration of the animation in milliseconds
        easing: Easing.out(Easing.ease), // Easing function for smooth animation
        useNativeDriver: true, // Use native driver for better performance
      }),
    ]).start(); // Start the parallel animations

    // Animate categories and cards with consistent timing
    categories.forEach((category, index) => {
      const delay = 1000 + index * 500; // Delay based on category index

      // Animate category slide-in and fade-in
      Animated.parallel([
        // Animate horizontal translation from -50 to 0
        Animated.timing(categoryAnimations[index].translateX, {
          toValue: 0, // Final translation value
          duration: 500, // Duration of the animation
          delay: delay, // Delay before the animation starts
          easing: Easing.out(Easing.ease), // Easing function
          useNativeDriver: true, // Use native driver
        }),
        // Animate opacity from 0 to 1
        Animated.timing(categoryAnimations[index].opacity, {
          toValue: 1, // Final opacity value
          duration: 500, // Duration of the animation
          delay: delay, // Delay before the animation starts
          useNativeDriver: true, // Use native driver
        }),
      ]).start(); // Start the parallel animations

      // Animate each card within the category
      category.spots.forEach((spot, idx) => {
        const cardDelay = delay + (idx + 1) * 300; // Additional delay for staggered animation

        Animated.parallel([
          // Animate vertical translation from 20 to 0
          Animated.timing(cardAnimations[index][idx].translateY, {
            toValue: 0, // Final translation value
            duration: 500, // Duration of the animation
            delay: cardDelay, // Delay before the animation starts
            easing: Easing.out(Easing.ease), // Easing function
            useNativeDriver: true, // Use native driver
          }),
          // Animate opacity from 0 to 1
          Animated.timing(cardAnimations[index][idx].opacity, {
            toValue: 1, // Final opacity value
            duration: 500, // Duration of the animation
            delay: cardDelay, // Delay before the animation starts
            useNativeDriver: true, // Use native driver
          }),
          // Animate scale from 0.8 to 1 with a spring effect
          Animated.spring(cardAnimations[index][idx].scale, {
            toValue: 1, // Final scale value
            friction: 5, // Friction for the spring effect
            tension: 40, // Tension for the spring effect
            delay: cardDelay, // Delay before the animation starts
            useNativeDriver: true, // Use native driver
          }),
        ]).start(); // Start the parallel animations
      });
    });
  }, []); // Empty dependency array ensures this runs only once on mount

  // =========================
  // FUNCTIONS SECTION
  // =========================

  /**
   * NEW FUNCTION: Fetch user-defined collections
   * 
   * This asynchronous function retrieves the user's collections from Firestore.
   * It updates the `userCollections` state with the fetched data.
   */
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

  /**
   * NEW FUNCTION: Add spot to a specific collection
   * 
   * This asynchronous function adds a given spot to a specified collection in Firestore.
   * It ensures that duplicates are not added and provides user feedback upon success or failure.
   * 
   * @param {string} collectionTitle - The title of the collection to add the spot to
   * @param {string} spotName - The name of the spot to be added
   */
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

  /**
   * toggleFavorite Function
   * 
   * This asynchronous function toggles the favorite status of a given spot.
   * It updates the favorites state and synchronizes the change with Firestore.
   * Additionally, it triggers the "Choose Collection" notification for newly favorited spots.
   * 
   * @param {string} spotName - The name of the spot to toggle as favorite
   * @param {string} spotAddress - The address/location of the spot
   */
  const toggleFavorite = async (spotName, spotAddress) => {
    try {
      const next = await toggleSavedSpot(user?.uid, spotName, {
        isFavourite: true, season: 'Spring', location: spotAddress,
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

  /**
   * handleSpotPress Function
   * 
   * This function handles the navigation when a user presses on a spot card.
   * Depending on the spot's name, it navigates to the corresponding detail screen
   * or shows a "Coming Soon" alert.
   * 
   * @param {Object} spot - The spot object containing name and address
   */
  const handleSpotPress = (spot) => openVenue(navigation, Alert.alert, spot.name);

  /**
   * NEW FUNCTION: Handle "Choose Collection" button press in notification
   * 
   * This function is triggered when the user taps on the "Choose Collection" notification.
   * It fetches the user's collections and opens the choose collection modal.
   */
  const handleChooseCollectionPress = async () => {
    // Hide the notification bar
    setShowChooseCollectionNotification(false);

    // Fetch user collections
    await fetchUserCollections();

    // Open the choose collection modal
    setShowChooseCollectionModal(true);
  };

  /**
   * NEW FUNCTION: Handle user selecting a collection in the modal
   * 
   * This function is triggered when the user selects a collection from the modal.
   * It adds the newly favorited spot to the selected collection.
   * 
   * @param {string} collectionTitle - The title of the selected collection
   */
  const handleCollectionSelect = (collectionTitle) => {
    if (!newlyFavouritedSpot) return;
    addSpotToCollection(collectionTitle, newlyFavouritedSpot.name);

    // Close the modal
    setShowChooseCollectionModal(false);
  };

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* =========================
          FLOWERS FALLING ANIMATION
          ========================= */}
      
      {/* 
        LottieView component to display the flowers falling animation in the background.
        - source: The JSON file containing the animation.
        - autoPlay: Automatically starts the animation.
        - loop: Makes the animation loop indefinitely.
        - style: Styling applied to the animation.
        - speed: Speed at which the animation plays.
      */}
      <LottieView
        source={flowerFalling2} // Source of the animation JSON
        autoPlay // Automatically play the animation
        loop // Loop the animation indefinitely
        style={styles.leavesAnimation} // Styling for the animation
        speed={0.8} // Speed of the animation playback
      />

      {/* =========================
          ANIMATED TITLE AND ICONS
          ========================= */}

      {/* 
        Animated View for the header container, including the NavBar and title.
        - opacity: Animated opacity value for fade-in effect.
        - transform: Animated vertical translation for slide-in effect.
      */}
      <Animated.View
        style={[
          styles.headerContainer, // Base styles
          {
            opacity: titleOpacity, // Animated opacity
            transform: [{ translateY: titleTranslateY }], // Animated vertical translation
          },
        ]}
      >
        {/* Integrated Navigation Bar */}
        <NavBar />

        {/* 
          Screen Title.
          - style: Styling applied to the title text.
        */}
        <Text style={styles.mainTitle}>Spring Dates</Text>
      </Animated.View>

      {/* =========================
          MAIN CONTENT
          ========================= */}

      {/* 
        ScrollView to allow vertical scrolling of content.
        - contentContainerStyle: Styling applied to the content container.
      */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* 
          Mapping through each category to display its spots.
          - key: Unique key for each category to help React identify elements.
          - style: Animated styles for each category section.
        */}
        {categories.map((category, index) => (
          <Animated.View
            key={index} // Unique key for each category
            style={[
              styles.categorySection, // Base styles for category section
              {
                transform: [{ translateX: categoryAnimations[index].translateX }], // Animated horizontal translation
                opacity: categoryAnimations[index].opacity, // Animated opacity
              },
            ]}
          >
            {/* Category Title */}
            <Text style={styles.categoryTitle}>{category.title}</Text>

            {/* 
              Mapping through each spot within the category to display spot cards.
              - key: Unique key for each spot to help React identify elements.
              - style: Animated styles for each spot card.
            */}
            {category.spots.map((spot, idx) => (
              <Animated.View
                key={idx} // Unique key for each spot
                style={[
                  styles.dateSpotCard, // Base styles for the spot card
                  {
                    transform: [
                      { translateY: cardAnimations[index][idx].translateY }, // Animated vertical translation
                      { scale: cardAnimations[index][idx].scale },         // Animated scaling
                    ],
                    opacity: cardAnimations[index][idx].opacity,           // Animated opacity
                  },
                ]}
              >
                {/* 
                  Touchable area for the entire spot card.
                  - style: Styling for the content area.
                  - onPress: Handler for spot press.
                  - accessibilityLabel: Accessibility label for screen readers.
                  - accessibilityRole: Accessibility role for better accessibility.
                */}
                <TouchableOpacity
                  style={styles.dateSpotCardContent} // Styles for the content area
                  onPress={() => handleSpotPress(spot)} // Handler for spot press
                  accessibilityLabel={`View details for ${spot.name}`} // Accessibility label for screen readers
                  accessibilityRole="button" // Accessibility role
                >
                  {/* =========================
                      FAVORITE ICON
                      ========================= */}

                  {/* 
                    Touchable area for the favorite (heart) icon.
                    - style: Styling for the heart icon area.
                    - onPress: Handler for toggling favorite.
                    - accessibilityLabel: Accessibility label for screen readers.
                    - accessibilityRole: Accessibility role for better accessibility.
                  */}
                  <TouchableOpacity
                    style={styles.cardHeartIcon} // Styles for the heart icon area
                    onPress={() => toggleFavorite(spot.name, spot.address)} // Handler for toggling favorite
                    accessibilityLabel={`Favorite ${spot.name}`} // Accessibility label
                    accessibilityRole="button" // Accessibility role
                  >
                    {/* 
                      Heart Icon indicating favorite status.
                      - name: Icon name based on favorite status.
                      - size: Size of the icon.
                      - color: Color based on favorite status.
                    */}
                    <Icon
                      name={
                        favorites[spot.name]?.isFavourite ? 'favorite' : 'favorite-border'
                      }
                      size={23} // Size of the icon
                      color={favorites[spot.name]?.isFavourite ? '#FF0000' : '#A9A9A9'} // Color based on favorite status
                    />
                  </TouchableOpacity>

                  {/* =========================
                      SPOT INFORMATION
                      ========================= */}

                  {/* 
                    Container for spot name.
                    - style: Styling for the text container.
                  */}
                  <View style={styles.cardTextContainer}>
                    {/* Spot Name */}
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

                  {/* =========================
                      NAVIGATION ARROW ICON
                      ========================= */}

                  {/* 
                    Touchable area for the navigation arrow icon.
                    - style: Styling for the arrow icon area.
                    - onPress: Handler for arrow icon press.
                    - accessibilityLabel: Accessibility label for screen readers.
                    - accessibilityRole: Accessibility role for better accessibility.
                  */}
                  <TouchableOpacity
                    style={styles.cardArrowIcon} // Styles for the arrow icon area
                    onPress={() => handleSpotPress(spot)} // Handler for arrow icon press
                    accessibilityLabel={`View details for ${spot.name}`} // Accessibility label
                    accessibilityRole="button" // Accessibility role
                  >
                    {/* Arrow Icon indicating navigation */}
                    <Icon name="chevron-right" size={18} color="#000" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        ))}
      </ScrollView>

      {/* =========================
          NEW: "Choose Collection" Notification
          ========================= */}

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

      {/* =========================
          NEW: Success Notification
          ========================= */}

      {/* NEW: Success Notification */}
      {showSuccessNotification && (
        <View style={styles.successNotification}>
          <Text style={styles.successNotificationText}>
            Added to Collection
          </Text>
        </View>
      )}

      {/* =========================
          NEW: Choose Collection Modal
          ========================= */}

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

// =========================
// STYLESHEET SECTION
// =========================

const styles = StyleSheet.create({
  // Container covering the entire screen
  container: {
    flex: 1, // Takes up the full available space
    backgroundColor: '#FFB6C1', // Background color adjusted to spring theme (light pink)
  },

  // Styling for the flowers falling animation
  leavesAnimation: {
    position: 'absolute', // Positioned absolutely to overlay other content
    width: Dimensions.get('window').width * 1.2, // Width relative to screen size
    height: Dimensions.get('window').height * 1.5, // Height relative to screen size
    top: -Dimensions.get('window').height * 0.2, // Positioned slightly above the screen
    left: -Dimensions.get('window').width * 0.25, // Positioned slightly to the left of the screen
    transform: [{ scale: 2.8 }], // Scaling the animation
    opacity: 0.3, // Semi-transparent for subtle effect
  },

  // Styling for the header container (currently empty, can be customized as needed)
  headerContainer: {
    // Add any specific styles if needed
  },

  // Styling for the main title text
  mainTitle: {
    color: '#FFFFFF', // White text color for readability
    fontSize: 38, // Large font size for prominence
    fontWeight: 'bold', // Bold font weight
    textAlign: 'center', // Centered text alignment
    marginVertical: 20, // Vertical margin for spacing
  },

  // Styling for the content container within the ScrollView
  contentContainer: {
    paddingHorizontal: 20, // Horizontal padding
    paddingBottom: 20, // Bottom padding to prevent content cutoff
    paddingTop: 20, // Top padding for spacing
  },

  // Styling for each category section
  categorySection: {
    marginBottom: 40, // Bottom margin to separate categories
  },

  // Styling for the category title text
  categoryTitle: {
    color: '#FFFFFF', // White text color for visibility
    fontSize: 20, // Font size
    fontWeight: '600', // Semi-bold font weight
    marginBottom: 15, // Bottom margin for spacing
  },

  // Styling for each date spot card
  dateSpotCard: {
    backgroundColor: '#FFF8F0', // Light background color for the card
    borderRadius: 14, // Rounded corners
    flexDirection: 'row', // Horizontal layout for child elements
    alignItems: 'center', // Vertically centers child elements
    height: 64, // Same height for every spot card (the name is a single shrink-to-fit line)
    padding: 14, // Padding inside the card
    marginBottom: 21, // Bottom margin to separate cards
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset for iOS
    shadowOpacity: 0.1, // Shadow opacity for iOS
    shadowRadius: 2, // Shadow radius for iOS
    elevation: 2, // Elevation for Android shadow
  },

  // Styling for the content area within each date spot card
  dateSpotCardContent: {
    flex: 1, // Takes up the full available space
    flexDirection: 'row', // Horizontal layout for child elements
    alignItems: 'center', // Vertically centers child elements
  },

  // Styling for the heart icon area within the card
  cardHeartIcon: {
    marginRight: 16, // Right margin to separate from text
  },

  // Styling for the container holding spot name
  cardTextContainer: {
    flex: 1, // Takes up the remaining space
  },

  // Styling for the spot name text
  dateSpotName: {
    color: '#000', // Black text color for readability
    fontSize: 22, // Font size
    fontWeight: 'bold', // Bold font weight
  },


  // Styling for the navigation arrow icon area within the card
  cardArrowIcon: {
    marginLeft: 16, // Left margin to separate from text
  },

  // =========================
  // NEW: Success and "Choose Collection" Notification Styles
  // =========================

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

  // =========================
  // NEW: Modal Styles
  // =========================

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

  // =========================
  // NEW: Collection List Container for Scrollable List (Visible 4 items)
  // =========================

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
