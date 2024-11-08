// App.js

import React, { useState, useEffect, createContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth } from './firebaseConfig'; // Ensure auth is exported from firebaseConfig.js
import { onAuthStateChanged } from 'firebase/auth';

// Import your screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SpinWheelScreen from './screens/SpinWheelScreen';
import ProfileScreen from './screens/ProfileScreen';

// Create AuthContext
export const AuthContext = createContext();

// Define navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Callback to handle auth state changes
  const onAuthStateChangedCallback = (currentUser) => {
    setUser(currentUser);
    if (initializing) setInitializing(false);
  };

  useEffect(() => {
    // Subscribe to auth state changes
    const subscriber = onAuthStateChanged(auth, onAuthStateChangedCallback);
    return subscriber; // Unsubscribe on unmount
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Authentication Stack Navigator
  const AuthStack = () => (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      {/* Uncomment and create RegisterScreen if registration is needed */}
      {/* <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} /> */}
    </Stack.Navigator>
  );

  // Main Tab Navigator
  const MainTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#333333',
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        // Optionally, add icons to the tabs
        // tabBarIcon: ({ focused, color, size }) => {
        //   let iconName;
        //   if (route.name === 'Home') {
        //     iconName = focused ? 'home' : 'home-outline';
        //   } else if (route.name === 'Spin the Wheel') {
        //     iconName = focused ? 'dice' : 'dice-outline';
        //   } else if (route.name === 'Profile') {
        //     iconName = focused ? 'person' : 'person-outline';
        //   }
        //   return <Ionicons name={iconName} size={size} color={color} />;
        // },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Spin the Wheel" component={SpinWheelScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <NavigationContainer>
        {user ? <MainTabs /> : <AuthStack />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

// Styles for the loading indicator
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
