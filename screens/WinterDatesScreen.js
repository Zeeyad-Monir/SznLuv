// SCREENS/WINTERDATESSCREEN.JS
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
} from 'react-native';

// Importing Material Icons for icon usage in the UI
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importing Firestore functions for database interactions
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Importing Firebase authentication and database configurations
import { auth, db } from '../firebaseConfig';

// Importing AuthContext to access authenticated user information
import { AuthContext } from '../App';

// Importing a custom navigation bar component
import NavBar from '../components/NavBar';

// Importing LottieView for animations
import LottieView from 'lottie-react-native';

// Importing the snow falling animation JSON file
import snowFalling from '../assets/snowFalling.json'; 

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
 * WinterDatesScreen Component
 * 
 * This component displays a list of winter date spots categorized under different activities.
 * It includes animations for a visually appealing UI and allows users to favorite spots.
 * Favorites are synchronized with Firestore for persistence.
 */
export default function WinterDatesScreen({ navigation }) {
  
  // =========================
  // CONTEXT USAGE
  // =========================

  // Accessing the authenticated user from AuthContext
  const { user } = useContext(AuthContext);

  // =========================
  // STATE VARIABLES
  // =========================

  // State to manage user's favorite spots
  const [favorites, setFavorites] = useState({});

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
      title: 'Ice Skating',
      spots: [
        {
          name: 'Glacier Rink',
          address: '123 Ice Lane',
        },
        {
          name: 'Frosty Pond',
          address: '456 Snowy Path',
        },
      ],
    },
    {
      title: 'Christmas Tree Farms',
      spots: [
        {
          name: 'Evergreen Acres',
          address: '789 Pine Road',
        },
        {
          name: 'Snowy Pines',
          address: '321 Winter Blvd',
        },
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
    // Function to fetch user's favorites from Firestore
    if (user) {
      const fetchFavorites = async () => {
        const userFavoritesRef = doc(db, 'favourites', user.uid);
        try {
          const docSnap = await getDoc(userFavoritesRef);
          if (docSnap.exists()) {
            setFavorites(docSnap.data());
          }
        } catch (error) {
          // Logging any errors that occur during fetching
          console.error('Error fetching favorites:', error);
        }
      };

      // Invoke the fetchFavorites function to load favorites
      fetchFavorites();
    }

    // Animate the title and icons immediately on mount
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
   * toggleFavorite Function
   * 
   * This asynchronous function toggles the favorite status of a given spot.
   * It updates the favorites state and synchronizes the change with Firestore.
   * 
   * @param {string} spotName - The name of the spot to toggle as favorite
   * @param {string} spotAddress - The address/location of the spot
   */
  const toggleFavorite = async (spotName, spotAddress) => {
    // If the user is not authenticated, show an error alert
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add favorites.');
      return;
    }

    // Reference to the user's favorites document in Firestore
    const userFavoritesRef = doc(db, 'favourites', user.uid);

    try {
      // Fetch the current favorites from Firestore
      const docSnap = await getDoc(userFavoritesRef);
      let userFavorites = docSnap.exists() ? docSnap.data() : {};

      if (userFavorites[spotName]?.isFavourite) {
        // If the spot is already a favorite, remove it
        delete userFavorites[spotName];
        Alert.alert('Removed from Favorites', `${spotName} has been removed.`);
      } else {
        // If the spot is not a favorite, add it with season and location
        userFavorites[spotName] = {
          isFavourite: true,
          season: 'Winter', // Setting the season to 'Winter'
          location: spotAddress,
        };
        Alert.alert('Added to Favorites', `${spotName} has been added.`);
      }

      // Update the favorites in Firestore
      await setDoc(userFavoritesRef, userFavorites);

      // Update the local favorites state
      setFavorites(userFavorites);
    } catch (error) {
      // Log any errors that occur during the update
      console.error('Error updating favorites:', error);
      Alert.alert('Error', 'Could not update favorites. Please try again.');
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
  const handleSpotPress = (spot) => {
    // Navigate based on the spot's name
    if (spot.name === 'Glacier Rink') {
      navigation.navigate('GlacierRinkScreen'); // Ensure this screen is registered
    } else if (spot.name === 'Frosty Pond') {
      navigation.navigate('FrostyPondScreen'); // Ensure this screen is registered
    } else if (spot.name === 'Evergreen Acres') {
      navigation.navigate('EvergreenAcresScreen'); // Ensure this screen is registered
    } else if (spot.name === 'Snowy Pines') {
      navigation.navigate('SnowyPinesScreen'); // Ensure this screen is registered
    } else {
      // Show an alert if the feature is not yet implemented
      Alert.alert('Coming Soon', 'This feature is coming soon.');
    }
  };

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* =========================
          SNOW FALLING ANIMATION
          ========================= */}
      
      {/* LottieView component to display the snow falling animation in the background */}
      <LottieView
        source={snowFalling} // Source of the animation JSON
        autoPlay // Automatically play the animation
        loop // Loop the animation indefinitely
        style={styles.leavesAnimation} // Styling for the animation
        speed={0.3} // Speed of the animation playback
      />

      {/* =========================
          ANIMATED TITLE AND ICONS
          ========================= */}

      {/* Animated View for the header container, including the NavBar and title */}
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

        {/* Screen Title */}
        <Text style={styles.mainTitle}>Winter Dates</Text>
      </Animated.View>

      {/* =========================
          MAIN CONTENT
          ========================= */}

      {/* ScrollView to allow vertical scrolling of content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Mapping through each category to display its spots */}
        {categories.map((category, index) => (
          <Animated.View
            key={index} // Unique key for each category
            style={[
              styles.categorySection, // Base styles for category section
              {
                transform: [
                  { translateX: categoryAnimations[index].translateX }, // Animated horizontal translation
                ],
                opacity: categoryAnimations[index].opacity, // Animated opacity
              },
            ]}
          >
            {/* Category Title */}
            <Text style={styles.categoryTitle}>{category.title}</Text>

            {/* Mapping through each spot within the category */}
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
                {/* Touchable area for the entire spot card */}
                <TouchableOpacity
                  style={styles.dateSpotCardContent} // Styles for the content area
                  onPress={() => handleSpotPress(spot)} // Handler for spot press
                  accessibilityLabel={`View details for ${spot.name}`} // Accessibility label for screen readers
                  accessibilityRole="button" // Accessibility role
                >
                  {/* =========================
                      FAVORITE ICON
                      ========================= */}

                  {/* Touchable area for the favorite (heart) icon */}
                  <TouchableOpacity
                    style={styles.cardHeartIcon} // Styles for the heart icon area
                    onPress={() => toggleFavorite(spot.name, spot.address)} // Handler for toggling favorite
                    accessibilityLabel={`Favorite ${spot.name}`} // Accessibility label
                    accessibilityRole="button" // Accessibility role
                  >
                    {/* Heart Icon indicating favorite status */}
                    <Icon
                      name={
                        favorites[spot.name]?.isFavourite ? 'favorite' : 'favorite-border' // Icon name based on favorite status
                      }
                      size={20} // Size of the icon
                      color={favorites[spot.name]?.isFavourite ? '#FF0000' : '#A9A9A9'} // Color based on favorite status
                    />
                  </TouchableOpacity>

                  {/* =========================
                      SPOT INFORMATION
                      ========================= */}

                  {/* Container for spot name and address */}
                  <View style={styles.cardTextContainer}>
                    {/* Spot Name */}
                    <Text style={styles.dateSpotName}>{spot.name}</Text>

                    {/* Spot Address */}
                    <Text style={styles.addressText}>{spot.address}</Text>
                  </View>

                  {/* =========================
                      NAVIGATION ARROW ICON
                      ========================= */}

                  {/* Touchable area for the navigation arrow icon */}
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
    backgroundColor: '#B9CCEC', // Background color adjusted to winter theme
  },

  // Styling for the snow falling animation
  leavesAnimation: {
    position: 'absolute', // Positioned absolutely to overlay other content
    width: Dimensions.get('window').width * 1.2, // Width relative to screen size
    height: Dimensions.get('window').height * 1.5, // Height relative to screen size
    top: -Dimensions.get('window').height * 0.2, // Positioned slightly above the screen
    left: -Dimensions.get('window').width * 0.25, // Positioned slightly to the left of the screen
    transform: [{ scale: 1.65 }], // Scaling the animation
    opacity: 0.6, // Semi-transparent for subtle effect
  },

  // Styling for the header container (currently empty, can be customized as needed)
  headerContainer: {
    
  },

  // Styling for the main title text
  mainTitle: {
    color: '#FFFFFF', // White text color
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
    color: '#FFFFFF', // White text color
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
    padding: 14, // Padding inside the card
    marginBottom: 18, // Bottom margin to separate cards
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

  // Styling for the container holding spot name and address
  cardTextContainer: {
    flex: 1, // Takes up the remaining space
  },

  // Styling for the spot name text
  dateSpotName: {
    color: '#000000', // Black text color
    fontSize: 22, // Font size
    fontWeight: 'bold', // Bold font weight
  },

  // Styling for the spot address text
  addressText: {
    color: '#696969', // Dim gray text color
    fontSize: 16, // Font size
    marginTop: 4, // Top margin for spacing
  },

  // Styling for the navigation arrow icon area within the card
  cardArrowIcon: {
    marginLeft: 16, // Left margin to separate from text
  },
});