// AldorFamilyFarmScreen.js
// Detailed comments added for better understanding and future reference

// Import React and necessary hooks for managing state, side effects, and context
import React, { useState, useEffect, useContext } from 'react';

// Import components from React Native for building the UI
import {
  View, // Container component for layout
  Text, // Component for displaying text
  StyleSheet, // For creating styles
  ActivityIndicator, // For showing a loading spinner
  ScrollView, // For creating scrollable content
  TouchableOpacity, // For touchable elements like buttons
  Image, // For displaying images
  Switch, // Toggle switch for temperature units
  FlatList, // For rendering lists
  Alert, // For displaying alert messages
} from 'react-native';

// Import Expo's Location module to access the device's location
import * as Location from 'expo-location'; // LOCATION

// Import MapView components for displaying maps and markers
import MapView, { Marker } from 'react-native-maps';

// Import MapViewDirections for displaying route directions on the map
import MapViewDirections from 'react-native-maps-directions'; // MAPS

// Import the external NavBar component
import NavBar from '../components/NavBar'; // Adjust the path based on your project structure

// Import SettingsContext to access location services settings
import { SettingsContext } from './SettingsContext'; // Adjust the path based on your project structure

// API key for OpenWeatherMap to fetch weather data
const WEATHER_API_KEY = '92be9d8cdbac2f4865e8666ae541f316'; // Weather API Key

// Google Maps API key for accessing directions and geolocation services
const GOOGLE_MAPS_APIKEY = 'AIzaSyAs3qjk2W3iapdfiw7HIg9CVHlfa8H8NYA'; // GOOGLE


