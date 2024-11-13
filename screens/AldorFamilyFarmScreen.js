// AldorFamilyFarmScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location'; // Importing Expo's Location API for GPS functionality
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';

const AldorFamilyFarmScreen = () => {
  // State to hold the user's current location
  const [location, setLocation] = useState(null);
  // State to hold any error messages related to location fetching
  const [errorMsg, setErrorMsg] = useState(null);
  // State to manage the loading indicator
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let locationSubscription; // To hold the subscription for location updates

    // LOCATION: Function to start tracking the user's location
    const startLocationTracking = async () => {
      // LOCATION: Request permission to access the device's location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // LOCATION: If permission is denied, set an error message and stop loading
        setErrorMsg('Permission to access location was denied.');
        setLoading(false);
        return;
      }

      try {
        // LOCATION: Start watching the user's position with high accuracy
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, // High accuracy for precise location
            timeInterval: 1000, // Update location every 1000 milliseconds (1 second)
            distanceInterval: 1600, // Update location if the user moves by 1600 meter
          },
          (newLocation) => {
            // LOCATION: Callback function to handle new location data
            setLocation(newLocation);
          }
        );
      } catch (error) {
        // LOCATION: If there's an error while fetching the location, set an error message
        setErrorMsg('Error fetching location.');
      } finally {
        // LOCATION: Regardless of success or error, stop the loading indicator
        setLoading(false);
      }
    };

    // LOCATION: Start location tracking when the component mounts
    startLocationTracking();

    // LOCATION: Set up a periodic location fetch every 5 seconds as a fallback
    const intervalId = setInterval(async () => {
      try {
        // LOCATION: Get the current position once
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } catch (error) {
        console.log('Error with periodic location fetch:', error);
      }
    }, 5000); // 5000 milliseconds = 5 seconds

    // LOCATION: Clean up the location subscription and interval when the component unmounts
    return () => {
      if (locationSubscription) locationSubscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  let content; // Variable to hold what will be displayed based on the state

  if (loading) {
    // If the app is still loading the location, show a loading spinner
    content = <ActivityIndicator size="large" color="#0000ff" />;
  } else if (errorMsg) {
    // If there's an error message, display it to the user
    content = <Text style={styles.errorText}>{errorMsg}</Text>;
  } else if (location) {
    // If the location is successfully fetched, display the coordinates
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
      {/* 
        Header Section:
        - Displays the app logo
        - Contains icon buttons for additional actions
      */}
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

      {/* 
        Main Scrollable Content:
        - Contains various sections like weather, farm info, images, location, and map
      */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Weather Report Section */}
        <View style={styles.weatherContainer}>
          {/* Header for Weather Section */}
          <Text style={styles.weatherHeader}>7 DAY WEATHER REPORT</Text>
          <View style={styles.weatherPlaceholders}>
            {/* 
              Placeholder boxes representing weather data/icons for each day.
              These can be replaced with actual weather components or icons in the future.
            */}
            {Array.from({ length: 7 }).map((_, index) => (
              <View key={index} style={styles.weatherPlaceholderBox} />
            ))}
          </View>
        </View>

        {/* Farm Information Section */}
        <Text style={styles.title}>Aldor Acres Family Farm</Text>
        <Text style={styles.address}>24990 84 Ave, Langley, BC</Text>
        <View style={styles.activityBox}>
          {/* Highlighting activities available at the farm */}
          <Text style={styles.activityText}>Petting zoo, pumpkins, and more!</Text>
        </View>

        {/* Image Placeholder Section */}
        <View style={styles.imagePlaceholder}>
          {/* 
            Icon indicating where an image would go.
            You can replace this with an actual Image component when you have images.
          */}
          <Ionicons name="image" size={50} color="#ccc" />
          <Text style={styles.placeholderText}>Image Placeholder</Text>
        </View>

        {/* About the Farm Section */}
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>
            Aldor Acres Family Farm offers an authentic farm experience with a petting zoo, pumpkin patch, and more! Enjoy a day filled with family-friendly activities in the heart of Langley.
          </Text>
        </View>

        {/* User's Current Location Display */}
        <View style={styles.currentLocationBox}>
          {content}
        </View>

        {/* Map Placeholder Section */}
        <View style={styles.mapContainer}>
          {/* Header for Map Section */}
          <Text style={styles.mapHeader}>How to get there?</Text>
          <View style={styles.mapPlaceholder}>
            {/* 
              Red dot representing the farm's destination on the map.
              Blue dot representing the user's current location.
              These are just placeholders and can be replaced with an actual map component like react-native-maps.
            */}
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
  // Container for the entire screen
  container: {
    flex: 1,
    backgroundColor: '#FF8657', // Bright orange background to make the app lively
  },

  /* Header Styles */
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

  /* Scrollable Content Styles */
  scrollContent: {
    paddingBottom: 20, // Space at the bottom to ensure content isn't cut off
  },

  /* Weather Report Styles */
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
  weatherPlaceholders: {
    flexDirection: 'row', // Arrange weather boxes horizontally
    justifyContent: 'space-between', // Evenly space them out
    width: '100%', // Take up full width of the container
  },
  weatherPlaceholderBox: {
    width: 40, // Width of each weather box
    height: 40, // Height of each weather box
    backgroundColor: '#6ca0dc', // Blue color to represent weather icons
    borderRadius: 5, // Slightly rounded corners
    marginHorizontal: 2, // Small horizontal margin between boxes
  },

  /* Farm Information Styles */
  title: {
    fontSize: 24, // Large font size for the farm name
    fontWeight: 'bold', // Bold text for emphasis
    color: '#FAF4E4', // Light color for contrast against the background
    textAlign: 'center', // Center the text
    marginTop: 10, // Space above the title
    textTransform: 'uppercase', // Uppercase letters for a formal look
  },
  address: {
    fontSize: 14, // Smaller font size for the address
    color: '#666', // Grey color for less emphasis
    textAlign: 'center', // Center the text
    textTransform: 'uppercase', // Uppercase letters for consistency
    marginVertical: 5, // Vertical margin above and below the address
  },
  activityBox: {
    backgroundColor: '#FAF4E4', // Light background to highlight activities
    padding: 10, // Padding inside the box
    borderRadius: 10, // Rounded corners for a smooth appearance
    alignSelf: 'center', // Center the box horizontally
    marginVertical: 10, // Vertical margin above and below the box
    width: '90%', // Width relative to the parent container
    shadowColor: '#000', // Shadow color for depth
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1, // Shadow opacity
    shadowRadius: 2, // Shadow blur radius
    elevation: 2, // Elevation for Android shadow
  },
  activityText: {
    fontSize: 14, // Font size for the activity text
    color: '#000', // Black text color for readability
    textAlign: 'center', // Center the text
    textTransform: 'capitalize', // Capitalize each word
  },

  /* Image Placeholder Styles */
  imagePlaceholder: {
    width: '90%', // Width relative to the parent container
    height: 200, // Fixed height for the placeholder
    backgroundColor: '#e0e0e0', // Light grey background to indicate a placeholder
    borderRadius: 10, // Rounded corners for a smooth look
    alignSelf: 'center', // Center the placeholder horizontally
    marginVertical: 15, // Vertical margin above and below the placeholder
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    position: 'relative', // Position relative to allow absolute positioning of text
  },
  placeholderText: {
    position: 'absolute', // Position text absolutely within the placeholder
    color: '#666', // Grey text color
    fontSize: 16, // Font size for the placeholder text
  },

  /* About the Farm Styles */
  aboutContainer: {
    backgroundColor: '#FAF4E4', // Light background to highlight the about section
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners for a smooth appearance
    marginHorizontal: 15, // Horizontal margin on both sides
    shadowColor: '#000', // Shadow color for depth
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1, // Shadow opacity
    shadowRadius: 2, // Shadow blur radius
    elevation: 2, // Elevation for Android shadow
  },
  aboutText: {
    fontSize: 16, // Font size for the about text
    color: '#000', // Black text color for readability
    textAlign: 'justify', // Justify the text for neat alignment
  },

  /* User's Current Location Styles */
  currentLocationBox: {
    backgroundColor: '#FAF4E4', // Light background to highlight the location section
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners for a smooth look
    alignSelf: 'center', // Center the container horizontally
    marginVertical: 10, // Vertical margin above and below the container
    width: '90%', // Width relative to the parent container
    shadowColor: '#000', // Shadow color for depth
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.05, // Shadow opacity
    shadowRadius: 1, // Shadow blur radius
    elevation: 1, // Elevation for Android shadow
  },
  locationContainer: {
    alignItems: 'center', // Center items horizontally
  },
  locationText: {
    fontSize: 18, // Font size for the location header
    fontWeight: 'bold', // Bold text for emphasis
    marginBottom: 10, // Space below the header
    color: '#333', // Dark grey text color
  },
  coordsText: {
    fontSize: 16, // Font size for the coordinates
    marginVertical: 2, // Small vertical margin above and below
    color: '#555', // Medium grey text color
  },

  /* Map Placeholder Styles */
  mapContainer: {
    backgroundColor: '#FAF4E4', // Light background to highlight the map section
    padding: 15, // Padding inside the container
    borderRadius: 10, // Rounded corners for a smooth look
    marginHorizontal: 15, // Horizontal margin on both sides
    marginTop: 10, // Space above the container
    shadowColor: '#000', // Shadow color for depth
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.1, // Shadow opacity
    shadowRadius: 2, // Shadow blur radius
    elevation: 2, // Elevation for Android shadow
  },
  mapHeader: {
    fontSize: 18, // Font size for the map header
    fontWeight: 'bold', // Bold text for emphasis
    color: '#000', // Black text color for readability
    textAlign: 'center', // Center the text
    marginBottom: 10, // Space below the header
  },
  mapPlaceholder: {
    width: '100%', // Full width of the container
    height: 200, // Fixed height for the map placeholder
    backgroundColor: '#d0e6a5', // Light green background to represent greenery or map area
    borderRadius: 10, // Rounded corners for a smooth look
    position: 'relative', // Position relative to allow absolute positioning of markers and text
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  mapMarkerDestination: {
    width: 20, // Width of the destination marker
    height: 20, // Height of the destination marker
    backgroundColor: 'red', // Red color for visibility
    borderRadius: 10, // Make it a perfect circle
    position: 'absolute', // Position it absolutely within the map placeholder
    top: '40%', // Position from the top
    left: '50%', // Position from the left
    transform: [{ translateX: -10 }, { translateY: -10 }], // Center the marker exactly at the point
  },
  mapMarkerUser: {
    width: 10, // Width of the user's current location marker
    height: 10, // Height of the user's current location marker
    backgroundColor: 'blue', // Blue color to differentiate from the destination
    borderRadius: 5, // Make it a smaller circle
    position: 'absolute', // Position it absolutely within the map placeholder
    top: '60%', // Position from the top
    left: '30%', // Position from the left
  },
  mapPlaceholderText: {
    position: 'absolute', // Position text absolutely within the map
    color: '#666', // Grey text color
    fontSize: 16, // Font size for the placeholder text
  },

  /* Error Text Styles */
  errorText: {
    color: 'red', // Red color to indicate an error
    fontSize: 16, // Font size for the error message
    textAlign: 'center', // Center the text
    marginVertical: 10, // Space above and below the text
  },
});
