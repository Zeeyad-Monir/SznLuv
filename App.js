// App.js

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme, StackActions, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

// Firebase imports
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AuthContext } from './contexts/AuthContext';
import { CityContext } from './contexts/CityContext';
import { findCity } from './services/catalogue';
import { CITY_FIELD, selectedCityFrom, unavailableCityFrom, withTimeout } from './services/cityPreference';
import AccountAccessScreen from './screens/AccountAccessScreen';
import { sessionAccess } from './services/sessionAccess';
import { firebaseErrorMessage } from './services/firebaseErrors';
import { setMetricsSink } from './services/metrics';
import { recordEvent, flushEvents, setEventsUser } from './services/events';
import { forgetExploreFeed } from './services/explore';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import MainTabs from './navigation/MainTabs';
import ListDetailsSheet from './screens/ListDetailsSheet';
import AddToListSheet from './screens/AddToListSheet';
import NoteSheet from './screens/NoteSheet';
import SharingSheet from './screens/SharingSheet';
import ReportSheet from './screens/ReportSheet';
import EditProfileSheet from './screens/EditProfileSheet';
import SettingsScreen from './screens/SettingsScreen';
import CitySelectionScreen from './screens/CitySelectionScreen';
import { MyListsProvider } from './hooks/useMyLists';
import { SavedCollectionsProvider } from './hooks/useSavedCollections';
import { MySpotsProvider } from './hooks/useMySpots';
import useReduceMotion from './hooks/useReduceMotion';
import * as Linking from 'expo-linking';
import { parseLink } from './services/links';
import { onPendingLink, setPendingLink, takePendingLink } from './services/pendingLink';

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

// Shared lists and profiles open in Explore, reusing the tabs even if Settings or a sheet is open.
function openPendingLink() {
  if (!navigationRef.isReady()) return;
  const root = navigationRef.getRootState();
  if (!root?.routes.some(route => route.name === 'Main')) return;
  const target = takePendingLink();
  if (!target) return;
  const page = target.type === 'list'
    ? { screen: 'ListScreen', params: { listId: target.listId, from: 'link' } }
    : { screen: 'PersonScreen', params: { username: target.username } };
  navigationRef.dispatch({
    ...StackActions.popTo('Main', { screen: 'ExploreTab', params: { ...page, initial: false } }),
    target: root.key,
  });
}

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
  const reduceMotion = useReduceMotion();
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
      if (cancelled) return;
      const data = snapshot.data();
      // The city rides on this same read, so asking for it costs nothing extra.
      setProfile({
        status: snapshot.exists() && data.username ? 'ready' : 'missing', username: data?.username,
        cityId: selectedCityFrom(data), unavailableCity: unavailableCityFrom(data),
      });
    }).catch((error) => {
      console.error('Profile access failed:', { code: error.code });
      if (!cancelled) setProfile({ status: 'error', message: firebaseErrorMessage(error, 'signup') });
    });
    return () => { cancelled = true; };
  }, [user, registering, retry]);

  // Explore's events are written in batches: whoever is signed in owns the batch, and leaving the app sends it.
  useEffect(() => {
    setEventsUser(user?.uid);
    forgetExploreFeed();
  }, [user?.uid]);
  useEffect(() => {
    setMetricsSink(recordEvent);
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') flushEvents(); });
    return () => subscription.remove();
  }, []);

  // Saves the chosen city to the profile, then lets the app use it. Rejects if the save did not go through,
  // so a failed save is never shown as a chosen city. Choosing the current city again writes nothing.
  const uid = user?.uid;
  const currentCityId = profile.cityId;
  const changeCity = useCallback(async cityId => {
    if (!uid) throw new Error('You must be logged in.');
    if (!findCity(cityId)?.active) throw new Error('That city is not available.');
    if (cityId === currentCityId) return;
    // A merge only ever touches this one field: nothing else on the profile is rewritten.
    await withTimeout(setDoc(doc(db, 'users', uid), { [CITY_FIELD]: cityId }, { merge: true }));
    // Someone else may have signed in while the save was out: their profile is not this one's to change.
    if (auth.currentUser?.uid !== uid) return;
    forgetExploreFeed();
    setProfile(previous => (previous.status === 'ready' ? { ...previous, cityId, unavailableCity: null } : previous));
  }, [uid, currentCityId]);

  // Signing out fades the app away rather than cutting it, so its pages still draw for a moment after the
  // profile is gone. They keep the last city until then; `chosen` says whether this person has one.
  const city = findCity(profile.cityId) ?? null;
  const lastCity = useRef(null);
  if (city) lastCity.current = city;
  const cityValue = useMemo(() => ({
    city: city ?? lastCity.current, chosen: !!city, unavailableCity: profile.unavailableCity ?? null, changeCity,
  }), [city, profile.unavailableCity, changeCity]);

  const access = sessionAccess({ initializing, user, registering, registrationError, profile });

  // While a sign-in's profile loads, stay on Login so the swap to Home is one smooth dissolve.
  // Only held when coming from auth: after a blocked retry, Login would be the wrong screen.
  const heldOnAuth = useRef(false);
  if (access !== 'loading') heldOnAuth.current = access === 'auth';
  const shown = access === 'loading' && heldOnAuth.current ? 'auth' : access;

  // A link can arrive at launch or while the app is open. It waits until someone is signed in:
  // tapped while signed out, it opens right after login.
  useEffect(() => {
    const receive = url => {
      const target = parseLink(url);
      if (target) setPendingLink(target);
    };
    Linking.getInitialURL().then(receive).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => receive(url));
    return () => subscription.remove();
  }, []);
  const signedIn = shown === 'home';
  useEffect(() => {
    if (!signedIn) return undefined;
    openPendingLink();
    return onPendingLink(openPendingLink);
  }, [signedIn]);

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
        ) : <CityContext.Provider value={cityValue}><MyListsProvider><MySpotsProvider><SavedCollectionsProvider><View style={styles.app} onAccessibilityEscape={escapeBack}><NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={() => { if (signedIn) openPendingLink(); }}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {shown === 'home' ? (
              <>
                <Stack.Screen name="Main" component={MainTabs} options={crossDissolve} />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: reduceMotion ? 'none' : 'default' }} />
                <Stack.Screen name="ListDetails" component={ListDetailsSheet} options={bottomSheet} />
                <Stack.Screen name="AddToList" component={AddToListSheet} options={bottomSheet} />
                <Stack.Screen name="Note" component={NoteSheet} options={bottomSheet} />
                <Stack.Screen name="Sharing" component={SharingSheet} options={bottomSheet} />
                <Stack.Screen name="Report" component={ReportSheet} options={bottomSheet} />
                <Stack.Screen name="EditProfile" component={EditProfileSheet} options={bottomSheet} />
                <Stack.Screen name="CitySelection" component={CitySelectionScreen} options={{ animation: reduceMotion ? 'none' : 'default' }} />
              </>
            ) : shown === 'city' ? (
              // Signed in but no city yet: this is the only screen there is, so no tab, gesture or link reaches the app.
              <Stack.Screen name="ChooseCity" component={CitySelectionScreen} options={crossDissolve} />
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} options={crossDissolve} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer></View></SavedCollectionsProvider></MySpotsProvider></MyListsProvider></CityContext.Provider>}
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
