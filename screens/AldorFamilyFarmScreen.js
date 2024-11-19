//AldorFamilyFarmScreen.js
//Used chatgpt.com to add detaileed comments, so me and my teammate understand what we each did and remember for the future


// Import React and necessary hooks for managing state and side effects
import React, { useState, useEffect } from 'react';

// Import components from React Native for building the UI
import {
  View, // Container component for layout
  Text, // Component for displaying text
  StyleSheet, // For creating styles
  ActivityIndicator, // For showing a loading spinner
  ScrollView, // For creating scrollable content
  TouchableOpacity, // For touchable elements like buttons
} from 'react-native';

// Import Expo's Location module to access the device's location
import * as Location from 'expo-location'; // LOCATION

// Import icon components from Expo's vector icons library
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';

// Import MapView components for displaying maps and markers
import MapView, { Marker } from 'react-native-maps';

// Import MapViewDirections for displaying route directions on the map
import MapViewDirections from 'react-native-maps-directions'; // MAPS

// Import Constants from Expo (not used directly in this code)
import Constants from 'expo-constants';

// API key for OpenWeatherMap to fetch weather data
const WEATHER_API_KEY = '92be9d8cdbac2f4865e8666ae541f316'; // Weather API Key
console.log('Weather API Key:', WEATHER_API_KEY);

// Google Maps API key for accessing directions and geolocation services
const GOOGLE_MAPS_APIKEY = 'AIzaSyAs3qjk2W3iapdfiw7HIg9CVHlfa8H8NYA'; // GOOGLE

