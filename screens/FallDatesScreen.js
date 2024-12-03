// SCREENS/FALLDATESSCREEN.JS
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 

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

// Importing the falling leaves animation JSON file
import fallingLeaves from '../assets/fallingLeaves.json';

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * FallDatesScreen Component
 * 
 * This component displays a list of fall date spots categorized under different activities.
 * It includes animations for a visually appealing UI and allows users to favorite spots.
 * Favorites are synchronized with Firestore for persistence.
 */
export default function FallDatesScreen({ navigation }) {
  
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
  // DEVICE DIMENSIONS
  // =========================

  // Getting device screen dimensions for responsive design
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

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

  // Creating animated values for each category's entrance animation
  const categoryAnimations = categories.map(() => ({
    translateX: useRef(new Animated.Value(-50)).current,
    opacity: useRef(new Animated.Value(0)).current,
  }));

  // Creating animated values for each card within the categories
  const cardAnimations = categories.map((category) =>
    category.spots.map(() => ({
      translateY: useRef(new Animated.Value(20)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.8)).current,
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

    // Animate the title
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

    // Animate categories and cards with consistent timing
    let currentDelay = 500;

    categories.forEach((category, categoryIndex) => {
      const categoryDelay = currentDelay + categoryIndex * 400;

      // Animate category slide-in and fade-in
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

      // Animate each card within the category
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
   */
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

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* Falling Leaves Animation */}
      <LottieView
        source={fallingLeaves}
        autoPlay
        loop
        style={styles.leavesAnimation}
        speed={0.6}
      />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        {/* Navigation Bar */}
        <NavBar />
        {/* Main Title */}
        <Text style={styles.mainTitle}>Fall Dates</Text>
      </Animated.View>

      {/* Content */}
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
            {/* Category Title */}
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
                {/* Spot Card */}
                <TouchableOpacity
                  style={styles.dateSpotCardContent}
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
                      name={
                        favorites[spot.name] ? 'favorite' : 'favorite-border'
                      }
                      size={20}
                      color={favorites[spot.name] ? '#FF0000' : '#A9A9A9'}
                    />
                  </TouchableOpacity>

                  {/* Spot Information */}
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.dateSpotName}>{spot.name}</Text>
                    <Text style={styles.addressText}>{spot.address}</Text>
                  </View>

                  {/* Navigation Arrow */}
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
    </View>
  );
}

// =========================
// STYLESHEET SECTION
// =========================

const styles = StyleSheet.create({
  // Main container covering the entire screen
  container: {
    flex: 1,
    backgroundColor: '#F4A460',
  },

  // Styling for the falling leaves animation
  leavesAnimation: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').height * 1.5,
    top: -Dimensions.get('window').height * 0.2,
    left: -Dimensions.get('window').width * 0.25,
    transform: [{ scale: 1.65 }],
    opacity: 0.6,
  },

  // Header container
  headerContainer: {
    // Empty as of now, can add styles if needed
  },

  // Main title text style
  mainTitle: {
    color: '#F5F5DC', // Beige color
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },

  // Content container within the ScrollView
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },

  // Category section style
  categorySection: {
    marginBottom: 40,
  },

  // Category title text style
  categoryTitle: {
    color: '#F5F5DC',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },

  // Date spot card style
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

  // Content inside the date spot card
  dateSpotCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Favorite icon style
  cardHeartIcon: {
    marginRight: 16,
  },

  // Text container inside the card
  cardTextContainer: {
    flex: 1,
  },

  // Spot name text style
  dateSpotName: {
    color: '#000',
    fontSize: 22,
    fontWeight: 'bold',
  },

  // Address text style
  addressText: {
    color: '#696969',
    fontSize: 16,
    marginTop: 4,
  },

  // Navigation arrow icon style
  cardArrowIcon: {
    marginLeft: 16,
  },
});