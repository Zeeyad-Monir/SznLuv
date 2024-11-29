// App.js

import React, { useState, useEffect, createContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Firebase imports
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import FallDatesScreen from './screens/FallDatesScreen';
import WinterDatesScreen from './screens/WinterDatesScreen';
import SpringDatesScreen from './screens/SpringDatesScreen';
import SummerDatesScreen from './screens/SummerDatesScreen';
import AldorFamilyFarmScreen from './screens/AldorFamilyFarmScreen';
import SpinTheWheel from './screens/SpinTheWheel';
import Favourites from './screens/Favourites';
//import ProfileScreen from './screens/ProfileScreen'; // Import the new ProfileScreen

// Create context to provide user authentication state throughout the app
export const AuthContext = createContext();

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Listen for authentication state changes
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
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
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="FallDatesScreen" component={FallDatesScreen} />
              <Stack.Screen
                name="AldorFamilyFarmScreen"
                component={AldorFamilyFarmScreen}
              />
              <Stack.Screen
                name="WinterDatesScreen"
                component={WinterDatesScreen}
              />
              <Stack.Screen
                name="SpringDatesScreen"
                component={SpringDatesScreen}
              />
              <Stack.Screen
                name="SummerDatesScreen"
                component={SummerDatesScreen}
              />
              <Stack.Screen
                name="Favourites"
                component={Favourites}
              />
              <Stack.Screen name="SpinTheWheel" component={SpinTheWheel} />
              {/*<Stack.Screen name="ProfileScreen" component={ProfileScreen} />  Add this line */}
            </>
          ) : (
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

// Style for loading screen
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});