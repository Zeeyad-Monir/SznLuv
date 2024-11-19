// screens/LoginScreen.js
// STYLING DONE

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

  // LOGIN
  // States for email, password, and loading
  const [email, setEmail] = useState(''); // Stores the user's email input
  const [password, setPassword] = useState(''); // Stores the user's password input
  const [loading, setLoading] = useState(false); // Controls the visibility of the loading spinner

  /**
   * Function to validate the email format using a regular expression.
   * Ensures that the email entered by the user adheres to standard email formatting.
   *
   * @param {string} email - The email address to validate.
   * @returns {boolean} - Returns true if the email format is valid, otherwise false.
   */
  const validateEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/; // Simple regex for basic email validation
    return regex.test(email);
  };

  /**
   * Function to handle the login process.
   * This function performs several steps to authenticate the user:
   * 1. Normalizes the email by trimming whitespace and converting to lowercase.
   * 2. Validates that both email and password fields are filled.
   * 3. Checks if the email format is valid.
   * 4. Initiates the login process using Firebase authentication.
   * 5. Handles any errors that occur during the login process.
   */
  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase(); // Normalize email input

    // Step 1: Check for empty fields
    if (!normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return; // Exit the function if fields are empty
    }

    // Step 2: Validate email format
    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return; // Exit the function if email format is invalid
    }

    setLoading(true); // Show loading spinner to indicate ongoing login process

    try {
      // Step 3: Attempt to log in using Firebase authentication
      await login(normalizedEmail, password);
      // If successful, Firebase auth state listener (usually set up in App.js) will handle navigation
    } catch (error) {
      console.error('Login failed:', error); // Log the error for debugging purposes

      // Step 4: Handle specific Firebase authentication errors
      let errorMessage = 'Login failed. Please try again.'; // Default error message
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please check your credentials.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid.';
      }
      Alert.alert('Login Failed', errorMessage); // Display the appropriate error message to the user
    } finally {
      setLoading(false); // Hide the loading spinner regardless of the outcome
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      {/* 
        App logo and tagline 
        Provides branding and a brief description of the app's purpose.
      */}
      <Text style={styles.logoText}>SznLuv</Text>
      <Text style={styles.taglineText}>The right date, every season</Text>

      {/* 
        LOGIN
        Email input field 
        Allows the user to enter their email address.
      */}
      <TextInput
        style={styles.input}
        placeholder="Email" // Placeholder text for guidance
        placeholderTextColor="#AAAAAA" // Color of the placeholder text
        value={email} // Binds the TextInput to the email state
        onChangeText={setEmail} // Updates the email state on text change
        keyboardType="email-address" // Brings up the email-optimized keyboard
        autoCapitalize="none" // Prevents automatic capitalization
        accessibilityLabel="Email" // Accessibility label for screen readers
      />

      {/* 
        LOGIN
        Password input field 
        Allows the user to enter their password securely.
      */}
      <TextInput
        style={styles.input}
        placeholder="Password" // Placeholder text for guidance
        placeholderTextColor="#AAAAAA" // Color of the placeholder text
        secureTextEntry // Masks the input for password security
        value={password} // Binds the TextInput to the password state
        onChangeText={setPassword} // Updates the password state on text change
        accessibilityLabel="Password" // Accessibility label for screen readers
      />

      {/* 
        LOGIN
        Login button 
        Initiates the login process when pressed.
      */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin} // Calls the handleLogin function on press
        disabled={loading} // Disables the button while loading to prevent multiple submissions
        accessibilityLabel="Login" // Accessibility label for screen readers
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" /> // Shows a spinner while loading
        ) : (
          <Text style={styles.buttonText}>Log In</Text> // Displays 'Log In' text when not loading
        )}
      </TouchableOpacity>

      {/* 
        LOGIN
        Link to navigate to Sign-Up screen 
        Allows users without an account to navigate to the registration screen.
      */}
      <TouchableOpacity
        style={styles.signupContainer}
        onPress={() => navigation.navigate('SignUp')} // Navigates to the 'SignUp' screen on press
        accessibilityLabel="Navigate to Sign Up" // Accessibility label for screen readers
      >
        <Text style={styles.signupText}>
          Don't have an account?{' '}
          <Text style={styles.signupLinkText}>Sign Up</Text> {/* Underlined 'Sign Up' text for emphasis */}
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
    alignItems: 'center', // Centers children horizontally
    justifyContent: 'center', // Centers children vertically
    paddingHorizontal: 30, // Horizontal padding for content
  },
  logoText: {
    fontSize: 50, // Large font size for logo
    fontWeight: 'bold',
    color: '#323232', // Dark color for contrast
    marginBottom: 8, // Space below the logo
    textAlign: 'center', // Centers the text
  },
  taglineText: {
    fontSize: 16, // Font size for the tagline
    color: '#323232', // Dark color for readability
    marginBottom: 40, // Space below the tagline
    textAlign: 'center', // Centers the text
    fontWeight: 'bold',
  },
  input: {
    width: '100%', // Full width input field
    backgroundColor: '#323232', // Dark background for input
    borderColor: '#323232', // Border color matching the background
    borderWidth: 1, // Border width
    borderRadius: 8, // Rounded corners for the input field
    paddingHorizontal: 30, // Horizontal padding inside the input
    paddingVertical: 20, // Vertical padding inside the input
    fontSize: 16, // Font size for user input
    color: '#FFFFFF', // White text color for readability
    marginBottom: 10, // Space below each input field
  },
  button: {
    width: '100%', // Full width button
    backgroundColor: '#FF9FD2', // Distinctive color for the button
    paddingVertical: 20, // Vertical padding for the button
    borderRadius: 10, // Rounded corners for the button
    alignItems: 'center', // Centers the button content horizontally
    marginTop: 30, // Space above the button
  },
  buttonText: {
    color: '#FFFFFF', // White text for contrast against button background
    fontSize: 18, // Font size for button text
    fontWeight: 'bold', // Bold text for emphasis
  },
  signupContainer: {
    marginTop: 30, // Space above the sign-up link
  },
  signupText: {
    fontSize: 14, // Font size for the sign-up prompt
    color: '#323232', // Dark color for readability
    textAlign: 'center', // Centers the text
    fontFamily: "Gramatika-Black", // Custom font family
    fontWeight: 'bold',
  },
  signupLinkText: {
    color: '#FF9FD2', // Highlighted color for the 'Sign Up' link
    textDecorationLine: 'underline', // Underlines the link text to indicate it's clickable
    fontFamily: "Gramatika-Black", // Custom font family
    fontWeight: 'bold',
  },
});