// Main functional component representing the screen for Aldor Acres Family Farm
const AldorFamilyFarmScreen = () => {
  // ------------------ LOCATION STATE VARIABLES ------------------

  // State to hold the user's current location data
  const [location, setLocation] = useState(null);

  // State to hold any error messages related to location fetching
  const [errorMsg, setErrorMsg] = useState(null);

  // State to manage the loading indicator while fetching location
  const [loading, setLoading] = useState(true);

  // ------------------ WEATHER STATE VARIABLES ------------------

  // State to hold the weather data fetched from the API
  const [weatherData, setWeatherData] = useState(null);

  // State to hold any errors that occur during weather data fetching
  const [weatherError, setWeatherError] = useState(null);

  // ------------------ FARM COORDINATES ------------------

  // Latitude and longitude for Aldor Acres Family Farm
  const farmLatitude = 49.1706;
  const farmLongitude = -122.6076;

  // ------------------ LOCATION EFFECT HOOK ------------------

  // useEffect hook to handle side effects related to location tracking
  useEffect(() => {
    let locationSubscription; // Variable to hold the subscription to location updates

    // Function to initiate location tracking
    const startLocationTracking = async () => {
      // ------------------ REQUEST PERMISSION ------------------

      // Request permission to access the device's location in the foreground
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // If permission is denied, update the error message and stop loading
        setErrorMsg('Permission to access location was denied.');
        setLoading(false);
        return;
      }

      // ------------------ START WATCHING LOCATION ------------------

      try {
        // Start watching the user's position with specified accuracy and intervals
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, // High accuracy for precise location data
            timeInterval: 1000, // Minimum time interval between location updates (in milliseconds)
            distanceInterval: 1600, // Minimum distance (in meters) to travel before receiving updates
          },
          (newLocation) => {
            // Callback function executed when new location data is available

            // Update the location state with the new location data
            setLocation(newLocation);

            // Stop the loading indicator once location is received
            setLoading(false);
          }
        );
      } catch (error) {
        // Handle any errors that occur while fetching the location
        setErrorMsg('Error fetching location.');
        setLoading(false);
      }
    };

    // Start location tracking when the component mounts
    startLocationTracking();

    // Clean up the location subscription when the component unmounts to prevent memory leaks
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // ------------------ WEATHER DATA EFFECT HOOK ------------------

  // useEffect hook to fetch weather data whenever the location changes
  useEffect(() => {
    // Function to fetch weather data from OpenWeatherMap API
    const fetchWeatherData = async () => {
      if (location) {
        const { latitude, longitude } = location.coords;

        try {
          // Fetch the 5-day weather forecast data in 3-hour intervals
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
          );
          const data = await response.json();

          if (response.ok) {
            // If the response is successful, update the weatherData state
            setWeatherData(data);
          } else {
            // If the response has an error, update the weatherError state
            setWeatherError(data.message || 'Unable to fetch weather data.');
          }
        } catch (error) {
          // Handle any network or other errors during the fetch
          setWeatherError(error.message || 'An error occurred while fetching weather data.');
        }
      }
    };

    // Invoke the function to fetch weather data when location is available
    fetchWeatherData();
  }, [location]); // Dependency on location ensures this runs whenever location changes

  // ------------------ CONDITIONAL CONTENT RENDERING ------------------

  let content; // Variable to determine what content to display based on state

  if (loading) {
    // Display a loading indicator while fetching location
    content = <ActivityIndicator size="large" color="#0000ff" />;
  } else if (errorMsg) {
    // Display an error message if there's an issue fetching location
    content = <Text style={styles.errorText}>{errorMsg}</Text>;
  } else if (location) {
    // Display the user's current latitude and longitude
    const { latitude, longitude } = location.coords;
    content = (
      <View style={styles.locationContainer}>
        <Text style={styles.locationText}>Your Current Location:</Text>
        <Text style={styles.coordsText}>Latitude: {latitude.toFixed(6)}</Text>
        <Text style={styles.coordsText}>Longitude: {longitude.toFixed(6)}</Text>
      </View>
    );
  }

  // ------------------ MAIN COMPONENT RENDERING ------------------

  return (
    <View style={styles.container}>
      {/* ------------------ HEADER SECTION ------------------ */}
      <View style={styles.header}>
        {/* Logo Text */}
        <Text style={styles.logoText}>SznLuv</Text>
        <View style={styles.iconContainer}>
          {/* Sun Icon Button */}
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="sun" size={24} color="#fff" />
          </TouchableOpacity>
          {/* Favorite Icon Button */}
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="favorite-border" size={24} color="#fff" />
          </TouchableOpacity>
          {/* Person Icon Button */}
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ------------------ MAIN SCROLLABLE CONTENT ------------------ */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ------------------ WEATHER REPORT SECTION ------------------ */}
        <View style={styles.weatherContainer}>
          {/* Header for Weather Section */}
          <Text style={styles.weatherHeader}>7 DAY WEATHER REPORT</Text>
          {weatherData ? (
            <ScrollView horizontal>
              {/* Display the first 7 forecasts from the data */}
              {weatherData.list.slice(0, 7).map((forecast, index) => (
                <View key={index} style={styles.weatherPlaceholderBox}>
                  {/* Day of the week */}
                  <Text style={styles.weatherDay}>
                    {new Date(forecast.dt * 1000).toLocaleDateString('en-US', {
                      weekday: 'short',
                    })}
                  </Text>
                  {/* Temperature */}
                  <Text style={styles.weatherTemp}>{forecast.main.temp.toFixed(1)}°C</Text>
                </View>
              ))}
            </ScrollView>
          ) : weatherError ? (
            // Display an error message if there's an issue fetching weather data
            <Text style={styles.errorText}>{weatherError}</Text>
          ) : (
            // Display a loading indicator while fetching weather data
            <ActivityIndicator size="large" color="#0000ff" />
          )}
        </View>

        {/* ------------------ FARM INFORMATION SECTION ------------------ */}
        <Text style={styles.title}>Aldor Acres Family Farm</Text>
        <Text style={styles.address}>24990 84 Ave, Langley, BC</Text>
        <View style={styles.activityBox}>
          {/* Highlighting activities available at the farm */}
          <Text style={styles.activityText}>Petting zoo, pumpkins, and more!</Text>
        </View>

        {/* ------------------ IMAGE PLACEHOLDER SECTION ------------------ */}
        <View style={styles.imagePlaceholder}>
          {/* 
            Icon indicating where an image would go.
            You can replace this with an actual Image component when you have images.
          */}
          <Ionicons name="image" size={50} color="#ccc" />
          <Text style={styles.placeholderText}>Image Placeholder</Text>
        </View>

        {/* ------------------ ABOUT THE FARM SECTION ------------------ */}
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>
            Aldor Acres Family Farm offers an authentic farm experience with a petting zoo, pumpkin
            patch, and more! Enjoy a day filled with family-friendly activities in the heart of
            Langley.
          </Text>
        </View>

        {/* ------------------ USER'S CURRENT LOCATION SECTION ------------------ */}
        <View style={styles.currentLocationBox}>{content}</View>

        {/* ------------------ MAP SECTION ------------------ */}
        <View style={styles.mapContainer}>
          {/* Header for Map Section */}
          <Text style={styles.mapHeader}>How to get there?</Text>
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: farmLatitude,
                longitude: farmLongitude,
                latitudeDelta: 0.25, // Zoom level (smaller value zooms in)
                longitudeDelta: 0.25,
              }}
              showsUserLocation={true} // Enables the display of the user's current location on the map
            >
              {/* Marker indicating the location of Aldor Acres Family Farm */}
              <Marker
                coordinate={{ latitude: farmLatitude, longitude: farmLongitude }}
                title="Aldor Acres Family Farm"
                description="Farm location"
              />
              {location && (
                // If the user's location is available, display directions from their current location to the farm
                <MapViewDirections
                  origin={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  destination={{ latitude: farmLatitude, longitude: farmLongitude }}
                  apikey={GOOGLE_MAPS_APIKEY} // GOOGLE
                  strokeWidth={4}
                  strokeColor="hotpink"
                />
              )}
            </MapView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Export the component so it can be used in other parts of the app
export default AldorFamilyFarmScreen;

// ------------------ STYLESHEET FOR THE COMPONENT ------------------

const styles = StyleSheet.create({
  // Container for the entire screen
  container: {
    flex: 1,
    backgroundColor: '#FF8657', // Bright orange background to make the app lively
  },

  /* ------------------ HEADER STYLES ------------------ */

  header: {
    flexDirection: 'row', // Arrange items horizontally
    alignItems: 'center', // Vertically center the items
    backgroundColor: '#333', // Dark background for contrast
    paddingVertical: 15, // Vertical padding for the header
    paddingHorizontal: 10, // Horizontal padding for the header
  },
  logoText: {
    flex: 1, // Take up remaining space
    color: '#ff8c00', // Orange color to match the theme
    fontSize: 24, // Larger font size for visibility
    fontWeight: 'bold', // Bold text for prominence
  },
  iconContainer: {
    flexDirection: 'row', // Arrange icons horizontally
  },
  iconButton: {
    marginLeft: 15, // Space between each icon
  },

  /* ------------------ SCROLLABLE CONTENT STYLES ------------------ */

  scrollContent: {
    paddingBottom: 20, // Space at the bottom to ensure content isn't cut off
  },

  /* ------------------ WEATHER REPORT STYLES ------------------ */

  weatherContainer: {
    backgroundColor: '#B9CCEC', // Light blue background representing the sky
    padding: 15, // Padding inside the container
    alignItems: 'center', // Center items horizontally
    borderRadius: 10, // Rounded corners for a smooth look
    margin: 15, // Margin around the container to separate it from other sections
  },
  weatherHeader: {
    color: '#fff', // White text for readability against the blue background
    fontWeight: 'bold', // Bold text to emphasize the header
    fontSize: 16, // Font size for the header
    marginBottom: 10, // Space below the header
    textShadowColor: '#000', // Black shadow to make the text pop
    textShadowOffset: { width: 0.5, height: 0.5 }, // Slight offset for the shadow
    textShadowRadius: 1, // Blur radius for the shadow
  },
  weatherPlaceholderBox: {
    width: 80, // Width of each weather box
    height: 100, // Height of each weather box
    backgroundColor: '#6ca0dc', // Blue color to represent weather icons
    borderRadius: 5, // Slightly rounded corners
    marginHorizontal: 5, // Small horizontal margin between boxes
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  weatherDay: {
    color: '#fff', // White text color
    fontSize: 14,
    textAlign: 'center',
  },
  weatherTemp: {
    color: '#fff', // White text color
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },

  /* ------------------ FARM INFORMATION STYLES ------------------ */

  title: {
    fontSize: 24, // Large font size for the farm name
    fontWeight: 'bold', // Bold text for emphasis
    color: '#FAF4E4', // Light color for contrast against the background
    textAlign: 'center',
    marginTop: 10,
    textTransform: 'uppercase', // Uppercase letters for a formal look
  },
  address: {
    fontSize: 14,
    color: '#666', // Grey color for less emphasis
    textAlign: 'center',
    textTransform: 'uppercase',
    marginVertical: 5,
  },
  activityBox: {
    backgroundColor: '#FAF4E4', // Light background to highlight activities
    padding: 10,
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 10,
    width: '90%',
    shadowColor: '#000', // Shadow color for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#000', // Black text color for readability
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  /* ------------------ IMAGE PLACEHOLDER STYLES ------------------ */

  imagePlaceholder: {
    width: '90%',
    height: 200,
    backgroundColor: '#e0e0e0', // Light grey background to indicate a placeholder
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderText: {
    position: 'absolute',
    color: '#666', // Grey text color
    fontSize: 16,
  },

  /* ------------------ ABOUT THE FARM STYLES ------------------ */

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
  },
  aboutText: {
    fontSize: 16,
    color: '#000', // Black text color for readability
    textAlign: 'justify', // Justify the text for neat alignment
  },

  /* ------------------ USER'S CURRENT LOCATION STYLES ------------------ */

  currentLocationBox: {
    backgroundColor: '#FAF4E4',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 10,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  locationContainer: {
    alignItems: 'center', // Center items horizontally
  },
  locationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333', // Dark grey text color
  },
  coordsText: {
    fontSize: 16,
    marginVertical: 2,
    color: '#555', // Medium grey text color
  },

  /* ------------------ MAP STYLES ------------------ */

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
    color: '#000', // Black text color for readability
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

  /* ------------------ ERROR TEXT STYLES ------------------ */

  errorText: {
    color: 'red', // Red color to indicate an error
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
});
