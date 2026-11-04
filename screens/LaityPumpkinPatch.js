// SCREENS/LAITYPUMPKINPATCH.JS

// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and hooks from React
import React, { useState, useEffect, useContext, useRef } from 'react';

// Importing React Native components and APIs
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
} from 'react-native';

// Importing Expo's Location API for handling location services
import * as Location from 'expo-location';

// Importing MapView and Marker from react-native-maps for map functionalities
import MapView, { Marker } from 'react-native-maps';

// Importing MapViewDirections for displaying directions on the map
import MapViewDirections from 'react-native-maps-directions';

// Importing a custom navigation bar component
import NavBar from '../components/NavBar';

// Importing SettingsContext to access location settings
import { SettingsContext } from './SettingsContext';

// =========================
// CONSTANTS SECTION
// =========================

// OpenWeatherMap API key for fetching weather data
const WEATHER_API_KEY = '92be9d8cdbac2f4865e8666ae541f316';

// Google Maps API key for map directions
const GOOGLE_MAPS_APIKEY = 'AIzaSyAs3qjk2W3iapdfiw7HIg9CVHlfa8H8NYA';

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * LaityPumpkinPatch Component
 * 
 * This component displays information about the Laity Pumpkin Patch, including:
 * - User's current location
 * - Weather forecast
 * - Detailed information about the pumpkin patch
 * - An interactive map with directions
 * 
 * It utilizes animations for a dynamic user interface and integrates with Firebase Firestore
 * to manage user favorites. Location services are handled based on user settings.
 */
