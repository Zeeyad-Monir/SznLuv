import { upvoteReview } from '../services/reviews';
// ==================================================
// IMPORTS
// ==================================================

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Image,
  SectionList,
  FlatList,
  Alert,
  Animated,
  Easing,
  TextInput,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for dropdown icons

// Import location services from Expo
import * as Location from 'expo-location';

// Import Map components for displaying maps and directions
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

// Import custom components and context
import NavBar from '../components/NavBar';
import useVenueWeather from '../hooks/useVenueWeather';
import { SettingsContext } from './SettingsContext';

// Shared spot data (services/spots.js), API keys, and venue photos
import { getSpotByPlaceID } from '../services/spots';
import { GOOGLE_MAPS_APIKEY } from '../services/apiKeys';
import spotImages from './spotImages';

// Import Firebase authentication and Firestore
import { auth, db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

// ==================================================
// CONSTANTS
// ==================================================

// Sorting and filtering options arrays
const sortOptions = [
  { label: 'Most Recent', value: 'mostRecent' },
  { label: 'Most Popular', value: 'mostPopular' },
  { label: 'Highest Rated', value: 'highestRated' },
  { label: 'Lowest Rated', value: 'lowestRated' },
];

const filterOptions = [
  { label: 'All Reviews', value: '0' },
  { label: '5 Stars', value: '5' },
  { label: '4 Stars', value: '4' },
  { label: '3 Stars', value: '3' },
  { label: '2 Stars', value: '2' },
  { label: '1 Star', value: '1' },
];

// ==================================================
// MAIN COMPONENT: SpotDetailScreen (shared venue page for the spots in services/spots.js)
// ==================================================

const SpotDetailScreen = ({ route }) => {
  const spot = getSpotByPlaceID(route?.params?.placeID);

  // ==================================================
  // CONTEXT AND STATE HOOKS
  // ==================================================

  const { isLocationEnabled } = useContext(SettingsContext);

  const [location, setLocation] = useState(null);
  const [directionsError, setDirectionsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isMetric, setIsMetric] = useState(true);

  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState(null);
  const [comment, setComment] = useState('');
  const [user, setUser] = useState(null);

  const colors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  ];
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [starRating, setStarRating] = useState(0);

  // ADDING STATE FOR SORTING AND FILTERING
  const [sortOption, setSortOption] = useState('mostRecent'); // Default sorting
  const [minStarRating, setMinStarRating] = useState(0); // Default filter: Show all

  // Dropdown states
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // ==================================================
  // VENUE LOCATION COORDINATES
  // ==================================================

  const venueLatitude = spot?.latitude;
  const venueLongitude = spot?.longitude;

  // ==================================================
  // ANIMATION REFERENCES
  // ==================================================

  const weatherOpacity = useRef(new Animated.Value(0)).current;
  const weatherTranslateX = useRef(new Animated.Value(50)).current;

  const venueInfoOpacity = useRef(new Animated.Value(0)).current;
  const venueInfoTranslateX = useRef(new Animated.Value(-50)).current;

  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.95)).current;

  const mapOpacity = useRef(new Animated.Value(0)).current;
  const mapTranslateX = useRef(new Animated.Value(50)).current;

  const descriptionOpacity = useRef(new Animated.Value(0)).current;
  const descriptionTranslateY = useRef(new Animated.Value(30)).current;

  // ==================================================
  // USE EFFECT HOOKS
  // ==================================================

  useEffect(() => {
    let locationSubscription;
    let cancelled = false;

    const startLocationTracking = async () => {
      if (!isLocationEnabled) {
        setLocation(null);
        setErrorMsg(null);
        setLoading(false);
        return;
      }

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setErrorMsg(null);

        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied.');
          setLoading(false);
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1600,
          },
          (newLocation) => {
            if (cancelled) return;
            setLocation(newLocation);
            setLoading(false);
          }
        );
        if (cancelled) locationSubscription.remove();
        else setLoading(false);
      } catch (error) {
        if (cancelled) return;
        setErrorMsg('Error fetching location.');
        setLoading(false);
      }
    };

    startLocationTracking();

    return () => {
      cancelled = true;
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isLocationEnabled]);

  // Forecast for the spot itself (not the user's location), so it loads without a GPS fix
  const { weatherData, dailyData, weatherError } = useVenueWeather(venueLatitude, venueLongitude);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(weatherOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(weatherTranslateX, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(venueInfoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(venueInfoTranslateX, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.ease),
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.spring(imageScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(mapOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.ease),
          delay: 600,
          useNativeDriver: true,
        }),
        Animated.timing(mapTranslateX, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          delay: 600,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(descriptionOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.timing(descriptionTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          delay: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    loading,
    weatherOpacity,
    weatherTranslateX,
    venueInfoOpacity,
    venueInfoTranslateX,
    imageOpacity,
    imageScale,
    mapOpacity,
    mapTranslateX,
    descriptionOpacity,
    descriptionTranslateY,
  ]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Updated useEffect to handle Sorting and Filtering
  useEffect(() => {
    if (!spot) return undefined;
    const reviewsRef = collection(db, 'reviews');

    let constraints = [where('placeID', '==', spot.placeID)];

    // Filtering by minStarRating
    if (minStarRating > 0) {
      constraints.push(where('starRating', '>=', minStarRating));
    }

    // Sorting
    if (sortOption === 'mostPopular') {
      constraints.push(orderBy('thumbsUpCount', 'desc'));
    } else if (sortOption === 'highestRated') {
      constraints.push(orderBy('starRating', 'desc'));
    } else if (sortOption === 'lowestRated') {
      constraints.push(orderBy('starRating', 'asc'));
    } else {
      // mostRecent
      constraints.push(orderBy('timestamp', 'desc'));
    }

    const q = query(reviewsRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedReviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(updatedReviews);
      setReviewsError(null);
    }, (error) => {
      console.error('Reviews subscription failed:', { code: error.code, message: error.message });
      setReviews([]);
      setReviewsError('Reviews could not be loaded. Please try another filter or reopen this page.');
    });

    return () => unsubscribe();
  }, [spot?.placeID, sortOption, minStarRating]);

  const convertTemp = (temp) => {
    return isMetric ? temp.toFixed(1) : ((temp * 9) / 5 + 32).toFixed(1);
  };

  const getUnit = () => {
    return isMetric ? '°C' : '°F';
  };

  const submitReview = async () => {
    if (!comment.trim()) {
      Alert.alert('Error', 'Comment cannot be empty.');
      return;
    }
    if (starRating === 0) {
      Alert.alert('Error', 'Please select a star rating.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a review.');
      return;
    }

    const newReview = {
      username: user.displayName || user.email.split('@')[0],
      profileColor: selectedColor,
      comment,
      starRating,
      timestamp: new Date(),
      placeID: spot.placeID,
      thumbsUpCount: 0,
    };
    try {
      await addDoc(collection(db, 'reviews'), newReview);
      setComment('');
      setStarRating(0);
      setSelectedColor(colors[0]);
      Alert.alert('Success', 'Review submitted!');
    } catch (error) {
      console.error('Review submission failed:', { code: error.code, message: error.message });
      Alert.alert('Error', 'Could not submit the review.');
    }
  };

  const handleThumbsUp = async (reviewId) => {
    try {
      await upvoteReview(user?.uid, reviewId);
      Alert.alert('Success', 'You upvoted the review!');
    } catch (error) {
      console.error('Thumbs-Up Error:', { code: error.code });
      Alert.alert('Could not upvote', error.code === 'review/already-voted' ? error.message : 'Failed to upvote the review. Please try again.');
    }
  };

  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, review) => {
          const rating = review.starRating ? Number(review.starRating) : 0;
          return sum + (isNaN(rating) ? 0 : rating);
        }, 0) / reviews.length
      ).toFixed(1)
    : 0;

  const sections = [
    {
      title: 'Main',
      data: ['main'],
    },
    {
      title: 'Reviews',
      data: ['review'],
    },
  ];

  if (!spot) {
    return (
      <View style={styles.container}>
        <NavBar />
        <Text style={styles.errorText}>Details unavailable for this spot.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavBar />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item + index}
        renderSectionHeader={({ section: { title } }) =>
          title === 'Main' ? null : null
        }
        renderItem={({ item, section }) => {
          if (section.title === 'Main') {
            return (
              <>
                {/* Main Section */}
                {weatherData ? (
                  <Animated.View
                    style={[
                      styles.weatherContainer,
                      {
                        opacity: weatherOpacity,
                        transform: [{ translateX: weatherTranslateX }],
                      },
                    ]}
                  >
                    <View style={styles.unitToggle}>
                      <Text style={styles.unitText}>°C</Text>
                      <Switch
                        value={!isMetric}
                        onValueChange={() => setIsMetric((prev) => !prev)}
                      />
                      <Text style={styles.unitText}>°F</Text>
                    </View>

                    <View style={styles.locationNameContainer}>
                      <Text style={styles.locationName}>
                        {weatherData.city.name}, {weatherData.city.country}
                      </Text>
                    </View>

                    <View style={styles.dailyContainer}>
                      <FlatList
                        data={dailyData.slice(0, 5)}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, index }) => (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedDayIndex(selectedDayIndex === index ? null : index)
                            }
                          >
                            <View style={styles.dailyItem}>
                              <View style={styles.dailyHeader}>
                                <Text style={styles.dailyDay}>
                                  {new Date(item.dt * 1000).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                  })}
                                </Text>

                                <Image
                                  source={{
                                    uri: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
                                  }}
                                  style={styles.dailyIcon}
                                />

                                {selectedDayIndex === index ? (
                                  <View style={styles.detailContainer}>
                                    <Text style={styles.detailText}>
                                      Wind: {item.wind.speed} m/s
                                    </Text>
                                    <Text style={styles.detailText}>
                                      Humidity: {item.main.humidity}%
                                    </Text>
                                    <Text style={styles.detailText}>
                                      {item.weather[0].description}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={styles.dailyTemp}>
                                    {convertTemp(item.main.temp)}
                                    {getUnit()}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </Animated.View>
                ) : weatherError ? (
                  <View style={styles.weatherDisabledContainer}>
                    <Text style={styles.weatherDisabledText}>{weatherError}</Text>
                  </View>
                ) : (
                  <ActivityIndicator size="large" color="#0000ff" />
                )}

                <Animated.View
                  style={[
                    styles.venueInfoContainer,
                    {
                      opacity: venueInfoOpacity,
                      transform: [{ translateX: venueInfoTranslateX }],
                    },
                  ]}
                >
                  <Text
                    style={styles.title}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    maxFontSizeMultiplier={1.2}
                  >
                    {spot.title}
                  </Text>
                  <Text style={styles.address}>{spot.detailAddress}</Text>

                  <View style={styles.activityBox}>
                    <Text style={styles.activityText}>
                      {spot.tagline}
                    </Text>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.imagePlaceholder,
                    {
                      opacity: imageOpacity,
                      transform: [{ scale: imageScale }],
                    },
                  ]}
                >
                  {spotImages[spot.placeID] ? (
                    <Image
                      source={spotImages[spot.placeID]}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.imagePlaceholderText}>Photo coming soon</Text>
                  )}
                </Animated.View>

                <Animated.View
                  style={[
                    styles.aboutContainer,
                    {
                      opacity: descriptionOpacity,
                      transform: [{ translateY: descriptionTranslateY }],
                    },
                  ]}
                >
                  <Text
                    style={styles.aboutText}
                    numberOfLines={isDescriptionExpanded ? null : 5}
                  >
                    {spot.about.join('\n\n')}
                  </Text>

                  <TouchableOpacity
                    style={styles.readMoreButton}
                    onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  >
                    <Text style={styles.readMoreButtonText}>
                      {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.mapContainer,
                    {
                      opacity: mapOpacity,
                      transform: [{ translateX: mapTranslateX }],
                    },
                  ]}
                >
                  <Text style={styles.mapHeader}>How to get there?</Text>
                  {directionsError && <Text accessibilityRole="alert">Directions are currently unavailable. You can still see the venue on the map.</Text>}
                  {!!errorMsg && <Text accessibilityRole="alert">{errorMsg} Directions need your location, but you can still see the venue on the map.</Text>}

                  <View style={styles.mapWrapper}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: venueLatitude,
                        longitude: venueLongitude,
                        latitudeDelta: 0.25,
                        longitudeDelta: 0.25,
                      }}
                      showsUserLocation={isLocationEnabled}
                    >
                      <Marker
                        coordinate={{ latitude: venueLatitude, longitude: venueLongitude }}
                        title={spot.title}
                        description={spot.detailAddress}
                      />

                      {isLocationEnabled && location && (
                        <MapViewDirections
                  onReady={() => setDirectionsError(false)}
                  onError={(message) => { console.error('Directions unavailable:', message); setDirectionsError(true); }}
                          origin={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                          }}
                          destination={{ latitude: venueLatitude, longitude: venueLongitude }}
                          apikey={GOOGLE_MAPS_APIKEY}
                          strokeWidth={4}
                          strokeColor="hotpink"
                        />
                      )}
                    </MapView>

                    {!isLocationEnabled && (
                      <View style={styles.mapDisabledOverlay}>
                        <Text style={styles.mapDisabledText}>
                          Location services are disabled. Enable them to see your route on the map.
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              </>
            );
          } else if (section.title === 'Reviews') {
            return (
              <View style={styles.reviewSectionContainer}>
               

                {/* Average Rating */}
                <View style={styles.averageRatingContainer}>
                  <Text style={styles.averageRatingText}>
                    User Ratings: {averageRating}/5 ★
                  </Text>
                </View>

                {/* Review Submission */}
                <View style={styles.reviewContainer}>
                  <Text style={styles.reviewHeader}>Reviews of this Date!</Text>

                  {user ? (
                    <View style={styles.reviewInputArea}>
                      <View style={styles.starRatingContainer}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <TouchableOpacity
                            key={rating}
                            onPress={() => setStarRating(rating)}
                          >
                            <Text
                              style={[
                                styles.star,
                                { color: rating <= starRating ? '#FFD700' : '#ccc' },
                              ]}
                            >
                              ★
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TextInput
                        style={styles.reviewInput}
                        placeholder="Write your review here..."
                        value={comment}
                        onChangeText={setComment}
                        multiline
                      />

                      <View style={styles.colorPickerContainer}>
                        <FlatList
                          data={colors}
                          horizontal
                          keyExtractor={(item) => item}
                          renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => setSelectedColor(item)}>
                              <View
                                style={[
                                  styles.colorCircle,
                                  { backgroundColor: item },
                                  selectedColor === item && styles.selectedColorCircle,
                                ]}
                              />
                            </TouchableOpacity>
                          )}
                        />
                      </View>

                      <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                        <Text style={styles.submitButtonText}>Submit</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.loginPrompt}>Please log in to submit a review.</Text>
                  )}
                </View>
                <Text style={styles.filterTitle}>Filter Reviews</Text>
                {/* Updated Sorting and Filtering UI with Classic Dropdowns */}
                <View style={styles.filterRow}>
                
                  {/* Sort By Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownHeader}
                      onPress={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    >
                      <Text style={styles.dropdownHeaderText}>
                        {
                          sortOptions.find((o) => o.value === sortOption)?.label ||
                          "Sort By"
                        }
                      </Text>
                      <Ionicons
                        name={isSortDropdownOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#555"
                      />
                    </TouchableOpacity>
                    {isSortDropdownOpen && (
                      <View style={styles.dropdownOptions}>
                        {sortOptions.map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setSortOption(opt.value);
                              setIsSortDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.dropdownOptionText}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Filter By Minimum Stars Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownHeader}
                      onPress={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <Text style={styles.dropdownHeaderText}>
                        {
                          filterOptions.find((o) => parseInt(o.value,10) === minStarRating)?.label
                          || "Filter"
                        }
                      </Text>
                      <Ionicons
                        name={isFilterDropdownOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#555"
                      />
                    </TouchableOpacity>
                    {isFilterDropdownOpen && (
                      <View style={styles.dropdownOptions}>
                        {filterOptions.map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setMinStarRating(parseInt(opt.value, 10));
                              setIsFilterDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.dropdownOptionText}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.separator} />

                {/* Review List */}
                {!!reviewsError && <Text accessibilityRole="alert">{reviewsError}</Text>}
                {reviews.length > 0 ? (
                  reviews.map((item) => (
                    <View key={item.id} style={styles.reviewItem}>
                      <View
                        style={[
                          styles.profilePic,
                          { backgroundColor: item.profileColor || '#ccc' },
                        ]}
                      >
                        <Text style={styles.profilePicText}>
                          {(item.username || 'User').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewContent}>
                        <View style={styles.reviewHeaderContainer}>
                          <Text style={styles.reviewUsername}>{item.username}</Text>
                          <View style={styles.thumbsUpButtonContainer}>
                            <TouchableOpacity onPress={() => handleThumbsUp(item.id)}>
                              <Image
                                source={require('../assets/thumbsUp.png')}
                                style={styles.thumbsUpIcon}
                              />
                            </TouchableOpacity>
                            <Text style={styles.thumbsUpCount}>
                              {item.thumbsUpCount || 0}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.reviewStars}>
                          {'★'.repeat(item.starRating).padEnd(5, '☆')}
                        </Text>
                        <Text style={styles.reviewText}>{item.comment}</Text>
                        <Text style={styles.reviewTimestamp}>
                          {item.timestamp?.toDate
                            ? item.timestamp?.toDate().toLocaleString()
                            : new Date(item.timestamp).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
                )}
              </View>
            );
          }
        }}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.scrollContent}
      />
    </View>
  );
};