// Main functional component representing the screen for Aldor Acres Family Farm
const AldorFamilyFarmScreen = () => {
  // ------------------ CONTEXT ACCESS ------------------

  // Access isLocationEnabled from SettingsContext to determine if location services are enabled
  const { isLocationEnabled } = useContext(SettingsContext);

  // ------------------ STATE VARIABLES ------------------

  // State to hold the user's current location data
  const [location, setLocation] = useState(null);

  // State to hold any error messages related to location fetching
  const [errorMsg, setErrorMsg] = useState(null);

  // State to manage the loading indicator while fetching location
  const [loading, setLoading] = useState(true);

  // State to hold the weather data fetched from the API
  const [weatherData, setWeatherData] = useState(null);

  // State to hold any errors that occur during weather data fetching
  const [weatherError, setWeatherError] = useState(null);

  // State for temperature unit toggle (true for Celsius, false for Fahrenheit)
  const [isMetric, setIsMetric] = useState(true);

  // State to manage which day's details are shown
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  // State to hold daily forecast data
  const [dailyData, setDailyData] = useState([]);

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
      // Check if location services are enabled
      if (!isLocationEnabled) {
        // If location services are disabled, skip requesting permissions and fetching location
        setLoading(false); // Stop loading indicator
        return;
      }

      // ------------------ REQUEST PERMISSION ------------------

      try {
        // Request permission to access the device's location in the foreground
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          // If permission is denied, update the error message and stop loading
          setErrorMsg('Permission to access location was denied.');
          setLoading(false);
          return;
        }

        // ------------------ START WATCHING LOCATION ------------------

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

    // Start location tracking when the component mounts or when isLocationEnabled changes
    startLocationTracking();

    // Clean up the location subscription when the component unmounts to prevent memory leaks
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isLocationEnabled]); // Dependency on isLocationEnabled ensures this runs whenever the setting changes

  // ------------------ WEATHER DATA EFFECT HOOK ------------------

  // useEffect hook to fetch weather data whenever the location or location settings change
  useEffect(() => {
    // Function to fetch weather data from OpenWeatherMap API
    const fetchWeatherData = async () => {
      // Check if location services are enabled and location data is available
      if (!isLocationEnabled) {
        // If location services are disabled, skip fetching weather data
        setWeatherError('Location services are disabled.');
        return;
      }

      if (location) {
        const { latitude, longitude } = location.coords;

        try {
          // Fetch the 5-day forecast data in 3-hour intervals
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
          );

          const data = await response.json();

          if (response.ok) {
            // Process data to get daily forecasts
            const dailyForecasts = processDailyData(data.list);
            setWeatherData(data);
            setDailyData(dailyForecasts);
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

    // Function to process 3-hour interval data into daily data
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

      // Get daily data by selecting data points at 12:00 PM
      const dailyData = Object.keys(days).map((day) => {
        const dayData = days[day];
        const noonData =
          dayData.find((item) => {
            const date = new Date(item.dt * 1000);
            return date.getHours() === 12;
          }) || dayData[Math.floor(dayData.length / 2)]; // Fallback if 12:00 PM data is not available

        return noonData;
      });

      return dailyData;
    };

    // Invoke the function to fetch weather data when location or settings change
    fetchWeatherData();
  }, [location, isLocationEnabled]); // Dependencies on location and isLocationEnabled

  // ------------------ HELPER FUNCTIONS ------------------

  // Function to convert temperature based on unit toggle
  const convertTemp = (temp) => {
    return isMetric ? temp.toFixed(1) : ((temp * 9) / 5 + 32).toFixed(1);
  };

  // Function to get temperature unit symbol
  const getUnit = () => {
    return isMetric ? '°C' : '°F';
  };

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
  } else if (!isLocationEnabled) {
    // Display a message if location services are disabled
    content = (
      <View style={styles.locationDisabledContainer}>
        <Text style={styles.locationDisabledText}>
          Location services are disabled. Enable them in settings to see your current location and directions.
        </Text>
      </View>
    );
  }

  // ------------------ MAIN COMPONENT RENDERING ------------------

  return (
    <View style={styles.container}>
      {/* ------------------ NAVIGATION BAR ------------------ */}
      <NavBar />

      {/* ------------------ MAIN SCROLLABLE CONTENT ------------------ */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ------------------ WEATHER REPORT SECTION ------------------ */}
        {isLocationEnabled && weatherData ? (
          <View style={styles.weatherContainer}>
            {/* ------------------ TEMPERATURE UNIT TOGGLE ------------------ */}
            <View style={styles.unitToggle}>
              <Text style={styles.unitText}>°C</Text>
              <Switch
                value={!isMetric}
                onValueChange={() => setIsMetric((prev) => !prev)}
              />
              <Text style={styles.unitText}>°F</Text>
            </View>

            {/* ------------------ LOCATION NAME ------------------ */}
            <View style={styles.locationNameContainer}>
              <Text style={styles.locationName}>
                {weatherData.city.name}, {weatherData.city.country}
              </Text>
            </View>

            {/* ------------------ 5-DAY FORECAST (Horizontal Scroll) ------------------ */}
            <View style={styles.dailyContainer}>
              <FlatList
                data={dailyData.slice(0, 5)} // Display only the first 5 days
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
                          // Show details when selected
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
                          // Show temperature when not selected
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
          </View>
        ) : !isLocationEnabled ? (
          // Inform the user that weather data is unavailable due to disabled location services
          <View style={styles.weatherDisabledContainer}>
            <Text style={styles.weatherDisabledText}>
              Weather information is unavailable because location services are disabled.
            </Text>
          </View>
        ) : weatherError ? (
          // Display an error message if there's an issue fetching weather data
          <Text style={styles.errorText}>{weatherError}</Text>
        ) : (
          // Display a loading indicator while fetching weather data
          <ActivityIndicator size="large" color="#0000ff" />
        )}

        {/* ------------------ FARM INFORMATION SECTION ------------------ */}
        <Text style={styles.title}>Aldor Acres Family Farm</Text>
        <Text style={styles.address}>24990 84 Ave, Langley, BC</Text>
        <View style={styles.activityBox}>
          {/* Highlighting activities available at the farm */}
          <Text style={styles.activityText}>Petting zoo, pumpkins, and more!</Text>
        </View>

        {/* ------------------ IMAGE SECTION ------------------ */}
        <View style={styles.imagePlaceholder}>
          <Image
            source={require('../assets/FamilyFarm.jpg')} // Ensure this path is correct
            style={styles.image}
            resizeMode="cover" // Ensures the image fits the container
          />
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
              showsUserLocation={isLocationEnabled} // Only show user location if enabled
            >
              {/* Marker indicating the location of Aldor Acres Family Farm */}
              <Marker
                coordinate={{ latitude: farmLatitude, longitude: farmLongitude }}
                title="Aldor Acres Family Farm"
                description="Farm location"
              />
              {isLocationEnabled && location && (
                // If the user's location is available and enabled, display directions from their current location to the farm
                <MapViewDirections
                  origin={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  destination={{ latitude: farmLatitude, longitude: farmLongitude }}
                  apikey={GOOGLE_MAPS_APIKEY} // Replace with your actual Google Maps API Key
                  strokeWidth={4}
                  strokeColor="hotpink"
                />
              )}
            </MapView>
            {!isLocationEnabled && (
              // Overlay message informing the user that location services are disabled
              <View style={styles.mapDisabledOverlay}>
                <Text style={styles.mapDisabledText}>
                  Location services are disabled. Enable them to see your route on the map.
                </Text>
              </View>
            )}
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

  /* ------------------ SCROLLABLE CONTENT STYLES ------------------ */

  scrollContent: {
    paddingBottom: 20, // Space at the bottom to ensure content isn't cut off
  },

  /* ------------------ WEATHER REPORT STYLES ------------------ */

  weatherContainer: {
    backgroundColor: '#BBCDEC', // Background color as specified
    borderRadius: 10, // Rounded corners for a smooth look
    margin: 15, // Margin around the container to separate it from other sections
    padding: 10, // Reduced padding inside the container
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5, // Reduced margin
  },
  unitText: {
    fontSize: 16,
    color: '#000', // Black text for contrast
    marginHorizontal: 5,
  },
  locationNameContainer: {
    alignItems: 'center',
    marginBottom: 5, // Reduced margin
  },
  locationName: {
    fontSize: 16,
    color: '#000', // Black text for contrast
    fontWeight: 'bold',
  },
  dailyContainer: {
    marginBottom: 10, // Reduced to make it more concise
  },
  dailyItem: {
    width: 80, // Adjust the width to fit more items
    marginRight: 10,
  },
  dailyHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent background
    borderRadius: 5,
    padding: 5, // Reduced padding
    alignItems: 'center',
  },
  dailyDay: {
    color: '#000', // Black text for contrast
    fontSize: 14, // Reduced font size
  },
  dailyIcon: {
    width: 30, // Reduced size
    height: 30,
    marginVertical: 2, // Reduced margin
  },
  dailyTemp: {
    color: '#000', // Black text for contrast
    fontSize: 14, // Reduced font size
  },
  detailContainer: {
    alignItems: 'center',
  },
  detailText: {
    color: '#000', // Black text for contrast
    fontSize: 12, // Reduced font size
    textAlign: 'center',
  },

  /* ------------------ WEATHER DISABLED STYLES ------------------ */

  weatherDisabledContainer: {
    backgroundColor: '#FAF4E4', // Light background to indicate disabled state
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  weatherDisabledText: {
    fontSize: 16,
    color: '#555', // Grey text to indicate informational message
    textAlign: 'center',
  },

  /* ------------------ FARM INFORMATION STYLES ------------------ */

  title: {
    fontSize: 24, // Large font size for the farm name
    fontWeight: 'bold',
    color: '#FAF4E4', // Light color for contrast against the orange background
    textAlign: 'center',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  address: {
    fontSize: 14,
    color: '#666', // Dark grey color for better readability
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
    shadowColor: '#000', // Shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#000', // Black text for contrast
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  /* ------------------ IMAGE SECTION STYLES ------------------ */

  imagePlaceholder: {
    width: '90%',
    height: 200,
    backgroundColor: '#e0e0e0', // Placeholder color while image loads
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },

  /* ------------------ ABOUT THE FARM STYLES ------------------ */

  aboutContainer: {
    backgroundColor: '#FAF4E4', // Light background for readability
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    shadowColor: '#000', // Shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aboutText: {
    fontSize: 16,
    color: '#000', // Black text for contrast
    textAlign: 'justify', // Justify text for a clean look
  },

  /* ------------------ USER'S CURRENT LOCATION STYLES ------------------ */

  currentLocationBox: {
    backgroundColor: '#FAF4E4', // Light background to indicate information section
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 10,
    width: '90%',
    shadowColor: '#000', // Shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  locationContainer: {
    alignItems: 'center',
  },
  locationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333', // Dark grey text for readability
  },
  coordsText: {
    fontSize: 16,
    marginVertical: 2,
    color: '#555', // Grey text for contrast
  },
  locationDisabledContainer: {
    alignItems: 'center',
    padding: 10,
  },
  locationDisabledText: {
    fontSize: 16,
    color: '#555', // Grey text to indicate informational message
    textAlign: 'center',
  },

  /* ------------------ MAP SECTION STYLES ------------------ */

  mapContainer: {
    backgroundColor: '#FAF4E4', // Light background for map section
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000', // Shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000', // Black text for contrast
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
    backgroundColor: 'rgba(250, 244, 228, 0.8)', // Semi-transparent overlay
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDisabledText: {
    fontSize: 16,
    color: '#555', // Grey text for contrast
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  /* ------------------ ERROR TEXT STYLES ------------------ */

  errorText: {
    color: 'red', // Red color to indicate errors
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
});
