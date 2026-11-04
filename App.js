// App.js

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Firebase imports
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AuthContext } from './contexts/AuthContext';
import AccountAccessScreen from './screens/AccountAccessScreen';
import { sessionAccess } from './services/sessionAccess';
import { firebaseErrorMessage } from './services/firebaseErrors';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import VancouverScreen from './screens/VancouverScreen';
import SeasonsScreen from './screens/SeasonsScreen';
import FallDatesScreen from './screens/FallDatesScreen';
import SpotDetailScreen from './screens/SpotDetailScreen';
import WinterDatesScreen from './screens/WinterDatesScreen';
import SpringDatesScreen from './screens/SpringDatesScreen';
import SummerDatesScreen from './screens/SummerDatesScreen';
import AldorFamilyFarmScreen from './screens/AldorFamilyFarmScreen';
import SpinTheWheel from './screens/SpinTheWheel';
import Favourites from './screens/Favourites';
import ProfileSettings from './screens/ProfileSettings'; 
import LaityPumpkinPatch from './screens/LaityPumpkinPatch';
import EagleAcresDairy from './screens/EagleAcresDairy'; 
import SeasonalFavourites from './screens/SeasonalFavourites'; 
import CustomCollectionScreen from './screens/CustomCollectionScreen'; 



// Import SettingsProvider
import { SettingsProvider } from './screens/SettingsContext';

// Create context to provide user authentication state throughout the app
export { AuthContext } from './contexts/AuthContext';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState(null);
  const [profile, setProfile] = useState({ status: 'checking' });
  const [retry, setRetry] = useState(0);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setProfile({ status: 'checking' });
    setUser(currentUser);
    if (!currentUser) setRegistrationError(null);
    setInitializing(false);
  }), []);

  useEffect(() => {
    if (!user || registering) return;
    let cancelled = false;
    setProfile({ status: 'checking' });
    getDoc(doc(db, 'users', user.uid)).then((snapshot) => {
      if (!cancelled) setProfile({ status: snapshot.exists() && snapshot.data().username ? 'ready' : 'missing' });
    }).catch((error) => {
      console.error('Profile access failed:', { code: error.code });
      if (!cancelled) setProfile({ status: 'error', message: firebaseErrorMessage(error, 'signup') });
    });
    return () => { cancelled = true; };
  }, [user, registering, retry]);

  const access = sessionAccess({ initializing, user, registering, registrationError, profile });

  // Show loading spinner if app is initializing
  if (access === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Main app navigator with conditional rendering based on auth state
  return (
    <AuthContext.Provider value={{ user, setUser, setRegistering, setRegistrationError }}>
      <SettingsProvider>
        {access === 'blocked' ? (
          <AccountAccessScreen status={registrationError ? 'error' : profile.status} message={registrationError || profile.message}
            onRetry={() => { setRegistrationError(null); setRetry(value => value + 1); }} />
        ) : <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {access === 'home' ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="VancouverScreen" component={VancouverScreen} />
                <Stack.Screen name="SeasonsScreen" component={SeasonsScreen} />
                <Stack.Screen name="FallDatesScreen" component={FallDatesScreen} />
                <Stack.Screen name="AldorFamilyFarmScreen" component={AldorFamilyFarmScreen} />
                <Stack.Screen name="SpotDetailScreen" component={SpotDetailScreen} />
                <Stack.Screen name="WinterDatesScreen" component={WinterDatesScreen} />
                <Stack.Screen name="SpringDatesScreen" component={SpringDatesScreen} />
                <Stack.Screen name="SummerDatesScreen" component={SummerDatesScreen} />
                <Stack.Screen name="Favourites" component={Favourites} />
                <Stack.Screen name="ProfileSettings" component={ProfileSettings} />
                <Stack.Screen name="SpinTheWheel" component={SpinTheWheel} />
                <Stack.Screen name="LaityPumpkinPatch" component={LaityPumpkinPatch} />
                <Stack.Screen name="EagleAcresDairy" component={EagleAcresDairy} />
                <Stack.Screen name="SeasonalFavourites" component={SeasonalFavourites} />
                <Stack.Screen name="CustomCollectionScreen" component={CustomCollectionScreen} />



              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>}
      </SettingsProvider>
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