export default SpotDetailScreen;

// ==================================================
// STYLESHEET
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4A460',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  weatherContainer: {
    backgroundColor: '#BBCDEC',
    borderRadius: 10,
    margin: 15,
    padding: 10,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  unitText: {
    fontSize: 16,
    color: '#000',
    marginHorizontal: 5,
  },
  locationNameContainer: {
    alignItems: 'center',
    marginBottom: 5,
  },
  locationName: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  dailyContainer: {
    marginBottom: 10,
  },
  dailyItem: {
    width: 80,
    marginRight: 10,
  },
  dailyHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 5,
    padding: 5,
    alignItems: 'center',
  },
  dailyDay: {
    color: '#000',
    fontSize: 14,
  },
  dailyIcon: {
    width: 30,
    height: 30,
    marginVertical: 2,
  },
  dailyTemp: {
    color: '#000',
    fontSize: 14,
  },
  detailContainer: {
    alignItems: 'center',
  },
  detailText: {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
  },
  weatherDisabledContainer: {
    backgroundColor: '#FAF4E4',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  weatherDisabledText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  venueInfoContainer: {},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAF4E4',
    textAlign: 'center',
    paddingHorizontal: 15, // Keeps a margin when the title shrinks to fit on one line
    marginTop: 10,
    textTransform: 'uppercase',
  },
  address: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginVertical: 5,
  },
  activityBox: {
    backgroundColor: '#FAF4E4',
    padding: 10,
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 10,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  imagePlaceholder: {
    width: '90%',
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#777',
  },
  aboutContainer: {
    backgroundColor: '#FAF4E4',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  aboutText: {
    fontSize: 16,
    color: '#000',
  },
  readMoreButton: {
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  readMoreButtonText: {
    fontSize: 14,
    color: '#1E90FF',
    textDecorationLine: 'underline',
  },
  mapContainer: {
    backgroundColor: '#FAF4E4',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
  },
  mapWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 244, 228, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDisabledText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  reviewSectionContainer: {
    backgroundColor: '#FAF4E4',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 15,
  },
  reviewHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
  },
  reviewInputArea: {
    marginBottom: 15,
  },
  reviewInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  submitButton: {
    backgroundColor: '#F4A460',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FAF4E4',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginPrompt: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 15,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewContent: {
    flex: 1,
  },
  reviewHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  thumbsUpButtonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbsUpIcon: {
    width: 15,
    height: 15,
    marginBottom: 2,
    marginTop: 5,
    marginRight: 5,
    opacity: 0.5,
  },
  thumbsUpCount: {
    fontSize: 12,
    marginRight: 5,
    color: '#333',
    opacity: 0.7,
  },
  reviewUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  reviewStars: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 10,
    marginTop: -10,
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  reviewTimestamp: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
    marginBottom: 20,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 8,
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#000',
  },
  profilePicText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  star: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  averageRatingContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  averageRatingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F4A460',
  },
  
  /* Styles for the new dropdown menus */
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginVertical: 10,
    alignItems: 'center',
  },
  dropdownContainer: {
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    marginBottom: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  dropdownHeaderText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptions: {
    backgroundColor: '#fff',
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
   
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#555',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
});