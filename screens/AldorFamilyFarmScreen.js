import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';

const AldorFamilyFarmScreen = () => {
  const [location, setLocation] = useState(null); // Holds the location object
  const [errorMsg, setErrorMsg] = useState(null); // Holds any error messages
  const [loading, setLoading] = useState(true); // Indicates if location is being fetched

  useEffect(() => {
    let locationSubscription;
    const startLocationTracking = async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied.');
        setLoading(false);
        return;
      }

      try {
        // Start watching the user's location with continuous updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000, // 1 second interval for testing
            distanceInterval: 1, // 1 meter interval for testing
          },
          (newLocation) => {
            setLocation(newLocation);
          }
        );
      } catch (error) {
        setErrorMsg('Error fetching location.');
      } finally {
        setLoading(false);
      }
    };

    // Start location tracking on component mount
    startLocationTracking();

    // Fallback with periodic location fetching every 5 seconds
    const intervalId = setInterval(async () => {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } catch (error) {
        console.log('Error with periodic location fetch:', error);
      }
    }, 5000);

    // Clean up subscriptions on unmount
    return () => {
      if (locationSubscription) locationSubscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  // Determine what to display based on the state
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
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>SznLuv</Text>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="sun" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="favorite-border" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Weather Report Placeholder */}
        <View style={styles.weatherContainer}>
          <Text style={styles.weatherHeader}>7 DAY WEATHER REPORT</Text>
          <View style={styles.weatherPlaceholders}>
            {Array.from({ length: 7 }).map((_, index) => (
              <View key={index} style={styles.weatherPlaceholderBox} />
            ))}
          </View>
        </View>

        {/* Date Spot Information */}
        <Text style={styles.title}>Aldor Acres Family Farm</Text>
        <Text style={styles.address}>24990 84 Ave, Langley, BC</Text>
        <View style={styles.activityBox}>
          <Text style={styles.activityText}>Petting zoo, pumpkins, and more!</Text>
        </View>

        {/* Main Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image" size={50} color="#ccc" />
          <Text style={styles.placeholderText}>Image Placeholder</Text>
        </View>

        {/* About the Farm */}
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>
            Aldor Acres Family Farm offers an authentic farm experience with a petting zoo, pumpkin patch, and more! Enjoy a day filled with family-friendly activities in the heart of Langley.
          </Text>
        </View>

        {/* User's Current Location Display */}
        <View style={styles.currentLocationBox}>
          {content}
        </View>

        {/* How to Get There? (Map Placeholder) */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapHeader}>How to get there?</Text>
          <View style={styles.mapPlaceholder}>
            {/* Placeholder for the map */}
            <View style={styles.mapMarkerDestination} />
            <View style={styles.mapMarkerUser} />
            <Text style={styles.mapPlaceholderText}>Map Placeholder</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AldorFamilyFarmScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF8657',
  },

  // Top Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  logoText: {
    flex: 1,
    color: '#ff8c00',
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },

  // Scrollable Content Styles
  scrollContent: {
    paddingBottom: 20,
  },

  // Weather Report Styles
  weatherContainer: {
    backgroundColor: '#B9CCEC',
    padding: 15,
    alignItems: 'center',
    borderRadius: 10,
    margin: 15,
  },
  weatherHeader: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  weatherPlaceholders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  weatherPlaceholderBox: {
    width: 40,
    height: 40,
    backgroundColor: '#6ca0dc',
    borderRadius: 5,
    marginHorizontal: 2,
  },

  // Date Spot Information Styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAF4E4',
    textAlign: 'center',
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

  // Image Placeholder Styles
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
  },
  placeholderText: {
    position: 'absolute',
    color: '#666',
    fontSize: 16,
  },

  // About the Farm Styles
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
    color: '#000',
    textAlign: 'justify',
  },

  // User's Current Location Styles
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
    alignItems: 'center',
  },
  locationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  coordsText: {
    fontSize: 16,
    marginVertical: 2,
    color: '#555',
  },

  // Map Placeholder Styles
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
  mapPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#d0e6a5',
    borderRadius: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerDestination: {
    width: 20,
    height: 20,
    backgroundColor: 'red',
    borderRadius: 10,
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  mapMarkerUser: {
    width: 10,
    height: 10,
    backgroundColor: 'blue',
    borderRadius: 5,
    position: 'absolute',
    top: '60%',
    left: '30%',
  },
  mapPlaceholderText: {
    position: 'absolute',
    color: '#666',
    fontSize: 16,
  },

  // Error Text Styles
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
});
