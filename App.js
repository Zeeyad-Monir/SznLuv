// App.js

import React, { useState, useEffect, createContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Import your screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
//import SpinWheelScreen from './screens/SpinWheelScreen';
//import ProfileScreen from './screens/ProfileScreen';

// Create AuthContext
export const AuthContext = createContext();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Handle auth state changes
  const onAuthStateChangedCallback = (currentUser) => {
    setUser(currentUser);
    if (initializing) setInitializing(false);
  };

  useEffect(() => {
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

  // Stack Navigator for Authentication
  const AuthStack = () => (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );

  // Bottom Tab Navigator for Main Screens
  const MainTabs = () => (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#333333' },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
      }}
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
