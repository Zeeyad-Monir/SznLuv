// screens/SignUpScreen.js
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 

// STYLING DONE

import React, { useState, useContext, useRef } from 'react';
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

import { AuthContext } from '../contexts/AuthContext';
import { auth } from '../firebaseConfig';
import { createAccountWithProfile, normalizeUsername, validUsername } from '../services/accounts';
import { firebaseErrorMessage } from '../services/firebaseErrors';

/**
 * SignUpScreen Component
 * 
 * This component renders the user interface for the sign-up screen and handles the 
 * user registration process, including input validation, username availability check, 
 * and Firebase Authentication integration.
 */
export default function SignUpScreen() {
  // useNavigation hook provides navigation functionality to navigate between screens
  const navigation = useNavigation();
  const { setRegistering, setRegistrationError } = useContext(AuthContext);
  const submitting = useRef(false);
  
  // ============================
  // SIGNUP: STATE MANAGEMENT
  // ============================
  
  // State to hold the value of the username input field
  const [username, setUsername] = useState('');
  // State to hold any error message related to the username input
  const [usernameError, setUsernameError] = useState('');
  
  // State to hold the value of the email input field
  const [email, setEmail] = useState('');
  // State to hold any error message related to the email input
  const [emailError, setEmailError] = useState('');
  
  // State to hold the value of the password input field
  const [password, setPassword] = useState('');
  // State to hold any error message related to the password input
  const [passwordError, setPasswordError] = useState('');
  
  // State to manage the loading indicator visibility during sign-up process
  const [loading, setLoading] = useState(false); // Shows a spinner during sign-up

  // ============================
  // VALIDATION FUNCTIONS
  // ============================

  /**
   * validateEmail
   * 
   * Validates the email format using a regular expression.
   * Ensures the email follows the standard email pattern.
   * 
   * @param {string} email - The email address to validate
   * @returns {boolean} - Returns true if email is valid, otherwise false
   */
  const validateEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/; // Regular expression for basic email validation
    return regex.test(email);
  };

  /**
   * validatePassword
   * 
   * Validates the password strength.
   * Ensures the password has at least 8 characters, includes at least one letter and one number.
   * 
   * @param {string} password - The password to validate
   * @returns {boolean} - Returns true if password meets criteria, otherwise false
   */
  const validatePassword = (password) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // Regex for password strength
    return regex.test(password);
  };

  // ============================
  // SIGNUP FUNCTION
  // ============================

  /**
   * handleSignUp
   * 
   * Handles the entire sign-up process including:
   * - Input validation
   * - Username availability check
   * - Firebase Authentication registration
   * - Storing the username in Firestore
   * - Signing out and navigating to LoginScreen
   * - Error handling and user feedback
   */
  const handleSignUp = async () => {
    if (submitting.current) return;
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedUsername || !normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    if (!validUsername(normalizedUsername)) {
      Alert.alert('Invalid Username', 'Use 3–40 letters, numbers, dots, underscores or hyphens.');
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long and include letters and numbers.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setRegistrationError(null);
    setRegistering(true);
    try {
      await createAccountWithProfile({ email: normalizedEmail, password, username: normalizedUsername });
      navigation.navigate('Login');
      Alert.alert('Success', 'Account created successfully! Please log in with your credentials.');
    } catch (error) {
      console.error('Registration failed:', { code: error.code, stage: error.stage, cleanupErrors: error.cleanupErrors });
      const message = firebaseErrorMessage(error, 'signup');
      if (auth.currentUser) setRegistrationError(message);
      Alert.alert('Registration Failed', message);
    } finally {
      setRegistering(false);
      setLoading(false);
      submitting.current = false;
    }
  };

  // ============================
  // RENDERING THE UI
  // ============================

  /**
   * The component returns a View that contains all the UI elements for the sign-up screen,
   * including input fields for username, email, and password, as well as a button for signing up
   * and navigation to the login screen.
   */
  return (
    <View style={styles.container}>
      {/* Configures the status bar appearance */}
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      {/* 
        App Logo 
        Displays the application name prominently on the sign-up screen.
      */}
      <Text style={styles.logoText}>SznLuv</Text>

      {/* 
        Tagline 
        Provides a brief description or slogan for the app.
      */}
      <Text style={styles.taglineText}>The right date, every season</Text>

      {/* 
        Username Input Field 
        Allows the user to enter their desired username.
      */}
      <TextInput
        style={styles.input}
        placeholder="Username" // Placeholder text inside the input field
        placeholderTextColor="#AAAAAA" // Color of the placeholder text
        value={username} // Binds the input value to the username state
        onChangeText={setUsername} // Updates the username state on text change
        autoCapitalize="none" // Disables auto-capitalization
        accessibilityLabel="Username" // Accessibility label for screen readers
      />
      {/* 
        Username Error Message 
        Displays an error message if there's an issue with the username input.
      */}
      {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

      {/* 
        Email Input Field 
        Allows the user to enter their email address.
      */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#AAAAAA"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address" // Specifies the email keyboard layout
        autoCapitalize="none"
        accessibilityLabel="Email"
      />
      {/* 
        Email Error Message 
        Displays an error message if there's an issue with the email input.
      */}
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      {/* 
        Password Input Field 
        Allows the user to enter their password securely.
      */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#AAAAAA"
        secureTextEntry // Hides the password input for security
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Password"
      />
      {/* 
        Password Error Message 
        Displays an error message if there's an issue with the password input.
      */}
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      {/* 
        Sign-Up Button 
        Triggers the handleSignUp function when pressed.
        Shows a loading spinner if the loading state is true.
      */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignUp} // Function to handle sign-up
        disabled={loading} // Disables the button when loading to prevent multiple submissions
        accessibilityLabel="Sign Up" // Accessibility label for screen readers
      >
        {loading ? (
          // Displays a loading spinner while the sign-up process is ongoing
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          // Displays the "Sign Up" text when not loading
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading} style={{ marginTop: 24 }}>
        <Text>Already have an account? Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Stylesheet for SignUpScreen components.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1, // Takes up the full height of the screen
    backgroundColor: '#F9F4EF', // Light background color for a welcoming feel
    alignItems: 'center', // Centers items horizontally
    justifyContent: 'center', // Centers items vertically
    paddingHorizontal: 30, // Horizontal padding for inner content
  },
  logoText: {
    fontSize: 50, // Large font size for the app logo
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#323232', // Dark color for the logo text
    marginBottom: 8, // Space below the logo
    textAlign: 'center', // Centers the text
  },
  taglineText: {
    fontSize: 16, // Medium font size for the tagline
    color: '#323232', // Dark color for the tagline text
    marginBottom: 40, // Space below the tagline
    textAlign: 'center', // Centers the text
    fontWeight: 'bold', // Bold font weight for emphasis
  },
  input: {
    width: '100%', // Full width input fields
    backgroundColor: '#323232', // Dark background for input fields
    borderColor: '#323232', // Border color matching the background
    borderWidth: 1, // Border width of 1
    borderRadius: 8, // Rounded corners for the input fields
    paddingHorizontal: 30, // Horizontal padding inside the input
    paddingVertical: 20, // Vertical padding inside the input
    fontSize: 16, // Font size for input text
    color: '#FFFFFF', // White text color for readability
    marginBottom: 10, // Space below each input field
  },
  errorText: {
    width: '100%', // Full width for error messages
    color: '#FF0000', // Red color to indicate errors
    marginBottom: 10, // Space below the error message
    textAlign: 'left', // Aligns the text to the left
  },
  button: {
    width: '100%', // Full width button
    backgroundColor: '#FF9FD2', // Pink background color for the button
    paddingVertical: 20, // Vertical padding inside the button
    borderRadius: 10, // Rounded corners for the button
    alignItems: 'center', // Centers content horizontally
    marginTop: 30, // Space above the button
  },
  buttonText: {
    color: '#FFFFFF', // White text color for contrast
    fontSize: 18, // Font size for button text
    fontWeight: 'bold', // Bold font weight for emphasis
  },
  /* 
    **Removed: loginContainer and related styles**
    Since we've removed the manual navigation link to the Login screen, these styles are no longer needed.
  */
});