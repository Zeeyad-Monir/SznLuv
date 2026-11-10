// ==================================================
// IMPORTS
// ==================================================

import React, { useState, useEffect, useContext } from 'react';
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
  Animated,
} from 'react-native';

// Import location services from Expo
import * as Location from 'expo-location';

// Import Map components for displaying maps and directions
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

// Import custom components and context
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import useVenueWeather from '../hooks/useVenueWeather';
import useEntrance from '../hooks/useEntrance';
import useAfterTransition from '../hooks/useAfterTransition';
import { SettingsContext } from './SettingsContext';
import ReviewSection from '../components/reviews/ReviewSection';
import useSpotReviews from '../hooks/useSpotReviews';
import { reviewSource } from '../services/reviews';

// Shared spot data (services/spots.js), API keys, and venue photos
import { getSpotByPlaceID } from '../services/spots';
import { GOOGLE_MAPS_APIKEY } from '../services/apiKeys';
import spotImages from './spotImages';

// ==================================================
// CONSTANTS
// ==================================================

// ==================================================
// MAIN COMPONENT: SpotDetailScreen (shared venue page for the spots in services/spots.js)
// ==================================================

const SpotDetailScreen = ({ route }) => {
  const floatingScrollStyle = useFloatingScrollStyle(styles.scrollContent);
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

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Reviews: the same section and data as every other spot page (components/reviews/ReviewSection.js).
  const reviews = useSpotReviews(spot ? reviewSource({ placeID: spot.placeID }) : null);

  // ==================================================
  // VENUE LOCATION COORDINATES
  // ==================================================

  const venueLatitude = spot?.latitude;
  const venueLongitude = spot?.longitude;

  // ==================================================
  // ANIMATION REFERENCES
  // ==================================================

  // Weather, details, photo, about and map ease in together once the page has its data.
  const entrance = useEntrance(5, { ready: !loading });
  const mapReady = useAfterTransition(); // The map mounts after the slide, so it can't stutter the push

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

  const convertTemp = (temp) => {
    return isMetric ? temp.toFixed(1) : ((temp * 9) / 5 + 32).toFixed(1);
  };

  const getUnit = () => {
    return isMetric ? '°C' : '°F';
  };

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
      <SignedInScreen style={styles.container}>
        <Text style={styles.errorText}>Details unavailable for this spot.</Text>
      </SignedInScreen>
    );
  }

  return (
    <SignedInScreen style={styles.container}>
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
                      entrance[0],
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
                    entrance[1],
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
                    entrance[2],
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
                    entrance[3],
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
                    entrance[4],
                  ]}
                >
                  <Text style={styles.mapHeader}>How to get there?</Text>
                  {directionsError && <Text accessibilityRole="alert">Directions are currently unavailable. You can still see the venue on the map.</Text>}
                  {!!errorMsg && <Text accessibilityRole="alert">{errorMsg} Directions need your location, but you can still see the venue on the map.</Text>}

                  <View style={styles.mapWrapper}>
                    {mapReady && (
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
                    )}

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
            return <ReviewSection reviews={reviews} />;
          }
        }}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={floatingScrollStyle}
      />
    </SignedInScreen>
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
});