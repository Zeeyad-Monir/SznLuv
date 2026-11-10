// firebaseConfig.js

// Import Firebase modules
import { initializeApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getAuth,
  connectAuthEmulator,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Import Firebase Storage

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyC5v8gFGRT4Fcuts0oGAxr6_lwShNhT71g",
  authDomain: "sznluv.firebaseapp.com",
  projectId: "sznluv",
  storageBucket: "sznluv.appspot.com", // Ensure this is correctly set
  messagingSenderId: "835641463462",
  appId: "1:835641463462:web:81e6f18af7a605cabfda67",
  measurementId: "G-98B5GBKKB7"
};

// Development only: EXPO_PUBLIC_FIREBASE_EMULATOR=1 points the app at the local Firebase emulators
// (npm run emulators) instead of the live project. It runs as a separately named Firebase app, so the
// saved sign-in for the real project is neither replaced nor used while testing.
const useEmulator = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
const appName = useEmulator ? 'emulator' : '[DEFAULT]';
const appConfig = useEmulator ? { ...firebaseConfig, projectId: 'demo-sznluv' } : firebaseConfig;

// Initialize Firebase
const existingApp = getApps().find(candidate => candidate.name === appName);
const app = existingApp ?? initializeApp(appConfig, appName);

// Initialize Firebase services
function initializeAuthentication() {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    if (error.code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
}
export const auth = initializeAuthentication();
export const db = getFirestore(app);

if (useEmulator && !globalThis.__sznluvEmulatorConnected) {
  globalThis.__sznluvEmulatorConnected = true; // Fast Refresh re-runs this file; connecting twice throws
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
export const storage = getStorage(app); // Initialize and export Firebase Storage

// Authentication functions
export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const register = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};