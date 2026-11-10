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
import { getStorage, connectStorageEmulator } from 'firebase/storage';

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
export const storage = getStorage(app); // Photos of spots people make (storage.rules)

if (useEmulator && !globalThis.__sznluvEmulatorConnected) {
  globalThis.__sznluvEmulatorConnected = true; // Fast Refresh re-runs this file; connecting twice throws
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectStorageEmulator(storage, emulatorHost, 9199);
}

// Where a stored photo is downloaded from. Loading it this way, with the viewer's sign-in token, means
// Storage checks storage.rules on every load: a photo stops loading for others once its spot is private.
// (A download URL from getDownloadURL would keep working for anyone who ever had it.)
const storageOrigin = useEmulator ? `http://${emulatorHost}:9199` : 'https://firebasestorage.googleapis.com';
export const photoUrl = path => `${storageOrigin}/v0/b/${appConfig.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;

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