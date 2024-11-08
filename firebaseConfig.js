// firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sznluv.firebaseapp.com",
  projectId: "sznluv",
  storageBucket: "sznluv.firebasestorage.app",
  messagingSenderId: "835641463462",
  appId: "1:835641463462:web:81e6f18af7a605cabfda67",
  measurementId: "G-98B5GBKKB7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

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
