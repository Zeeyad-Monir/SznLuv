// App.js

import React, { useState, useEffect, createContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Import screens for authentication and main app
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import FallDatesScreen from './screens/FallDatesScreen';
import WinterDatesScreen from './screens/WinterDatesScreen';
import SpringDatesScreen from './screens/SpringDatesScreen';
import SummerDatesScreen from './screens/SummerDatesScreen';
import AldorFamilyFarmScreen from './screens/AldorFamilyFarmScreen'; // New Import

// Note: FavoritesScreen, ProfileScreen, and DateSpotDetailScreen are currently excluded here

// Create context to provide user authentication state throughout the app
export const AuthContext = createContext();

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null); // Tracks current user state
  const [initializing, setInitializing] = useState(true); // Tracks loading state on app start

  // Listen for authentication state changes
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set the user state with current authenticated user
      if (initializing) setInitializing(false); // Stop loading once user is set
    });
    return subscriber; // Cleanup on unmount
  }, [initializing]);

  // Show loading spinner if app is initializing
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Main app navigator with conditional rendering based on auth state
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // Screens for logged-in users
            <React.Fragment>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="FallDatesScreen" component={FallDatesScreen} />
              <Stack.Screen name="AldorFamilyFarmScreen" component={AldorFamilyFarmScreen} /> {/* New Screen */}
              <Stack.Screen name="WinterDatesScreen" component={WinterDatesScreen} />
              <Stack.Screen name="SpringDatesScreen" component={SpringDatesScreen} />
              <Stack.Screen name="SummerDatesScreen" component={SummerDatesScreen} />
              {/* Other screens like Favorites, Profile, etc., can be added as needed */}
            </React.Fragment>
          ) : (
            // Screens for users not logged in (authentication)
            <React.Fragment>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </React.Fragment>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

// Style for loading screen
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
