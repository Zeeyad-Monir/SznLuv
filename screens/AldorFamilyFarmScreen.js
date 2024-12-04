// ==================================================
// IMPORTS
// ==================================================

// Import core React library and hooks
import React, { useState, useEffect, useContext, useRef } from 'react';

// Import components and APIs from React Native
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  FlatList,
  Alert,
  Animated,
  Easing,
  TextInput, // Added TextInput for review input
} from 'react-native';

// Import location services from Expo
import * as Location from 'expo-location';

// Import Map components for displaying maps and directions
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

// Import custom components and context
import NavBar from '../components/NavBar'; // Custom navigation bar
import { SettingsContext } from './SettingsContext'; // Context for app settings

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
// CONSTANTS AND API KEYS
// ==================================================
// API key for OpenWeatherMap to fetch weather data
const WEATHER_API_KEY = '92be9d8cdbac2f4865e8666ae541f316'; // Weather API Key

// Google Maps API key for accessing directions and geolocation services
const GOOGLE_MAPS_APIKEY = 'AIzaSyAs3qjk2W3iapdfiw7HIg9CVHlfa8H8NYA'; // GOOGLE

// ==================================================
// MAIN COMPONENT: AldorFamilyFarmScreen
// ==================================================

const AldorFamilyFarmScreen = () => {
  // ==================================================
  // CONTEXT AND STATE HOOKS
  // ==================================================

  // Access 'isLocationEnabled' from SettingsContext to determine if location services are enabled
  const { isLocationEnabled } = useContext(SettingsContext);

  // State variables for user location and potential error messages
  const [location, setLocation] = useState(null); // User's current location
  const [errorMsg, setErrorMsg] = useState(null); // Error message for location fetching
  const [loading, setLoading] = useState(true); // Loading state for location data

  // State variables for weather data and errors
  const [weatherData, setWeatherData] = useState(null); // Weather data fetched from API
  const [weatherError, setWeatherError] = useState(null); // Error message for weather fetching

  // State for unit toggle (Metric or Imperial units)
  const [isMetric, setIsMetric] = useState(true); // True for metric units, false for imperial

  // State for selected day in the weather forecast (used for displaying detailed info)
  const [selectedDayIndex, setSelectedDayIndex] = useState(null); // Index of the selected day

  // State for processed daily weather data
  const [dailyData, setDailyData] = useState([]); // Array of daily weather data objects

  // State variables for reviews
  const [reviews, setReviews] = useState([]); // Array to hold reviews fetched from Firestore
  const [comment, setComment] = useState(''); // User's comment input
  const [user, setUser] = useState(null); // Current authenticated user

  // ==================================================
  // FARM LOCATION COORDINATES
  // ==================================================

  // Latitude and longitude of Aldor Acres Family Farm
  const farmLatitude = 49.1706; // Farm's latitude coordinate
  const farmLongitude = -122.6076; // Farm's longitude coordinate

  // ==================================================
  // ANIMATION REFERENCES
  // ==================================================

  // Create animated values for various UI components to control their opacity and position
  const weatherOpacity = useRef(new Animated.Value(0)).current; // Opacity for weather container
  const weatherTranslateX = useRef(new Animated.Value(50)).current; // Horizontal translation for weather container

  const farmInfoOpacity = useRef(new Animated.Value(0)).current; // Opacity for farm info container
  const farmInfoTranslateX = useRef(new Animated.Value(-50)).current; // Horizontal translation for farm info container

  const imageOpacity = useRef(new Animated.Value(0)).current; // Opacity for farm image
  const imageScale = useRef(new Animated.Value(0.95)).current; // Scale for farm image

  const mapOpacity = useRef(new Animated.Value(0)).current; // Opacity for map container
  const mapTranslateX = useRef(new Animated.Value(50)).current; // Horizontal translation for map container

  const descriptionOpacity = useRef(new Animated.Value(0)).current; // Opacity for description text
  const descriptionTranslateY = useRef(new Animated.Value(30)).current; // Vertical translation for description text

  // ==================================================
  // USE EFFECT HOOKS
  // ==================================================

  // --------------------------------------------
  // Effect Hook: Location Tracking
  // --------------------------------------------

  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      if (!isLocationEnabled) {
        setLoading(false);
        return;
      }

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();

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
            setLocation(newLocation);
            setLoading(false);
          }
        );
      } catch (error) {
        setErrorMsg('Error fetching location.');
        setLoading(false);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isLocationEnabled]);

  // --------------------------------------------
  // Effect Hook: Fetch Weather Data
  // --------------------------------------------

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!isLocationEnabled) {
        setWeatherError('Location services are disabled.');
        return;
      }

      if (location) {
        const { latitude, longitude } = location.coords;

        try {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
          );

          const data = await response.json();

          if (response.ok) {
            const dailyForecasts = processDailyData(data.list);
            setWeatherData(data);
            setDailyData(dailyForecasts);
          } else {
            setWeatherError(data.message || 'Unable to fetch weather data.');
          }
        } catch (error) {
          setWeatherError(error.message || 'An error occurred while fetching weather data.');
        }
      }
    };

    const processDailyData = (list) => {
      const days = {};

      list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];

        if (!days[day]) {
          days[day] = [];
        }

        days[day].push(item);
      });

      const dailyData = Object.keys(days).map((day) => {
        const dayData = days[day];

        const noonData =
          dayData.find((item) => {
            const date = new Date(item.dt * 1000);
            return date.getHours() === 12;
          }) || dayData[Math.floor(dayData.length / 2)];

        return noonData;
      });

      return dailyData;
    };

    fetchWeatherData();
  }, [location, isLocationEnabled]);

  // --------------------------------------------
  // Effect Hook: Animations
  // --------------------------------------------

  useEffect(() => {
    if (!loading) {
      // Animate the weather container (opacity and horizontal translation)
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

      // Animate the farm info container (opacity and horizontal translation)
      Animated.parallel([
        Animated.timing(farmInfoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(farmInfoTranslateX, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the image (opacity and scale)
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

      // Animate the map container (opacity and horizontal translation)
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

      // Animate the description text (opacity and vertical translation)
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
    farmInfoOpacity,
    farmInfoTranslateX,
    imageOpacity,
    imageScale,
    mapOpacity,
    mapTranslateX,
    descriptionOpacity,
    descriptionTranslateY,
  ]);

  // --------------------------------------------
  // Effect Hook: Auth State Listener
  // --------------------------------------------

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --------------------------------------------
  // Effect Hook: Fetch Reviews
  // --------------------------------------------

  useEffect(() => {
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('placeID', '==', 'aldor_farm'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedReviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(updatedReviews);
    });

    return () => unsubscribe();
  }, []);

  // ==================================================
  // HELPER FUNCTIONS
  // ==================================================

  // Converts temperature from metric to imperial units if needed
  const convertTemp = (temp) => {
    return isMetric ? temp.toFixed(1) : ((temp * 9) / 5 + 32).toFixed(1);
  };

  // Returns the unit symbol based on the selected measurement system
  const getUnit = () => {
    return isMetric ? '°C' : '°F';
  };

  // Function to submit a new review
  const submitReview = async () => {
    if (!comment.trim()) {
      Alert.alert('Error', 'Comment cannot be empty.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a review.');
      return;
    }
    const newReview = {
      username: user.displayName || user.email.split('@')[0], // Use displayName or derive from email
      email: user.email,
      profilePic:
        user.photoURL ||
        'https://example.com/default-profile-pic.png', // Replace with default image URL
      comment,
      timestamp: new Date(),
      placeID: 'aldor_farm',
    };
    try {
      await addDoc(collection(db, 'reviews'), newReview);
      setComment('');
      Alert.alert('Success', 'Review submitted!');
    } catch (error) {
      Alert.alert('Error', 'Could not submit the review.');
    }
  };

  // ==================================================
  // RENDER LOGIC
  // ==================================================

  // Variable to hold the content to be displayed based on the state
  let content;

  if (loading) {
    content = <ActivityIndicator size="large" color="#0000ff" />;
  } else if (errorMsg) {
    content = <Text style={styles.errorText}>{errorMsg}</Text>;
  } else if (location) {
    const { latitude, longitude } = location.coords;

    content = (
      <View style={styles.locationContainer}>
        <Text style={styles.locationText}>Your Current Location:</Text>
        <Text style={styles.coordsText}>Latitude: {latitude.toFixed(6)}</Text>
        <Text style={styles.coordsText}>Longitude: {longitude.toFixed(6)}</Text>
      </View>
    );
  } else if (!isLocationEnabled) {
    content = (
      <View style={styles.locationDisabledContainer}>
        <Text style={styles.locationDisabledText}>
          Location services are disabled. Enable them in settings to see your current location and
          directions.
        </Text>
      </View>
    );
  }

  // ==================================================
  // RETURN JSX
  // ==================================================

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <NavBar />

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Weather Information */}
        {isLocationEnabled && weatherData ? (
          // If location is enabled and weather data is available, display the weather container
          <Animated.View
            style={[
              styles.weatherContainer,
              {
                opacity: weatherOpacity, // Bind opacity to animated value
                transform: [{ translateX: weatherTranslateX }], // Bind horizontal translation to animated value
              },
            ]}
          >
            {/* Unit Toggle Switch */}
            <View style={styles.unitToggle}>
              <Text style={styles.unitText}>°C</Text>
              <Switch
                value={!isMetric} // Switch is on when units are imperial
                onValueChange={() => setIsMetric((prev) => !prev)} // Toggle the unit state
              />
              <Text style={styles.unitText}>°F</Text>
            </View>

            {/* Location Name */}
            <View style={styles.locationNameContainer}>
              <Text style={styles.locationName}>
                {weatherData.city.name}, {weatherData.city.country}
              </Text>
            </View>

            {/* Daily Weather Forecast */}
            <View style={styles.dailyContainer}>
              <FlatList
                data={dailyData.slice(0, 5)} // Display the first 5 days of data
                horizontal // Render items horizontally
                showsHorizontalScrollIndicator={false} // Hide horizontal scrollbar
                keyExtractor={(item, index) => index.toString()} // Key extractor for list items
                renderItem={({ item, index }) => (
                  // Render each day in the forecast
                  <TouchableOpacity
                    onPress={() =>
                      setSelectedDayIndex(selectedDayIndex === index ? null : index)
                    } // Toggle detailed view on press
                  >
                    <View style={styles.dailyItem}>
                      <View style={styles.dailyHeader}>
                        {/* Day of the Week */}
                        <Text style={styles.dailyDay}>
                          {new Date(item.dt * 1000).toLocaleDateString('en-US', {
                            weekday: 'short',
                          })}
                        </Text>

                        {/* Weather Icon */}
                        <Image
                          source={{
                            uri: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
                          }}
                          style={styles.dailyIcon}
                        />

                        {/* Detailed View or Temperature */}
                        {selectedDayIndex === index ? (
                          // If the day is selected, show detailed weather information
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
                          // If not selected, show the temperature
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
        ) : !isLocationEnabled ? (
          // If location services are disabled, display a message
          <View style={styles.weatherDisabledContainer}>
            <Text style={styles.weatherDisabledText}>
              Weather information is unavailable because location services are disabled.
            </Text>
          </View>
        ) : weatherError ? (
          // If there is a weather error, display it
          <Text style={styles.errorText}>{weatherError}</Text>
        ) : (
          // If none of the above, display a loading spinner
          <ActivityIndicator size="large" color="#0000ff" />
        )}

        {/* Farm Information */}
        <Animated.View
          style={[
            styles.farmInfoContainer,
            {
              opacity: farmInfoOpacity, // Bind opacity to animated value
              transform: [{ translateX: farmInfoTranslateX }], // Bind horizontal translation to animated value
            },
          ]}
        >
          {/* Farm Title */}
          <Text style={styles.title}>Aldor Acres Family Farm</Text>

          {/* Farm Address */}
          <Text style={styles.address}>24990 84 Ave, Langley, BC</Text>

          {/* Activities Offered at the Farm */}
          <View style={styles.activityBox}>
            <Text style={styles.activityText}>Petting zoo, pumpkins, and more!</Text>
          </View>
        </Animated.View>

        {/* Image of the Farm */}
        <Animated.View
          style={[
            styles.imagePlaceholder,
            {
              opacity: imageOpacity, // Bind opacity to animated value
              transform: [{ scale: imageScale }], // Bind scale to animated value
            },
          ]}
        >
          <Image
            source={require('../assets/FamilyFarm.jpg')} // Image source (local asset)
            style={styles.image}
            resizeMode="cover" // Resize mode to cover the container
          />
        </Animated.View>

        {/* About the Farm */}
        <Animated.View
          style={[
            styles.aboutContainer,
            {
              opacity: descriptionOpacity, // Bind opacity to animated value
              transform: [{ translateY: descriptionTranslateY }], // Bind vertical translation to animated value
            },
          ]}
        >
          <Text style={styles.aboutText}>
            Aldor Acres Family Farm offers an authentic farm experience with a petting zoo, pumpkin
            patch, and more! Enjoy a day filled with family-friendly activities in the heart of
            Langley.
          </Text>
        </Animated.View>

        {/* Current Location Information */}
        <View style={styles.currentLocationBox}>{content}</View>

        {/* Map and Directions */}
        <Animated.View
          style={[
            styles.mapContainer,
            {
              opacity: mapOpacity, // Bind opacity to animated value
              transform: [{ translateX: mapTranslateX }], // Bind horizontal translation to animated value
            },
          ]}
        >
          {/* Map Header */}
          <Text style={styles.mapHeader}>How to get there?</Text>

          {/* Map Wrapper */}
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: farmLatitude, // Initial latitude
                longitude: farmLongitude, // Initial longitude
                latitudeDelta: 0.25, // Latitude zoom level
                longitudeDelta: 0.25, // Longitude zoom level
              }}
              showsUserLocation={isLocationEnabled} // Show user location if enabled
            >
              {/* Marker for the Farm Location */}
              <Marker
                coordinate={{ latitude: farmLatitude, longitude: farmLongitude }}
                title="Aldor Acres Family Farm" // Marker title
                description="Farm location" // Marker description
              />

              {/* Directions from User Location to Farm */}
              {isLocationEnabled && location && (
                <MapViewDirections
                  origin={{
                    latitude: location.coords.latitude, // User's latitude
                    longitude: location.coords.longitude, // User's longitude
                  }}
                  destination={{ latitude: farmLatitude, longitude: farmLongitude }} // Destination coordinates
                  apikey={GOOGLE_MAPS_APIKEY} // Google Maps API key
                  strokeWidth={4} // Width of the direction line
                  strokeColor="hotpink" // Color of the direction line
                />
              )}
            </MapView>

            {/* Overlay if Location Services are Disabled */}
            {!isLocationEnabled && (
              <View style={styles.mapDisabledOverlay}>
                <Text style={styles.mapDisabledText}>
                  Location services are disabled. Enable them to see your route on the map.
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Review Section */}
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewHeader}>Reviews of this Date!</Text>

          {/* Review Input Area */}
          {user ? (
            <View style={styles.reviewInputArea}>
              <TextInput
                style={styles.reviewInput}
                placeholder="Write your review here..."
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.loginPrompt}>Please log in to submit a review.</Text>
          )}

          {/* Review Feed */}
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reviewItem}>
                <Image
                  source={{ uri: item.profilePic }}
                  style={styles.profilePic}
                />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewUsername}>{item.username}</Text>
                  <Text style={styles.reviewEmail}>{item.email}</Text>
                  <Text style={styles.reviewText}>{item.comment}</Text>
                  <Text style={styles.reviewTimestamp}>
                    {item.timestamp.toDate
                      ? item.timestamp.toDate().toLocaleString()
                      : new Date(item.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
};

// Export the component as the default export
export default AldorFamilyFarmScreen;

// ==================================================
// STYLESHEET
// ==================================================

const styles = StyleSheet.create({
  // Main container style
  container: {
    flex: 1, // Take up the full height of the screen
    backgroundColor: '#F4A460', // Background color of the screen
  },
  // Scrollable content style
  scrollContent: {
    paddingBottom: 20, // Padding at the bottom of the content
  },
  // Weather container style
  weatherContainer: {
    backgroundColor: '#BBCDEC', // Background color of the weather container
    borderRadius: 10, // Rounded corners
    margin: 15, // Margin around the container
    padding: 10, // Padding inside the container
  },
  // Unit toggle switch container style
  unitToggle: {
    flexDirection: 'row', // Arrange items horizontally
    alignItems: 'center', // Align items vertically centered
    justifyContent: 'center', // Center items horizontally
    marginBottom: 5, // Margin below the unit toggle
  },
  // Unit text style
  unitText: {
    fontSize: 16, // Font size for the unit text
    color: '#000', // Text color
    marginHorizontal: 5, // Horizontal margin between texts and switch
  },
  // Location name container style
  locationNameContainer: {
    alignItems: 'center', // Center align the content
    marginBottom: 5, // Margin below the location name
  },
  // Location name text style
  locationName: {
    fontSize: 16, // Font size of the location name
    color: '#000', // Text color
    fontWeight: 'bold', // Bold text
  },
  // Daily forecast container style
  dailyContainer: {
    marginBottom: 10, // Margin below the daily container
  },
  // Individual daily item style
  dailyItem: {
    width: 80, // Fixed width for each item
    marginRight: 10, // Margin to the right of each item
  },
  // Daily header style
  dailyHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent background
    borderRadius: 5, // Rounded corners
    padding: 5, // Padding inside the header
    alignItems: 'center', // Center align content
  },
  // Daily day text style
  dailyDay: {
    color: '#000', // Text color
    fontSize: 14, // Font size
  },
  // Daily weather icon style
  dailyIcon: {
    width: 30, // Width of the icon
    height: 30, // Height of the icon
    marginVertical: 2, // Vertical margin around the icon
  },
  // Daily temperature text style
  dailyTemp: {
    color: '#000', // Text color
    fontSize: 14, // Font size
  },
  // Detail container style for expanded view
  detailContainer: {
    alignItems: 'center', // Center align content
  },
  // Detail text style
  detailText: {
    color: '#000', // Text color
    fontSize: 12, // Font size
    textAlign: 'center', // Center align text
  },
  // Weather disabled container style
  weatherDisabledContainer: {
    backgroundColor: '#FAF4E4', // Background color
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    marginHorizontal: 15, // Horizontal margin
    alignItems: 'center', // Center align content
  },
  // Weather disabled text style
  weatherDisabledText: {
    fontSize: 16, // Font size
    color: '#555', // Text color
    textAlign: 'center', // Center align text
  },
  // Farm information container style
  farmInfoContainer: {
    // Empty because styles are added dynamically through animation
  },
  // Title text style
  title: {
    fontSize: 24, // Font size
    fontWeight: 'bold', // Bold text
    color: '#FAF4E4', // Text color
    textAlign: 'center', // Center align text
    marginTop: 10, // Margin above the title
    textTransform: 'uppercase', // Uppercase text
  },
  // Address text style
  address: {
    fontSize: 14, // Font size
    color: '#666', // Text color
    textAlign: 'center', // Center align text
    textTransform: 'uppercase', // Uppercase text
    marginVertical: 5, // Vertical margin
  },
  // Activity box style
  activityBox: {
    backgroundColor: '#FAF4E4', // Background color
    padding: 10, // Padding inside the box
    borderRadius: 10, // Rounded corners
    alignSelf: 'center', // Center the box horizontally
    marginVertical: 10, // Vertical margin
    width: '90%', // Width relative to the parent
    shadowColor: '#000', // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1, // Shadow opacity
    shadowRadius: 2, // Shadow radius
    elevation: 2, // Elevation for Android shadow
  },
  // Activity text style
  activityText: {
    fontSize: 14, // Font size
    color: '#000', // Text color
    textAlign: 'center', // Center align text
    textTransform: 'capitalize', // Capitalize words
  },
  // Image placeholder style
  imagePlaceholder: {
    width: '90%', // Width relative to the parent
    height: 200, // Fixed height
    backgroundColor: '#e0e0e0', // Background color
    borderRadius: 10, // Rounded corners
    alignSelf: 'center', // Center horizontally
    marginVertical: 15, // Vertical margin
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    position: 'relative', // Relative positioning
    overflow: 'hidden', // Hide overflow
  },
  // Image style
  image: {
    width: '100%', // Full width
    height: '100%', // Full height
    borderRadius: 10, // Rounded corners
  },
  // About container style
  aboutContainer: {
    backgroundColor: '#FAF4E4', // Background color
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    marginHorizontal: 15, // Horizontal margin
    shadowColor: '#000', // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1, // Shadow opacity
    shadowRadius: 2, // Shadow radius
    elevation: 2, // Elevation for Android shadow
    marginBottom: 15, // Margin below the container
  },
  // About text style
  aboutText: {
    fontSize: 16, // Font size
    color: '#000', // Text color
    textAlign: 'justify', // Justify text
  },
  // Current location box style
  currentLocationBox: {
    backgroundColor: '#FAF4E4', // Background color
    padding: 15, // Padding inside the box
    borderRadius: 10, // Rounded corners
    alignSelf: 'center', // Center horizontally
    marginVertical: 10, // Vertical margin
    width: '90%', // Width relative to the parent
    shadowColor: '#000', // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.05, // Shadow opacity
    shadowRadius: 1, // Shadow radius
    elevation: 1, // Elevation for Android shadow
  },
  // Location container style
  locationContainer: {
    alignItems: 'center', // Center align content
  },
  // Location text style
  locationText: {
    fontSize: 18, // Font size
    fontWeight: 'bold', // Bold text
    marginBottom: 10, // Margin below the text
    color: '#333', // Text color
  },
  // Coordinates text style
  coordsText: {
    fontSize: 16, // Font size
    marginVertical: 2, // Vertical margin
    color: '#555', // Text color
  },
  // Location disabled container style
  locationDisabledContainer: {
    alignItems: 'center', // Center align content
    padding: 10, // Padding inside the container
  },
  // Location disabled text style
  locationDisabledText: {
    fontSize: 16, // Font size
    color: '#555', // Text color
    textAlign: 'center', // Center align text
  },
  // Map container style
  mapContainer: {
    backgroundColor: '#FAF4E4', // Background color
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    marginHorizontal: 15, // Horizontal margin
    marginTop: 10, // Margin above the container
    shadowColor: '#000', // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1, // Shadow opacity
    shadowRadius: 2, // Shadow radius
    elevation: 2, // Elevation for Android shadow
  },
  // Map header text style
  mapHeader: {
    fontSize: 18, // Font size
    fontWeight: 'bold', // Bold text
    color: '#000', // Text color
    textAlign: 'center', // Center align text
    marginBottom: 10, // Margin below the header
  },
  // Map wrapper style
  mapWrapper: {
    width: '100%', // Full width
    height: 200, // Fixed height
    borderRadius: 10, // Rounded corners
    overflow: 'hidden', // Hide overflow
  },
  // Map style
  map: {
    flex: 1, // Take up all available space
  },
  // Map disabled overlay style
  mapDisabledOverlay: {
    position: 'absolute', // Absolute positioning
    top: 0, // Position at the top
    left: 0, // Position at the left
    right: 0, // Position at the right
    bottom: 0, // Position at the bottom
    backgroundColor: 'rgba(250, 244, 228, 0.8)', // Semi-transparent background
    alignItems: 'center', // Center align content
    justifyContent: 'center', // Center align content vertically
  },
  // Map disabled text style
  mapDisabledText: {
    fontSize: 16, // Font size
    color: '#555', // Text color
    textAlign: 'center', // Center align text
    paddingHorizontal: 20, // Horizontal padding
  },
  // Error text style
  errorText: {
    color: 'red', // Text color
    fontSize: 16, // Font size
    textAlign: 'center', // Center align text
    marginVertical: 10, // Vertical margin
  },

  // ==================================================
  // REVIEW SECTION STYLES
  // ==================================================

  // Review Section Styles
  reviewContainer: {
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
    marginTop: 10,
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
    padding: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  reviewContent: {
    flex: 1,
  },
  reviewUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  reviewEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reviewText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  reviewTimestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});