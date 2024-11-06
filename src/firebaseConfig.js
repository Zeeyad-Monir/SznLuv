// src/firebaseConfig.js

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC5v8gFGRT4Fcuts0oGAxr6_lwShNhT71g",
  authDomain: "sznluv.firebaseapp.com",
  projectId: "sznluv",
  storageBucket: "sznluv.firebasestorage.app",
  messagingSenderId: "835641463462",
  appId: "1:835641463462:web:81e6f18af7a605cabfda67",
  measurementId: "G-98B5GBKKB7"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
