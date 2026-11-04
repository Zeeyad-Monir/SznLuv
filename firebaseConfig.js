// firebaseConfig.js

// Import Firebase modules
import { initializeApp, getApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

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