// EAGLEACRESDAIRY.JS

// =========================
// IMPORTS SECTION
// =========================

// Import React and necessary hooks for managing state, side effects, and context
import React, { useState, useEffect, useContext, useRef } from 'react';

// Import components from React Native for building the UI
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

// Import Expo's Location module to access the device's location
import * as Location from 'expo-location';

// Import MapView components for displaying maps and markers
import MapView, { Marker } from 'react-native-maps';

// Import MapViewDirections for displaying route directions on the map
import MapViewDirections from 'react-native-maps-directions';

// Import the external NavBar component
import NavBar from '../components/NavBar'; // Adjust the path based on your project structure
import useVenueWeather from '../hooks/useVenueWeather';

// Import SettingsContext to access location services settings
import { SettingsContext } from './SettingsContext'; // Adjust the path based on your project structure

// =========================
// API KEYS SECTION
// =========================

// API key for OpenWeatherMap to fetch weather data

// Google Maps API key for accessing directions and geolocation services
const GOOGLE_MAPS_APIKEY = 'AIzaSyAs3qjk2W3iapdfiw7HIg9CVHlfa8H8NYA'; // GOOGLE

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * EagleAcresDairy Component
 * 
 * This component represents the screen for Eagle Acres Dairy & Pumpkin Patch.
 * It displays weather information, farm details, images, and a map with directions.
 * It handles location permissions and provides interactive animations.
 */
