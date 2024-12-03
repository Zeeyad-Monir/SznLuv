// ==================================================
// IMPORTS
// ==================================================

// Import core React library and hooks
import React, { useState, useEffect, useContext, useRef } from 'react';

// Import components and APIs from React Native
import {
  View,              // Container component
  Text,              // Text display component
  StyleSheet,        // Styling utility
  ActivityIndicator, // Loading spinner component
  ScrollView,        // Scrollable container
  TouchableOpacity,  // Pressable component
  Image,             // Image display component
  Switch,            // Toggle switch component
  FlatList,          // Efficient list component
  Alert,             // Alert dialog utility
  Animated,          // Animation library
  Easing,            // Predefined easing functions
} from 'react-native';

// Import location services from Expo
import * as Location from 'expo-location';

// Import Map components for displaying maps and directions
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

// Import custom components and context
import NavBar from '../components/NavBar';            // Custom navigation bar
import { SettingsContext } from './SettingsContext';  // Context for app settings

// ==================================================
// CONSTANTS AND API KEYS
// ==================================================

// Note: API keys have been removed for security reasons.
// Please replace 'YOUR_OPENWEATHERMAP_API_KEY' and 'YOUR_GOOGLE_MAPS_API_KEY' with your actual API keys.

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
  const [location, setLocation] = useState(null);       // User's current location
  const [errorMsg, setErrorMsg] = useState(null);       // Error message for location fetching
  const [loading, setLoading] = useState(true);         // Loading state for location data

  // State variables for weather data and errors
  const [weatherData, setWeatherData] = useState(null); // Weather data fetched from API
  const [weatherError, setWeatherError] = useState(null); // Error message for weather fetching

  // State for unit toggle (Metric or Imperial units)
  const [isMetric, setIsMetric] = useState(true);       // True for metric units, false for imperial

  // State for selected day in the weather forecast (used for displaying detailed info)
  const [selectedDayIndex, setSelectedDayIndex] = useState(null); // Index of the selected day

  // State for processed daily weather data
  const [dailyData, setDailyData] = useState([]);       // Array of daily weather data objects

  // ==================================================
  // FARM LOCATION COORDINATES
  // ==================================================

  // Latitude and longitude of Aldor Acres Family Farm
  const farmLatitude = 49.1706;    // Farm's latitude coordinate
  const farmLongitude = -122.6076; // Farm's longitude coordinate

  // ==================================================
  // ANIMATION REFERENCES
  // ==================================================

  // Create animated values for various UI components to control their opacity and position
  const weatherOpacity = useRef(new Animated.Value(0)).current;          // Opacity for weather container
  const weatherTranslateX = useRef(new Animated.Value(50)).current;      // Horizontal translation for weather container

  const farmInfoOpacity = useRef(new Animated.Value(0)).current;         // Opacity for farm info container
  const farmInfoTranslateX = useRef(new Animated.Value(-50)).current;    // Horizontal translation for farm info container

  const imageOpacity = useRef(new Animated.Value(0)).current;            // Opacity for farm image
  const imageScale = useRef(new Animated.Value(0.95)).current;           // Scale for farm image

  const mapOpacity = useRef(new Animated.Value(0)).current;              // Opacity for map container
  const mapTranslateX = useRef(new Animated.Value(50)).current;          // Horizontal translation for map container

  const descriptionOpacity = useRef(new Animated.Value(0)).current;      // Opacity for description text
  const descriptionTranslateY = useRef(new Animated.Value(30)).current;  // Vertical translation for description text

  // ==================================================
  // USE EFFECT HOOKS
  // ==================================================

  // --------------------------------------------
  // Effect Hook: Location Tracking
  // --------------------------------------------

  // Use useEffect to handle location tracking when the component mounts or when 'isLocationEnabled' changes
  useEffect(() => {
    let locationSubscription; // Variable to hold the location subscription

    // Asynchronous function to start location tracking
    const startLocationTracking = async () => {
      if (!isLocationEnabled) {
        // If location services are disabled, stop loading and exit the function
        setLoading(false);
        return;
      }

      try {
        // Request permission to access location in the foreground
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          // If permission is not granted, set an error message and stop loading
          setErrorMsg('Permission to access location was denied.');
          setLoading(false);
          return;
        }

        // Start watching the user's location with specified options
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, // High accuracy for location updates
            timeInterval: 1000,               // Update every 1000 milliseconds (1 second)
            distanceInterval: 1600,           // Update every 1600 meters (approx. 1 mile)
          },
          (newLocation) => {
            // Callback function when a new location is received
            setLocation(newLocation); // Update the location state with the new location
            setLoading(false);        // Set loading to false as location has been fetched
          }
        );
      } catch (error) {
        // If an error occurs, set an error message and stop loading
        setErrorMsg('Error fetching location.');
        setLoading(false);
      }
    };

    // Start location tracking
    startLocationTracking();

    // Cleanup function to remove the location subscription when the component unmounts or dependencies change
    return () => {
      if (locationSubscription) locationSubscription.remove(); // Remove the subscription to stop tracking
    };
  }, [isLocationEnabled]); // Dependency array; effect runs when 'isLocationEnabled' changes

  // --------------------------------------------
  // Effect Hook: Fetch Weather Data
  // --------------------------------------------

  // Use useEffect to fetch weather data when 'location' or 'isLocationEnabled' changes
  useEffect(() => {
    // Asynchronous function to fetch weather data
    const fetchWeatherData = async () => {
      if (!isLocationEnabled) {
        // If location services are disabled, set an error message and exit
        setWeatherError('Location services are disabled.');
        return;
      }

      if (location) {
        // If location is available, proceed to fetch weather data
        const { latitude, longitude } = location.coords; // Destructure latitude and longitude from location coordinates

        try {
          // Fetch weather data from OpenWeatherMap API using the latitude and longitude
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
          );

          const data = await response.json(); // Parse the JSON response

          if (response.ok) {
            // If the response is successful (status code 200-299)
            const dailyForecasts = processDailyData(data.list); // Process the data to get daily forecasts
            setWeatherData(data);        // Update weatherData state with the fetched data
            setDailyData(dailyForecasts); // Update dailyData state with the processed daily forecasts
          } else {
            // If the response is not successful, set an error message
            setWeatherError(data.message || 'Unable to fetch weather data.');
          }
        } catch (error) {
          // If an error occurs during fetching, set an error message
          setWeatherError(error.message || 'An error occurred while fetching weather data.');
        }
      }
    };

    // Function to process raw weather data into daily forecasts
    const processDailyData = (list) => {
      const days = {}; // Object to hold weather data grouped by day

      // Loop through each weather data item
      list.forEach((item) => {
        const date = new Date(item.dt * 1000);          // Convert timestamp to Date object
        const day = date.toISOString().split('T')[0];   // Get the date in 'YYYY-MM-DD' format

        if (!days[day]) {
          days[day] = []; // Initialize an array for the day if it doesn't exist
        }

        days[day].push(item); // Add the weather data item to the corresponding day
      });

      // Map the days object to an array of daily data
      const dailyData = Object.keys(days).map((day) => {
        const dayData = days[day]; // Get all weather data items for the day

        // Try to find the data closest to noon (12:00 PM)
        const noonData =
          dayData.find((item) => {
            const date = new Date(item.dt * 1000);
            return date.getHours() === 12; // Check if the hour is 12 PM
          }) || dayData[Math.floor(dayData.length / 2)]; // If not found, take the middle item

        return noonData; // Return the selected data for the day
      });

      return dailyData; // Return the array of daily data
    };

    // Call the function to fetch weather data
    fetchWeatherData();
  }, [location, isLocationEnabled]); // Dependency array; effect runs when 'location' or 'isLocationEnabled' changes

  // --------------------------------------------
  // Effect Hook: Animations
  // --------------------------------------------

  // Use useEffect to handle animations when loading is complete
  useEffect(() => {
    if (!loading) {
      // If loading is complete, start animations for various UI components

      // Animate the weather container (opacity and horizontal translation)
      Animated.parallel([
        Animated.timing(weatherOpacity, {
          toValue: 1,                         // Animate opacity to 1 (fully visible)
          duration: 700,                      // Duration of 700 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          useNativeDriver: true,              // Use native driver for better performance
        }),
        Animated.timing(weatherTranslateX, {
          toValue: 0,                         // Animate horizontal translation to 0 (original position)
          duration: 700,                      // Duration of 700 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          useNativeDriver: true,              // Use native driver
        }),
      ]).start(); // Start the animation

      // Animate the farm info container (opacity and horizontal translation)
      Animated.parallel([
        Animated.timing(farmInfoOpacity, {
          toValue: 1,                         // Animate opacity to 1
          duration: 500,                      // Duration of 500 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          useNativeDriver: true,              // Use native driver
        }),
        Animated.timing(farmInfoTranslateX, {
          toValue: 0,                         // Animate horizontal translation to 0
          duration: 500,                      // Duration of 500 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          useNativeDriver: true,              // Use native driver
        }),
      ]).start();

      // Animate the image (opacity and scale)
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,                         // Animate opacity to 1
          duration: 700,                      // Duration of 700 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          delay: 300,                         // Delay of 300 milliseconds before starting
          useNativeDriver: true,              // Use native driver
        }),
        Animated.spring(imageScale, {
          toValue: 1,                         // Animate scale to 1 (original size)
          friction: 8,                        // Friction for the spring animation
          tension: 40,                        // Tension for the spring animation
          delay: 300,                         // Delay of 300 milliseconds
          useNativeDriver: true,              // Use native driver
        }),
      ]).start();

      // Animate the map container (opacity and horizontal translation)
      Animated.parallel([
        Animated.timing(mapOpacity, {
          toValue: 1,                         // Animate opacity to 1
          duration: 700,                      // Duration of 700 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          delay: 600,                         // Delay of 600 milliseconds
          useNativeDriver: true,              // Use native driver
        }),
        Animated.timing(mapTranslateX, {
          toValue: 0,                         // Animate horizontal translation to 0
          duration: 700,                      // Duration of 700 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          delay: 600,                         // Delay of 600 milliseconds
          useNativeDriver: true,              // Use native driver
        }),
      ]).start();

      // Animate the description text (opacity and vertical translation)
      Animated.parallel([
        Animated.timing(descriptionOpacity, {
          toValue: 1,                         // Animate opacity to 1
          duration: 400,                      // Duration of 400 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          delay: 400,                         // Delay of 400 milliseconds
          useNativeDriver: true,              // Use native driver
        }),
        Animated.timing(descriptionTranslateY, {
          toValue: 0,                         // Animate vertical translation to 0
          duration: 400,                      // Duration of 400 milliseconds
          easing: Easing.out(Easing.ease),    // Easing function
          delay: 400,                         // Delay of 400 milliseconds
          useNativeDriver: true,              // Use native driver
        }),
      ]).start();
    }
  }, [
    loading,                      // Dependency on loading state
    weatherOpacity,               // Dependencies on animated values
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

  // ==================================================
  // HELPER FUNCTIONS
  // ==================================================

  // --------------------------------------------
  // Function: convertTemp
  // --------------------------------------------

  // Converts temperature from metric to imperial units if needed
  const convertTemp = (temp) => {
    return isMetric
      ? temp.toFixed(1)                      // If metric, return the temperature as-is with one decimal place
      : ((temp * 9) / 5 + 32).toFixed(1);    // If imperial, convert to Fahrenheit and format
  };

  // --------------------------------------------
  // Function: getUnit
  // --------------------------------------------

  // Returns the unit symbol based on the selected measurement system
  const getUnit = () => {
    return isMetric ? '°C' : '°F';           // Return '°C' for metric or '°F' for imperial
  };

  // ==================================================
  // RENDER LOGIC
  // ==================================================

  // Variable to hold the content to be displayed based on the state
  let content;

  if (loading) {
    // If data is still loading, display a loading spinner
    content = <ActivityIndicator size="large" color="#0000ff" />;
  } else if (errorMsg) {
    // If there is an error message, display it
    content = <Text style={styles.errorText}>{errorMsg}</Text>;
  } else if (location) {
    // If location data is available, display the user's current location
    const { latitude, longitude } = location.coords; // Destructure latitude and longitude from location coordinates

    content = (
      <View style={styles.locationContainer}>
        <Text style={styles.locationText}>Your Current Location:</Text>
        <Text style={styles.coordsText}>Latitude: {latitude.toFixed(6)}</Text>
        <Text style={styles.coordsText}>Longitude: {longitude.toFixed(6)}</Text>
      </View>
    );
  } else if (!isLocationEnabled) {
    // If location services are disabled, display a message
    content = (
      <View style={styles.locationDisabledContainer}>
        <Text style={styles.locationDisabledText}>
          Location services are disabled. Enable them in settings to see your current location and directions.
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
                opacity: weatherOpacity,                          // Bind opacity to animated value
                transform: [{ translateX: weatherTranslateX }],   // Bind horizontal translation to animated value
              },
            ]}
          >
            {/* Unit Toggle Switch */}
            <View style={styles.unitToggle}>
              <Text style={styles.unitText}>°C</Text>
              <Switch
                value={!isMetric}                         // Switch is on when units are imperial
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
                data={dailyData.slice(0, 5)}            // Display the first 5 days of data
                horizontal                             // Render items horizontally
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
              opacity: farmInfoOpacity,                         // Bind opacity to animated value
              transform: [{ translateX: farmInfoTranslateX }],  // Bind horizontal translation to animated value
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
              opacity: imageOpacity,                      // Bind opacity to animated value
              transform: [{ scale: imageScale }],         // Bind scale to animated value
            },
          ]}
        >
          <Image
            source={require('../assets/FamilyFarm.jpg')} // Image source (local asset)
            style={styles.image}
            resizeMode="cover"                           // Resize mode to cover the container
          />
        </Animated.View>

        {/* About the Farm */}
        <Animated.View
          style={[
            styles.aboutContainer,
            {
              opacity: descriptionOpacity,               // Bind opacity to animated value
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
              opacity: mapOpacity,                        // Bind opacity to animated value
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
                latitude: farmLatitude,                  // Initial latitude
                longitude: farmLongitude,                // Initial longitude
                latitudeDelta: 0.25,                     // Latitude zoom level
                longitudeDelta: 0.25,                    // Longitude zoom level
              }}
              showsUserLocation={isLocationEnabled}      // Show user location if enabled
            >
              {/* Marker for the Farm Location */}
              <Marker
                coordinate={{ latitude: farmLatitude, longitude: farmLongitude }}
                title="Aldor Acres Family Farm"          // Marker title
                description="Farm location"              // Marker description
              />

              {/* Directions from User Location to Farm */}
              {isLocationEnabled && location && (
                <MapViewDirections
                  origin={{
                    latitude: location.coords.latitude,   // User's latitude
                    longitude: location.coords.longitude, // User's longitude
                  }}
                  destination={{ latitude: farmLatitude, longitude: farmLongitude }} // Destination coordinates
                  apikey={GOOGLE_MAPS_APIKEY}            // Google Maps API key
                  strokeWidth={4}                        // Width of the direction line
                  strokeColor="hotpink"                  // Color of the direction line
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
    flex: 1,                             // Take up the full height of the screen
    backgroundColor: '#F4A460',          // Background color of the screen
  },
  // Scrollable content style
  scrollContent: {
    paddingBottom: 20,                   // Padding at the bottom of the content
  },
  // Weather container style
  weatherContainer: {
    backgroundColor: '#BBCDEC',          // Background color of the weather container
    borderRadius: 10,                    // Rounded corners
    margin: 15,                          // Margin around the container
    padding: 10,                         // Padding inside the container
  },
  // Unit toggle switch container style
  unitToggle: {
    flexDirection: 'row',                // Arrange items horizontally
    alignItems: 'center',                // Align items vertically centered
    justifyContent: 'center',            // Center items horizontally
    marginBottom: 5,                     // Margin below the unit toggle
  },
  // Unit text style
  unitText: {
    fontSize: 16,                        // Font size for the unit text
    color: '#000',                       // Text color
    marginHorizontal: 5,                 // Horizontal margin between texts and switch
  },
  // Location name container style
  locationNameContainer: {
    alignItems: 'center',                // Center align the content
    marginBottom: 5,                     // Margin below the location name
  },
  // Location name text style
  locationName: {
    fontSize: 16,                        // Font size of the location name
    color: '#000',                       // Text color
    fontWeight: 'bold',                  // Bold text
  },
  // Daily forecast container style
  dailyContainer: {
    marginBottom: 10,                    // Margin below the daily container
  },
  // Individual daily item style
  dailyItem: {
    width: 80,                           // Fixed width for each item
    marginRight: 10,                     // Margin to the right of each item
  },
  // Daily header style
  dailyHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent background
    borderRadius: 5,                     // Rounded corners
    padding: 5,                          // Padding inside the header
    alignItems: 'center',                // Center align content
  },
  // Daily day text style
  dailyDay: {
    color: '#000',                       // Text color
    fontSize: 14,                        // Font size
  },
  // Daily weather icon style
  dailyIcon: {
    width: 30,                           // Width of the icon
    height: 30,                          // Height of the icon
    marginVertical: 2,                   // Vertical margin around the icon
  },
  // Daily temperature text style
  dailyTemp: {
    color: '#000',                       // Text color
    fontSize: 14,                        // Font size
  },
  // Detail container style for expanded view
  detailContainer: {
    alignItems: 'center',                // Center align content
  },
  // Detail text style
  detailText: {
    color: '#000',                       // Text color
    fontSize: 12,                        // Font size
    textAlign: 'center',                 // Center align text
  },
  // Weather disabled container style
  weatherDisabledContainer: {
    backgroundColor: '#FAF4E4',          // Background color
    padding: 15,                         // Padding inside the container
    borderRadius: 10,                    // Rounded corners
    marginHorizontal: 15,                // Horizontal margin
    alignItems: 'center',                // Center align content
  },
  // Weather disabled text style
  weatherDisabledText: {
    fontSize: 16,                        // Font size
    color: '#555',                       // Text color
    textAlign: 'center',                 // Center align text
  },
  // Farm information container style
  farmInfoContainer: {
    // Empty because styles are added dynamically through animation
  },
  // Title text style
  title: {
    fontSize: 24,                        // Font size
    fontWeight: 'bold',                  // Bold text
    color: '#FAF4E4',                    // Text color
    textAlign: 'center',                 // Center align text
    marginTop: 10,                       // Margin above the title
    textTransform: 'uppercase',          // Uppercase text
  },
  // Address text style
  address: {
    fontSize: 14,                        // Font size
    color: '#666',                       // Text color
    textAlign: 'center',                 // Center align text
    textTransform: 'uppercase',          // Uppercase text
    marginVertical: 5,                   // Vertical margin
  },
  // Activity box style
  activityBox: {
    backgroundColor: '#FAF4E4',          // Background color
    padding: 10,                         // Padding inside the box
    borderRadius: 10,                    // Rounded corners
    alignSelf: 'center',                 // Center the box horizontally
    marginVertical: 10,                  // Vertical margin
    width: '90%',                        // Width relative to the parent
    shadowColor: '#000',                 // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1,                  // Shadow opacity
    shadowRadius: 2,                     // Shadow radius
    elevation: 2,                        // Elevation for Android shadow
  },
  // Activity text style
  activityText: {
    fontSize: 14,                        // Font size
    color: '#000',                       // Text color
    textAlign: 'center',                 // Center align text
    textTransform: 'capitalize',         // Capitalize words
  },
  // Image placeholder style
  imagePlaceholder: {
    width: '90%',                        // Width relative to the parent
    height: 200,                         // Fixed height
    backgroundColor: '#e0e0e0',          // Background color
    borderRadius: 10,                    // Rounded corners
    alignSelf: 'center',                 // Center horizontally
    marginVertical: 15,                  // Vertical margin
    justifyContent: 'center',            // Center content vertically
    alignItems: 'center',                // Center content horizontally
    position: 'relative',                // Relative positioning
    overflow: 'hidden',                  // Hide overflow
  },
  // Image style
  image: {
    width: '100%',                       // Full width
    height: '100%',                      // Full height
    borderRadius: 10,                    // Rounded corners
  },
  // About container style
  aboutContainer: {
    backgroundColor: '#FAF4E4',          // Background color
    padding: 15,                         // Padding inside the container
    borderRadius: 10,                    // Rounded corners
    marginHorizontal: 15,                // Horizontal margin
    shadowColor: '#000',                 // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1,                  // Shadow opacity
    shadowRadius: 2,                     // Shadow radius
    elevation: 2,                        // Elevation for Android shadow
    marginBottom: 15,                    // Margin below the container
  },
  // About text style
  aboutText: {
    fontSize: 16,                        // Font size
    color: '#000',                       // Text color
    textAlign: 'justify',                // Justify text
  },
  // Current location box style
  currentLocationBox: {
    backgroundColor: '#FAF4E4',          // Background color
    padding: 15,                         // Padding inside the box
    borderRadius: 10,                    // Rounded corners
    alignSelf: 'center',                 // Center horizontally
    marginVertical: 10,                  // Vertical margin
    width: '90%',                        // Width relative to the parent
    shadowColor: '#000',                 // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.05,                 // Shadow opacity
    shadowRadius: 1,                     // Shadow radius
    elevation: 1,                        // Elevation for Android shadow
  },
  // Location container style
  locationContainer: {
    alignItems: 'center',                // Center align content
  },
  // Location text style
  locationText: {
    fontSize: 18,                        // Font size
    fontWeight: 'bold',                  // Bold text
    marginBottom: 10,                    // Margin below the text
    color: '#333',                       // Text color
  },
  // Coordinates text style
  coordsText: {
    fontSize: 16,                        // Font size
    marginVertical: 2,                   // Vertical margin
    color: '#555',                       // Text color
  },
  // Location disabled container style
  locationDisabledContainer: {
    alignItems: 'center',                // Center align content
    padding: 10,                         // Padding inside the container
  },
  // Location disabled text style
  locationDisabledText: {
    fontSize: 16,                        // Font size
    color: '#555',                       // Text color
    textAlign: 'center',                 // Center align text
  },
  // Map container style
  mapContainer: {
    backgroundColor: '#FAF4E4',          // Background color
    padding: 15,                         // Padding inside the container
    borderRadius: 10,                    // Rounded corners
    marginHorizontal: 15,                // Horizontal margin
    marginTop: 10,                       // Margin above the container
    shadowColor: '#000',                 // Shadow color
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1,                  // Shadow opacity
    shadowRadius: 2,                     // Shadow radius
    elevation: 2,                        // Elevation for Android shadow
  },
  // Map header text style
  mapHeader: {
    fontSize: 18,                        // Font size
    fontWeight: 'bold',                  // Bold text
    color: '#000',                       // Text color
    textAlign: 'center',                 // Center align text
    marginBottom: 10,                    // Margin below the header
  },
  // Map wrapper style
  mapWrapper: {
    width: '100%',                       // Full width
    height: 200,                         // Fixed height
    borderRadius: 10,                    // Rounded corners
    overflow: 'hidden',                  // Hide overflow
  },
  // Map style
  map: {
    flex: 1,                             // Take up all available space
  },
  // Map disabled overlay style
  mapDisabledOverlay: {
    position: 'absolute',                // Absolute positioning
    top: 0,                              // Position at the top
    left: 0,                             // Position at the left
    right: 0,                            // Position at the right
    bottom: 0,                           // Position at the bottom
    backgroundColor: 'rgba(250, 244, 228, 0.8)', // Semi-transparent background
    alignItems: 'center',                // Center align content
    justifyContent: 'center',            // Center align content vertically
  },
  // Map disabled text style
  mapDisabledText: {
    fontSize: 16,                        // Font size
    color: '#555',                       // Text color
    textAlign: 'center',                 // Center align text
    paddingHorizontal: 20,               // Horizontal padding
  },
  // Error text style
  errorText: {
    color: 'red',                        // Text color
    fontSize: 16,                        // Font size
    textAlign: 'center',                 // Center align text
    marginVertical: 10,                  // Vertical margin
  },
});