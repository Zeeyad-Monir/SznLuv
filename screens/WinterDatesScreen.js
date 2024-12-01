// screens/WinterDatesScreen.js

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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../App';
import NavBar from '../components/NavBar';
import LottieView from 'lottie-react-native';
import snowFalling from '../assets/snowFalling.json'; // Ensure this file exists in your assets

export default function WinterDatesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState({});

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Animated values for title and icons
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-50)).current;

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

  // Animated values for categories and cards
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

    // Animate the title and icons immediately on mount
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
    categories.forEach((category, index) => {
      const delay = 1000 + index * 500; // Start after title animation

      // Animate category slide-in and fade-in
      Animated.parallel([
        Animated.timing(categoryAnimations[index].translateX, {
          toValue: 0,
          duration: 500,
          delay: delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(categoryAnimations[index].opacity, {
          toValue: 1,
          duration: 500,
          delay: delay,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate each card within the category
      category.spots.forEach((spot, idx) => {
        const cardDelay = delay + (idx + 1) * 300; // Stagger cards

        Animated.parallel([
          Animated.timing(cardAnimations[index][idx].translateY, {
            toValue: 0,
            duration: 500,
            delay: cardDelay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(cardAnimations[index][idx].opacity, {
            toValue: 1,
            duration: 500,
            delay: cardDelay,
            useNativeDriver: true,
          }),
          Animated.spring(cardAnimations[index][idx].scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            delay: cardDelay,
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  }, []);

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

  const handleSpotPress = (spot) => {
    // Navigate based on spot name
    if (spot.name === 'Aldor Family Farm') {
      navigation.navigate('AldorFamilyFarm');
    }  else {
      Alert.alert('Coming Soon', 'This feature is coming soon.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Snow Falling Animation */}
      <LottieView
        source={snowFalling}
        autoPlay
        loop
        style={styles.leavesAnimation} // Consider renaming to styles.snowAnimation for clarity
        speed={0.3} // Adjusted to match FallDatesScreen.js
      />

      {/* Animated Title and Icons */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        {/* Integrated Navigation Bar */}
        <NavBar />
        {/* Screen Title */}
        <Text style={styles.mainTitle}>Winter Dates</Text>
      </Animated.View>

      {/* Main Content */}
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
              </Animated.View>
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B9CCEC', // Adjusted to winter theme
  },
  leavesAnimation: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').height * 1.5,
    top: -Dimensions.get('window').height * 0.2,
    left: -Dimensions.get('window').width * 0.25,
    transform: [{ scale: 1.65 }],
    opacity: 0.6, // Adjusted to match FallDatesScreen.js
  },
  headerContainer: {
    // Optional: Adjust margin or padding if needed
  },
  mainTitle: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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