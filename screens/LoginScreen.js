// screens/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const navigation = useNavigation();
  
  // States for email, password, and loading
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Shows spinner while logging in

  // Function to validate email format with regex
  const validateEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/;
    return regex.test(email);
  };

  // Handle the login process
  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    // Check for empty fields
    if (!normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true); // Show loading spinner

    try {
      await login(normalizedEmail, password);
      // Success handled by auth state listener in App.js
    } catch (error) {
      console.error('Login failed:', error);

      // Handle specific Firebase errors
      let errorMessage = 'Login failed. Please try again.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please check your credentials.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid.';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false); // Hide loading spinner
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      {/* App logo and tagline */}
      <Text style={styles.logoText}>SznLuv</Text>
      <Text style={styles.taglineText}>The right date, every season</Text>

      {/* Email input field */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#AAAAAA"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email"
      />

      {/* Password input field */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#AAAAAA"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Password"
      />

      {/* Login button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading} // Disable button while loading
        accessibilityLabel="Login"
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      {/* Link to navigate to Sign-Up screen */}
      <TouchableOpacity
        style={styles.signupContainer}
        onPress={() => navigation.navigate('SignUp')}
        accessibilityLabel="Navigate to Sign Up"
      >
        <Text style={styles.signupText}>
          Don't have an account?{' '}
          <Text style={styles.signupLinkText}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles for LoginScreen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F4EF', // Light background color for a welcoming feel
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30, // Horizontal padding for content
  },
  logoText: {
    fontSize: 32, // Large font size for logo
    fontWeight: 'bold',
    color: '#000000', // Black for contrast
    marginBottom: 8,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 16,
    color: '#4F4F4F', // Grey for subtle contrast
    marginBottom: 40, // Space below tagline
    textAlign: 'center',
  },
  input: {
    width: '100%', // Full width of the screen
    backgroundColor: '#FFFFFF', // White background for input fields
    borderColor: '#000000', // Black border for visibility
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15, // Padding inside text inputs
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000', // Black text for readability
    marginBottom: 20, // Space between input fields
  },
  button: {
    width: '100%',
    backgroundColor: '#000000', // Black button for high contrast
    paddingVertical: 12, // Vertical padding for button text
    borderRadius: 10, // Rounded corners for button
    alignItems: 'center',
    marginTop: 10, // Space above button
  },
  buttonText: {
    color: '#FFFFFF', // White text for contrast
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    marginTop: 20, // Space above the sign-up link
  },
  signupText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  signupLinkText: {
    color: '#FFC0CB', // Pink for emphasis on link text
    textDecorationLine: 'underline', // Underline to indicate link
  },
});