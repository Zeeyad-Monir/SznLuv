// App.js

import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

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
import MainTabs from './navigation/MainTabs';
import ChooseCollectionSheet from './screens/ChooseCollectionSheet';
import CreateCollectionSheet from './screens/CreateCollectionSheet';

// Import SettingsProvider
import { SettingsProvider } from './screens/SettingsContext';

// Create context to provide user authentication state throughout the app
export { AuthContext } from './contexts/AuthContext';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// VoiceOver's two-finger "scrub" gesture: back out of a page or close a sheet, like the chevron or X.
const escapeBack = () => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
};

// The colour behind screens during a transition, so a push never flashes grey.
const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#FFF5E4' } };

// Signing in or out swaps the whole app, so it dissolves instead of sliding like a page.
const crossDissolve = { animation: 'fade' };

// Native bottom sheet, as tall as its content, dismissed by dragging down.
const bottomSheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: 16,
  contentStyle: { backgroundColor: '#fff' },
};

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
      if (!cancelled) setProfile({ status: snapshot.exists() && snapshot.data().username ? 'ready' : 'missing', username: snapshot.data()?.username });
    }).catch((error) => {
      console.error('Profile access failed:', { code: error.code });
      if (!cancelled) setProfile({ status: 'error', message: firebaseErrorMessage(error, 'signup') });
    });
    return () => { cancelled = true; };
  }, [user, registering, retry]);

  const access = sessionAccess({ initializing, user, registering, registrationError, profile });

  // While a sign-in's profile loads, stay on Login so the swap to Home is one smooth dissolve.
  // Only held when coming from auth: after a blocked retry, Login would be the wrong screen.
  const heldOnAuth = useRef(false);
  if (access !== 'loading') heldOnAuth.current = access === 'auth';
  const shown = access === 'loading' && heldOnAuth.current ? 'auth' : access;

  // Show loading spinner if app is initializing
  if (shown === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#333333" />
      </View>
    );
  }

  // Main app navigator with conditional rendering based on auth state
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <AuthContext.Provider value={{ user, username: profile.username, setUser, setRegistering, setRegistrationError }}>
      <SettingsProvider>
        {shown === 'blocked' ? (
          <AccountAccessScreen status={registrationError ? 'error' : profile.status} message={registrationError || profile.message}
            onRetry={() => { setRegistrationError(null); setRetry(value => value + 1); }} />
        ) : <View style={styles.app} onAccessibilityEscape={escapeBack}><NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {shown === 'home' ? (
              <>
                <Stack.Screen name="Main" component={MainTabs} options={crossDissolve} />
                <Stack.Screen name="ChooseCollection" component={ChooseCollectionSheet} options={bottomSheet} />
                <Stack.Screen name="CreateCollection" component={CreateCollectionSheet} options={bottomSheet} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} options={crossDissolve} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer></View>}
      </SettingsProvider>
    </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

// Style for loading screen
const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E4',
  },
});