const LaityPumpkinPatch = () => {
  // Accessing the isLocationEnabled value from SettingsContext
  const { isLocationEnabled } = useContext(SettingsContext);

  // =========================
  // STATE VARIABLES SECTION
  // =========================

  // State to store the user's current location
  const [location, setLocation] = useState(null);
  const [directionsError, setDirectionsError] = useState(false);

  // State to store any error messages related to location fetching
  const [errorMsg, setErrorMsg] = useState(null);

  // State to manage the loading indicator visibility
  const [loading, setLoading] = useState(true);

  // State to store fetched weather data
  const [weatherData, setWeatherData] = useState(null);

  // State to store any error messages related to weather data fetching
  const [weatherError, setWeatherError] = useState(null);

  // State to toggle between metric and imperial units
  const [isMetric, setIsMetric] = useState(true);

  // State to manage the selected day's index in the weather forecast
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  // State to store processed daily weather data
  const [dailyData, setDailyData] = useState([]);

  // =========================
  // LOCATION CONSTANTS SECTION
  // =========================

  // Latitude and longitude of the Laity Pumpkin Patch
  const farmLatitude = 49.23465;
  const farmLongitude = -122.63515;

  // =========================
  // ANIMATED VALUES SECTION
  // =========================

  // Animated values for weather information animations
  const weatherOpacity = useRef(new Animated.Value(0)).current;
  const weatherTranslateX = useRef(new Animated.Value(50)).current;

  // Animated values for farm information animations
  const farmInfoOpacity = useRef(new Animated.Value(0)).current;
  const farmInfoTranslateX = useRef(new Animated.Value(-50)).current;

  // Animated values for image animations
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.95)).current;

  // Animated values for about section animations
  const aboutOpacity = useRef(new Animated.Value(0)).current;
  const aboutTranslateY = useRef(new Animated.Value(30)).current;

  // Animated values for map animations
  const mapOpacity = useRef(new Animated.Value(0)).current;
  const mapTranslateX = useRef(new Animated.Value(50)).current;

  // =========================
  // LOCATION EFFECT SECTION
  // =========================

  /**
   * useEffect Hook: Handles location tracking based on user settings.
   * 
   * - Requests location permissions if enabled.
   * - Subscribes to location updates.
   * - Updates the location state with new coordinates.
   * - Handles errors related to location services.
   */
  useEffect(() => {
    let locationSubscription;
    let cancelled = false;

    const startLocationTracking = async () => {
      if (!isLocationEnabled) {
        setLocation(null);
        setErrorMsg(null);
        setLoading(false); // Stop loading if location services are disabled
        return;
      }

      try {
        // Requesting foreground location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setErrorMsg(null);

        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied.');
          setLoading(false);
          return;
        }

        // Subscribing to location updates with high accuracy and distance interval
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000, // Update every second
            distanceInterval: 1600, // Update every mile (approx. 1600 meters)
          },
          (newLocation) => {
            if (cancelled) return;
            setLocation(newLocation); // Update location state with new coordinates
            setLoading(false); // Stop loading once location is obtained
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

    // Cleanup function to remove location subscription when component unmounts
    return () => {
      cancelled = true;
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isLocationEnabled]);

  // =========================
  // WEATHER DATA EFFECT SECTION
  // =========================

  /**
   * useEffect Hook: Fetches weather data based on the user's current location.
   * 
   * - Checks if location services are enabled.
   * - Fetches weather forecast data from OpenWeatherMap API.
   * - Processes the fetched data to extract daily forecasts.
   * - Handles errors related to weather data fetching.
   */
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!isLocationEnabled) {
        setWeatherError('Location services are disabled.');
        return;
      }

      if (location) {
        const { latitude, longitude } = location.coords;

        try {
          // Fetching weather forecast data from OpenWeatherMap API
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
          );

          const data = await response.json();

          if (response.ok) {
            setWeatherError(null);
            // Processing fetched data to extract daily forecasts
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

    /**
     * processDailyData Function
     * 
     * Processes the raw weather data to extract daily forecasts.
     * Selects the forecast closest to noon for each day.
     *
     * @param {Array} list - Array of weather forecast data points.
     * @returns {Array} - Array of processed daily weather data.
     */
    const processDailyData = (list) => {
      const days = {};
      list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0]; // Extracting the date in YYYY-MM-DD format
        if (!days[day]) {
          days[day] = [];
        }
        days[day].push(item);
      });

      const dailyData = Object.keys(days).map((day) => {
        // Selecting the forecast closest to noon
        const dayData = days[day];
        const noonData =
          dayData.find((item) => {
            const date = new Date(item.dt * 1000);
            return date.getHours() === 12;
          }) || dayData[Math.floor(dayData.length / 2)]; // Fallback to the middle item if noon data is not available

        return noonData;
      });

      return dailyData;
    };

    fetchWeatherData();
  }, [location, isLocationEnabled]);

  // =========================
  // ANIMATION EFFECT SECTION
  // =========================

  /**
   * useEffect Hook: Triggers animations once the loading state changes.
   * 
   * - Animates weather information sliding in from the right.
   * - Animates farm information sliding in from the left.
   * - Animates the image fading in and scaling up.
   * - Animates the about section fading in and moving up.
   * - Animates the map sliding in from the right.
   */
  useEffect(() => {
    if (!loading) {
      // Animating the weather information container
      Animated.parallel([
        Animated.timing(weatherOpacity, {
          toValue: 1, // Final opacity
          duration: 700, // Duration of the animation
          easing: Easing.out(Easing.ease), // Easing function for smoothness
          useNativeDriver: true,
        }),
        Animated.timing(weatherTranslateX, {
          toValue: 0, // Final translation
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Animating the farm information container
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

      // Animating the image container
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.ease),
          delay: 300, // Delayed start
          useNativeDriver: true,
        }),
        Animated.spring(imageScale, {
          toValue: 1, // Final scale
          friction: 8, // Friction for the spring effect
          tension: 40, // Tension for the spring effect
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animating the about section
      Animated.parallel([
        Animated.timing(aboutOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.timing(aboutTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          delay: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Animating the map container
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
    }
  }, [
    loading,
    weatherOpacity,
    weatherTranslateX,
    farmInfoOpacity,
    farmInfoTranslateX,
    imageOpacity,
    imageScale,
    aboutOpacity,
    aboutTranslateY,
    mapOpacity,
    mapTranslateX,
  ]);

  // =========================
  // UTILITY FUNCTIONS SECTION
  // =========================

  /**
   * convertTemp Function
   * 
   * Converts temperature between Celsius and Fahrenheit based on user preference.
   *
   * @param {number} temp - The temperature value to convert.
   * @returns {string} - The converted temperature as a string with one decimal place.
   */
  const convertTemp = (temp) => {
    return isMetric ? temp.toFixed(1) : ((temp * 9) / 5 + 32).toFixed(1);
  };

  /**
   * getUnit Function
   * 
   * Retrieves the temperature unit symbol based on user preference.
   *
   * @returns {string} - The temperature unit symbol ('°C' or '°F').
   */
  const getUnit = () => {
    return isMetric ? '°C' : '°F';
  };

  // =========================
  // CONTENT RENDERING SECTION
  // =========================

  let content;

  if (loading) {
    // Display a loading indicator while fetching data
    content = <ActivityIndicator size="large" color="#0000ff" />;
  } else if (errorMsg) {
    // Display error message if location fetching fails
    content = <Text style={styles.errorText}>{errorMsg}</Text>;
  } else if (location) {
    // Display user's current location coordinates
    const { latitude, longitude } = location.coords;
    content = (
      <View style={styles.locationContainer}>
        <Text style={styles.locationText}>Your Current Location:</Text>
        <Text style={styles.coordsText}>Latitude: {latitude.toFixed(6)}</Text>
        <Text style={styles.coordsText}>Longitude: {longitude.toFixed(6)}</Text>
      </View>
    );
  } else if (!isLocationEnabled) {
    // Inform the user if location services are disabled
    content = (
      <View style={styles.locationDisabledContainer}>
        <Text style={styles.locationDisabledText}>
          Location services are disabled. Enable them in settings to see your current location and directions.
        </Text>
      </View>
    );
  }

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* Custom Navigation Bar */}
      <NavBar />

      {/* ScrollView to allow vertical scrolling of content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLocationEnabled && weatherData ? (
          // Weather Information Section with Animations
          <Animated.View
            style={[
              styles.weatherContainer,
              {
                opacity: weatherOpacity, // Animated opacity
                transform: [{ translateX: weatherTranslateX }], // Animated horizontal translation
              },
            ]}
          >
            {/* Unit Toggle Switch */}
            <View style={styles.unitToggle}>
              <Text style={styles.unitText}>°C</Text>
              <Switch
                value={!isMetric}
                onValueChange={() => setIsMetric((prev) => !prev)} // Toggle between metric and imperial
              />
              <Text style={styles.unitText}>°F</Text>
            </View>

            {/* Location Name Display */}
            <View style={styles.locationNameContainer}>
              <Text style={styles.locationName}>
                {weatherData.city.name}, {weatherData.city.country}
              </Text>
            </View>

            {/* Daily Weather Forecast */}
            <View style={styles.dailyContainer}>
              <FlatList
                data={dailyData.slice(0, 5)} // Displaying the first 5 days
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => index.toString()} // Unique key for each item
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() =>
                      setSelectedDayIndex(selectedDayIndex === index ? null : index) // Toggle detailed view
                    }
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

                        {selectedDayIndex === index ? (
                          // Detailed Weather Information
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
                          // Daily Temperature Display
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
          // Weather Disabled Message
          <View style={styles.weatherDisabledContainer}>
            <Text style={styles.weatherDisabledText}>
              Weather information is unavailable because location services are disabled.
            </Text>
          </View>
        ) : weatherError ? (
          // Weather Fetching Error Message
          <Text style={styles.errorText}>{weatherError}</Text>
        ) : (
          // Fallback Loading Indicator
          <ActivityIndicator size="large" color="#0000ff" />
        )}

        {/* Farm Information Section with Animations */}
        <Animated.View
          style={[
            styles.farmInfoContainer,
            {
              opacity: farmInfoOpacity, // Animated opacity
              transform: [{ translateX: farmInfoTranslateX }], // Animated horizontal translation
            },
          ]}
        >
          {/* Farm Title */}
          <Text style={styles.title}>Laity Pumpkin Patch</Text>

          {/* Farm Address */}
          <Text style={styles.address}>12725 Laity St, Maple Ridge, BC</Text>

          {/* Activity Box Highlighting Features */}
          <View style={styles.activityBox}>
            <Text style={styles.activityText}>Two pumpkin patches, corn mazes, and a pumpkin cannon!</Text>
          </View>
        </Animated.View>

        {/* Image Section with Animations */}
        <Animated.View
          style={[
            styles.imagePlaceholder,
            {
              opacity: imageOpacity, // Animated opacity
              transform: [{ scale: imageScale }], // Animated scaling
            },
          ]}
        >
          {/* Displaying the farm image */}
          <Image
            source={require('../assets/Laity.png')} // Image source
            style={styles.image}
            resizeMode="cover" // Image resize mode
          />
        </Animated.View>

        {/* About Section with Animations */}
        <Animated.View
          style={[
            styles.aboutContainer,
            {
              opacity: aboutOpacity, // Animated opacity
              transform: [{ translateY: aboutTranslateY }], // Animated vertical translation
            },
          ]}
        >
          {/* About Text */}
          <Text style={styles.aboutText}>
            We opened a brand new location across the street to our original location. The original Laity Pumpkin Patch is
            referred to as the North location and is designed for the younger members of your family. Our newest location
            is referred to as the South location and is designed to entertain your children as they get older. Both locations
            have attractions that the whole family can enjoy together!
          </Text>
        </Animated.View>

        {/* Current Location Display */}
        <View style={styles.currentLocationBox}>{content}</View>

        {/* Map Section with Animations */}
        <Animated.View
          style={[
            styles.mapContainer,
            {
              opacity: mapOpacity, // Animated opacity
              transform: [{ translateX: mapTranslateX }], // Animated horizontal translation
            },
          ]}
        >
          {/* Map Header */}
          <Text style={styles.mapHeader}>How to get there?</Text>
                  {directionsError && <Text accessibilityRole="alert">Directions are currently unavailable. You can still see the venue on the map.</Text>}

          {/* Map Wrapper */}
          <View style={styles.mapWrapper}>
            {/* MapView Component */}
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: farmLatitude,
                longitude: farmLongitude,
                latitudeDelta: 0.25, // Zoom level for latitude
                longitudeDelta: 0.25, // Zoom level for longitude
              }}
              showsUserLocation={isLocationEnabled} // Shows user location if enabled
            >
              {/* Marker for Laity Pumpkin Patch */}
              <Marker
                coordinate={{ latitude: farmLatitude, longitude: farmLongitude }}
                title="Laity Pumpkin Patch"
                description="Pumpkin Patch location"
              />

              {/* Directions from User Location to Pumpkin Patch */}
              {isLocationEnabled && location && (
                <MapViewDirections
                  onReady={() => setDirectionsError(false)}
                  onError={(message) => { console.error('Directions unavailable:', message); setDirectionsError(true); }}
                  origin={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  destination={{ latitude: farmLatitude, longitude: farmLongitude }}
                  apikey={GOOGLE_MAPS_APIKEY} // Google Maps API key
                  strokeWidth={4} // Width of the directions line
                  strokeColor="hotpink" // Color of the directions line
                />
              )}
            </MapView>

            {/* Overlay Message if Location Services are Disabled */}
            {!isLocationEnabled && (
              <View style={styles.mapDisabledOverlay}>
                <Text style={styles.mapDisabledText}>
                  Location services are disabled. Enable them to see your route on the map.
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// Exporting the LaityPumpkinPatch component as the default export
export default LaityPumpkinPatch;

// =========================
// STYLESHEET SECTION
// =========================

/**
 * Styles for LaityPumpkinPatch components
 * 
 * This stylesheet defines the visual appearance of the LaityPumpkinPatch screen, including layout, colors, fonts, and spacing.
 */
const styles = StyleSheet.create({
  // Main container covering the entire screen
  container: {
    flex: 1, // Takes up the full available space
    backgroundColor: '#F4A460', // Background color matching the theme
  },

  // Styling for the ScrollView content container
  scrollContent: {
    paddingBottom: 20, // Padding at the bottom to prevent content cutoff
  },

  // Weather Information Container
  weatherContainer: {
    backgroundColor: '#BBCDEC', // Light blue background for weather section
    borderRadius: 10, // Rounded corners
    margin: 15, // Margin around the container
    padding: 10, // Padding inside the container
  },

  // Unit Toggle Switch Container
  unitToggle: {
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center', // Vertically centers child elements
    justifyContent: 'center', // Horizontally centers child elements
    marginBottom: 5, // Space below the toggle
  },

  // Unit Text Style
  unitText: {
    fontSize: 16, // Font size for unit labels
    color: '#000', // Black color for readability
    marginHorizontal: 5, // Horizontal margin between elements
  },

  // Location Name Container
  locationNameContainer: {
    alignItems: 'center', // Centers child elements horizontally
    marginBottom: 5, // Space below the location name
  },

  // Location Name Text
  locationName: {
    fontSize: 16, // Font size for location name
    color: '#000', // Black color for readability
    fontWeight: 'bold', // Bold font weight for emphasis
  },

  // Daily Weather Forecast Container
  dailyContainer: {
    marginBottom: 10, // Space below the daily forecasts
  },

  // Individual Daily Forecast Item
  dailyItem: {
    width: 80, // Width of each forecast item
    marginRight: 10, // Space between forecast items
  },

  // Daily Forecast Header Container
  dailyHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white background
    borderRadius: 5, // Rounded corners
    padding: 5, // Padding inside the header
    alignItems: 'center', // Centers child elements horizontally
  },

  // Day of the Week Text
  dailyDay: {
    color: '#000', // Black color for readability
    fontSize: 14, // Font size for day label
  },

  // Weather Icon Style
  dailyIcon: {
    width: 30, // Width of the icon
    height: 30, // Height of the icon
    marginVertical: 2, // Vertical margin around the icon
  },

  // Daily Temperature Text
  dailyTemp: {
    color: '#000', // Black color for readability
    fontSize: 14, // Font size for temperature
  },

  // Detailed Weather Information Container
  detailContainer: {
    alignItems: 'center', // Centers child elements horizontally
  },

  // Detailed Weather Information Text
  detailText: {
    color: '#000', // Black color for readability
    fontSize: 12, // Font size for detailed info
    textAlign: 'center', // Centers the text
  },

  // Weather Disabled Container
  weatherDisabledContainer: {
    backgroundColor: '#FAF4E4', // Light beige background
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    marginHorizontal: 15, // Horizontal margin
    alignItems: 'center', // Centers child elements horizontally
  },

  // Weather Disabled Text
  weatherDisabledText: {
    fontSize: 16, // Font size for the message
    color: '#555', // Dark gray color for subtlety
    textAlign: 'center', // Centers the text
  },

  // Farm Information Container
  farmInfoContainer: {
    // Additional styles can be added here if needed
  },

  // Farm Title Text
  title: {
    fontSize: 24, // Font size for the title
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#FAF4E4', // Light color for contrast
    textAlign: 'center', // Centers the text
    marginTop: 10, // Space above the title
    textTransform: 'uppercase', // Transforms text to uppercase
  },

  // Farm Address Text
  address: {
    fontSize: 14, // Font size for the address
    color: '#666', // Dark gray color for readability
    textAlign: 'center', // Centers the text
    textTransform: 'uppercase', // Transforms text to uppercase
    marginVertical: 5, // Vertical margin for spacing
  },

  // Activity Box Highlighting Features
  activityBox: {
    backgroundColor: '#FAF4E4', // Light beige background
    padding: 10, // Padding inside the box
    borderRadius: 10, // Rounded corners
    alignSelf: 'center', // Centers the box horizontally
    marginVertical: 10, // Vertical margin for spacing
    width: '90%', // Width relative to the parent container
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset for iOS
    shadowOpacity: 0.1, // Shadow opacity for iOS
    shadowRadius: 2, // Shadow radius for iOS
    elevation: 2, // Elevation for Android shadow
  },

  // Activity Text Style
  activityText: {
    fontSize: 14, // Font size for the text
    color: '#000', // Black color for readability
    textAlign: 'center', // Centers the text
    textTransform: 'capitalize', // Capitalizes the first letter
  },

  // Image Placeholder Container with Animations
  imagePlaceholder: {
    width: '90%', // Width relative to the parent container
    height: 200, // Height of the image container
    backgroundColor: '#e0e0e0', // Light gray background as a placeholder
    borderRadius: 10, // Rounded corners
    alignSelf: 'center', // Centers the container horizontally
    marginVertical: 15, // Vertical margin for spacing
    justifyContent: 'center', // Centers child elements vertically
    alignItems: 'center', // Centers child elements horizontally
    position: 'relative', // Relative positioning for layering
    overflow: 'hidden', // Clips any child content outside the container
  },

  // Image Style
  image: {
    width: '100%', // Full width of the container
    height: '100%', // Full height of the container
    borderRadius: 10, // Rounded corners matching the container
  },

  // About Section Container with Animations
  aboutContainer: {
    backgroundColor: '#FAF4E4', // Light beige background
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    marginHorizontal: 15, // Horizontal margin
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset for iOS
    shadowOpacity: 0.1, // Shadow opacity for iOS
    shadowRadius: 2, // Shadow radius for iOS
    elevation: 2, // Elevation for Android shadow
    marginBottom: 15, // Space below the container
  },

  // About Text Style
  aboutText: {
    fontSize: 16, // Font size for the text
    color: '#000', // Black color for readability
    textAlign: 'justify', // Justifies the text for a neat appearance
  },

  // Current Location Box Container
  currentLocationBox: {
    backgroundColor: '#FAF4E4', // Light beige background
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    alignSelf: 'center', // Centers the container horizontally
    marginVertical: 10, // Vertical margin for spacing
    width: '90%', // Width relative to the parent container
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset for iOS
    shadowOpacity: 0.05, // Shadow opacity for iOS
    shadowRadius: 1, // Shadow radius for iOS
    elevation: 1, // Elevation for Android shadow
  },

  // Location Display Container
  locationContainer: {
    alignItems: 'center', // Centers child elements horizontally
  },

  // Location Text Style
  locationText: {
    fontSize: 18, // Font size for the location label
    fontWeight: 'bold', // Bold font weight for emphasis
    marginBottom: 10, // Space below the label
    color: '#333', // Dark gray color for readability
  },

  // Coordinates Text Style
  coordsText: {
    fontSize: 16, // Font size for the coordinates
    marginVertical: 2, // Vertical margin for spacing
    color: '#555', // Medium gray color for readability
  },

  // Location Disabled Message Container
  locationDisabledContainer: {
    alignItems: 'center', // Centers child elements horizontally
    padding: 10, // Padding inside the container
  },

  // Location Disabled Message Text
  locationDisabledText: {
    fontSize: 16, // Font size for the message
    color: '#555', // Medium gray color for readability
    textAlign: 'center', // Centers the text
  },

  // Map Container with Animations
  mapContainer: {
    backgroundColor: '#FAF4E4', // Light beige background
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners
    marginHorizontal: 15, // Horizontal margin
    marginTop: 10, // Space above the container
    shadowColor: '#000', // Shadow color for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset for iOS
    shadowOpacity: 0.1, // Shadow opacity for iOS
    shadowRadius: 2, // Shadow radius for iOS
    elevation: 2, // Elevation for Android shadow
  },

  // Map Header Text
  mapHeader: {
    fontSize: 18, // Font size for the header
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#000', // Black color for readability
    textAlign: 'center', // Centers the text
    marginBottom: 10, // Space below the header
  },

  // Map Wrapper Container
  mapWrapper: {
    width: '100%', // Full width of the container
    height: 200, // Height of the map
    borderRadius: 10, // Rounded corners
    overflow: 'hidden', // Clips any child content outside the container
  },

  // Map Style
  map: {
    flex: 1, // Takes up the full available space
  },

  // Overlay Container when Location Services are Disabled on the Map
  mapDisabledOverlay: {
    position: 'absolute', // Positioned absolutely over the map
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 244, 228, 0.8)', // Semi-transparent background
    alignItems: 'center', // Centers child elements horizontally
    justifyContent: 'center', // Centers child elements vertically
  },

  // Map Disabled Message Text
  mapDisabledText: {
    fontSize: 16, // Font size for the message
    color: '#555', // Medium gray color for readability
    textAlign: 'center', // Centers the text
    paddingHorizontal: 20, // Horizontal padding for the text
  },

  // Error Message Text Style
  errorText: {
    color: 'red', // Red color to indicate errors
    fontSize: 16, // Font size for the error message
    textAlign: 'center', // Centers the text
    marginVertical: 10, // Vertical margin for spacing
  },
});