const EagleAcresDairy = () => {
  // =========================
  // CONTEXT ACCESS SECTION
  // =========================

  // Accessing the isLocationEnabled value from SettingsContext
  const { isLocationEnabled } = useContext(SettingsContext);

  // =========================
  // STATE VARIABLES SECTION
  // =========================

  // State variables for managing location, loading states, errors, and data
  const [location, setLocation] = useState(null);
  const [directionsError, setDirectionsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMetric, setIsMetric] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  // =========================
  // FARM COORDINATES SECTION
  // =========================

  // Coordinates for the Eagle Acres Dairy & Pumpkin Patch
  const farmLatitude = 49.15948;
  const farmLongitude = -122.55347;

  // =========================
  // ANIMATION SETUP SECTION
  // =========================

  // Animated values for different sections
  const weatherOpacity = useRef(new Animated.Value(0)).current;
  const weatherTranslateX = useRef(new Animated.Value(50)).current; // Slide in from right

  const farmInfoOpacity = useRef(new Animated.Value(0)).current;
  const farmInfoTranslateX = useRef(new Animated.Value(-50)).current; // Slide in from left

  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.95)).current;

  const aboutOpacity = useRef(new Animated.Value(0)).current;
  const aboutTranslateY = useRef(new Animated.Value(30)).current; // Slide in from bottom

  const mapOpacity = useRef(new Animated.Value(0)).current;
  const mapTranslateX = useRef(new Animated.Value(50)).current; // Slide in from right

  // =========================
  // LOCATION EFFECT HOOK SECTION
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
        setLoading(false);
        return;
      }

      try {
        // Requesting foreground location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setErrorMsg(null);

        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied.');
          Alert.alert(
            'Location Permission Denied',
            'Please enable location services in your device settings to use this feature.',
            [{ text: 'OK' }]
          );
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

    // Cleanup function to remove location subscription when component unmounts
    return () => {
      cancelled = true;
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isLocationEnabled]);

  // Forecast for the spot itself (not the user's location), so it loads without a GPS fix
  const { weatherData, dailyData, weatherError } = useVenueWeather(farmLatitude, farmLongitude);

  // =========================
  // ANIMATION EFFECT HOOK SECTION
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
      // Animate Weather Report Section
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

      // Animate Farm Information Section
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

      // Animate Image Section with a slight delay
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

      // Animate About Section with a slight delay
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

      // Animate Map Section with a further delay
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
  ]); // Include all animated values in dependencies

  // =========================
  // HELPER FUNCTIONS SECTION
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
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* ------------------ NAVIGATION BAR ------------------ */}
      <NavBar />

      {/* ------------------ MAIN SCROLLABLE CONTENT ------------------ */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ------------------ WEATHER REPORT SECTION ------------------ */}
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

        {/* ------------------ FARM INFORMATION SECTION ------------------ */}
        <Animated.View
          style={[
            styles.farmInfoContainer,
            {
              opacity: farmInfoOpacity,
              transform: [{ translateX: farmInfoTranslateX }],
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
                    Eagle Acres Dairy & Pumpkin Patch
                  </Text>
          <Text style={styles.address}>8796 240 St, Langley, BC</Text>
          <View style={styles.activityBox}>
            <Text style={styles.activityText}>Farm animals, a corn maze, and hayrides!</Text>
          </View>
        </Animated.View>

        {/* ------------------ IMAGE SECTION ------------------ */}
        <Animated.View
          style={[
            styles.imagePlaceholder,
            {
              opacity: imageOpacity,
              transform: [{ scale: imageScale }],
            },
          ]}
        >
          <Image
            source={require('../assets/EagleAcres.png')}
            style={styles.image}
            resizeMode="cover"
          />
        </Animated.View>

        {/* ------------------ ABOUT THE FARM SECTION ------------------ */}
        <Animated.View
          style={[
            styles.aboutContainer,
            {
              opacity: aboutOpacity,
              transform: [{ translateY: aboutTranslateY }],
            },
          ]}
        >
          <Text style={styles.aboutText}>
            Join the cows, horse, sheep, goats, chickens, pigs, 
            rabbits, cats & dogs for some relaxing time in the 
            country. Look for R2D2 the Milking Robot and other 
            cool machines working on our dairy farm. Relax on 
            a scenic hayride that circles past the corn
            maze and pumpkin fields!
          </Text>
        </Animated.View>

        {/* ------------------ MAP SECTION ------------------ */}
        <Animated.View
          style={[
            styles.mapContainer,
            {
              opacity: mapOpacity,
              transform: [{ translateX: mapTranslateX }],
            },
          ]}
        >
          {/* Header for Map Section */}
          <Text style={styles.mapHeader}>How to get there?</Text>
                  {directionsError && <Text accessibilityRole="alert">Directions are currently unavailable. You can still see the venue on the map.</Text>}
                  {!!errorMsg && <Text accessibilityRole="alert">{errorMsg} Directions need your location, but you can still see the venue on the map.</Text>}
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: farmLatitude,
                longitude: farmLongitude,
                latitudeDelta: 0.25,
                longitudeDelta: 0.25,
              }}
              showsUserLocation={isLocationEnabled}
            >
              <Marker
                coordinate={{ latitude: farmLatitude, longitude: farmLongitude }}
                title="Eagle Acres Dairy & Pumpkin Patch"
                description="Farm location"
              />
              {isLocationEnabled && location && (
                <MapViewDirections
                  onReady={() => setDirectionsError(false)}
                  onError={(message) => { console.error('Directions unavailable:', message); setDirectionsError(true); }}
                  origin={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  destination={{ latitude: farmLatitude, longitude: farmLongitude }}
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
      </ScrollView>
    </View>
  );
};

// Export the component so it can be used in other parts of the app
export default EagleAcresDairy;

// =========================
// STYLESHEET SECTION
// =========================

/**
 * Styles for EagleAcresDairy components
 * 
 * This stylesheet defines the visual appearance of the EagleAcresDairy screen, including layout, colors, fonts, and spacing.
 */
const styles = StyleSheet.create({
  // Container for the entire screen
  container: {
    flex: 1,
    backgroundColor: '#F4A460',
  },

  /* ------------------ SCROLLABLE CONTENT STYLES ------------------ */
  scrollContent: {
    paddingBottom: 20,
  },

  /* ------------------ WEATHER REPORT STYLES ------------------ */
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

  /* ------------------ WEATHER DISABLED STYLES ------------------ */
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

  /* ------------------ FARM INFORMATION STYLES ------------------ */
  farmInfoContainer: {
    // Container for animated farm information section
  },
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
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  /* ------------------ IMAGE SECTION STYLES ------------------ */
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
    marginBottom: 15,
  },
  aboutText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'justify',
  },

  /* ------------------ USER'S CURRENT LOCATION STYLES ------------------ */

  /* ------------------ MAP SECTION STYLES ------------------ */
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

  /* ------------------ ERROR TEXT STYLES ------------------ */
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
});