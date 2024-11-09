// App.js

import React, { useState, useEffect, createContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Import your screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import FallDatesScreen from './screens/FallDatesScreen';
import WinterDatesScreen from './screens/WinterDatesScreen';
import SpringDatesScreen from './screens/SpringDatesScreen';
import SummerDatesScreen from './screens/SummerDatesScreen';
// Removed FavoritesScreen, ProfileScreen, DateSpotDetailScreen imports

// Create AuthContext
export const AuthContext = createContext();

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Handle auth state changes
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber; // Unsubscribe on unmount
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Stack Navigator for Authentication and Main App
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // Main App Screens for authenticated users
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="FallDatesScreen" component={FallDatesScreen} />
              <Stack.Screen name="WinterDatesScreen" component={WinterDatesScreen} />
              <Stack.Screen name="SpringDatesScreen" component={SpringDatesScreen} />
              <Stack.Screen name="SummerDatesScreen" component={SummerDatesScreen} />
              {/* Removed Favorites, Profile, and DateSpotDetail Screens */}
              {/* Add other screens as needed */}
            </>
          ) : (
            // Authentication Screens for unauthenticated users
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});