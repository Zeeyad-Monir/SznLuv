// SCREENS/LOGINSCREEN.JS
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 


// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and hooks from React
import React, { useState } from 'react';

// Importing React Native components and APIs
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

// Importing navigation hook to navigate between screens
import { useNavigation } from '@react-navigation/native';

// Importing Firebase authentication and database functions
import { login } from '../firebaseConfig';
import { firebaseErrorMessage } from '../services/firebaseErrors';

// =========================
// COMPONENT DEFINITION
// =========================

/**
 * LoginScreen Component
 * 
 * This component provides a user interface for users to log into the application.
 * It includes input fields for email and password, a login button, and a navigation link to the Sign-Up screen.
 * The component handles user authentication using Firebase and provides feedback during the login process.
 */
export default function LoginScreen() {
  // Initializing navigation hook to enable screen navigation
  const navigation = useNavigation();

  // =========================
  // STATE VARIABLES SECTION
  // =========================

  // State to store the user's email input
  const [email, setEmail] = useState(''); // Stores the user's email input

  // State to store the user's password input
  const [password, setPassword] = useState(''); // Stores the user's password input

  // State to manage the visibility of the loading spinner during login
  const [loading, setLoading] = useState(false); // Controls the visibility of the loading spinner

  // =========================
  // VALIDATION FUNCTIONS SECTION
  // =========================

  /**
   * validateEmail Function
   * 
   * Validates the format of the provided email using a regular expression.
   * Ensures that the email entered by the user adheres to standard email formatting.
   *
   * @param {string} email - The email address to validate.
   * @returns {boolean} - Returns true if the email format is valid, otherwise false.
   */
  const validateEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/; // Simple regex for basic email validation
    return regex.test(email);
  };

  // =========================
  // EVENT HANDLERS SECTION
  // =========================

  /**
   * handleLogin Function
   * 
   * Handles the login process when the user presses the "Log In" button.
   * This function performs several steps to authenticate the user:
   * 1. Normalizes the email by trimming whitespace and converting to lowercase.
   * 2. Validates that both email and password fields are filled.
   * 3. Checks if the email format is valid.
   * 4. Initiates the login process using Firebase authentication.
   * 5. Handles any errors that occur during the login process.
   */
  const handleLogin = async () => {
    // Step 1: Normalize the email input by trimming whitespace and converting to lowercase
    const normalizedEmail = email.trim().toLowerCase(); // Normalize email input

    // Step 2: Check for empty email or password fields
    if (!normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.'); // Alert the user to fill all fields
      return; // Exit the function if fields are empty
    }

    // Step 3: Validate the email format using the validateEmail function
    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.'); // Alert the user about invalid email format
      return; // Exit the function if email format is invalid
    }

    // Step 4: Show the loading spinner to indicate an ongoing login process
    setLoading(true); // Show loading spinner

    try {
      // Attempt to log in using Firebase authentication with the normalized email and password
      await login(normalizedEmail, password);
      // If successful, Firebase auth state listener (usually set up in App.js) will handle navigation
    } catch (error) {
      // Log the error to the console for debugging purposes
      console.error('Login failed:', error); // Log the error for debugging purposes

      // Step 5: Handle specific Firebase authentication errors and provide appropriate feedback to the user
      const errorMessage = firebaseErrorMessage(error, 'login');
      Alert.alert('Login Failed', errorMessage); // Display the appropriate error message to the user

      // Step 6: Hide the spinner on failure only. On success it keeps spinning until App swaps to the signed-in screens.
      setLoading(false);
    }
  };

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.container}>
      {/* 
        StatusBar Configuration
        - barStyle: Sets the text color of the status bar.
        - backgroundColor: Sets the background color of the status bar.
      */}
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      {/* 
        App Logo and Tagline 
        Provides branding and a brief description of the app's purpose.
      */}
      <Text style={styles.logoText}>SznLuv</Text>
      <Text style={styles.taglineText}>The right date, every season</Text>

      {/* 
        EMAIL INPUT FIELD 
        Allows the user to enter their email address.
        - style: Styling applied to the TextInput.
        - placeholder: Placeholder text for guidance.
        - placeholderTextColor: Color of the placeholder text.
        - value: Binds the TextInput to the email state.
        - onChangeText: Updates the email state on text change.
        - keyboardType: Brings up the email-optimized keyboard.
        - autoCapitalize: Prevents automatic capitalization.
        - accessibilityLabel: Accessibility label for screen readers.
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
        PASSWORD INPUT FIELD 
        Allows the user to enter their password securely.
        - style: Styling applied to the TextInput.
        - placeholder: Placeholder text for guidance.
        - placeholderTextColor: Color of the placeholder text.
        - secureTextEntry: Masks the input for password security.
        - value: Binds the TextInput to the password state.
        - onChangeText: Updates the password state on text change.
        - accessibilityLabel: Accessibility label for screen readers.
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
        LOGIN BUTTON 
        Initiates the login process when pressed.
        - style: Styling applied to the TouchableOpacity.
        - onPress: Handler for login action.
        - disabled: Disables the button while loading to prevent multiple submissions.
        - accessibilityLabel: Accessibility label for screen readers.
      */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin} // Calls the handleLogin function on press
        disabled={loading} // Disables the button while loading to prevent multiple submissions
        accessibilityLabel="Login" // Accessibility label for screen readers
      >
        {loading ? (
          // Shows a spinner while loading
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          // Displays 'Log In' text when not loading
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      {/* 
        SIGN-UP NAVIGATION LINK 
        Allows users without an account to navigate to the registration screen.
        - style: Styling applied to the TouchableOpacity.
        - onPress: Navigates to the 'SignUp' screen on press.
        - accessibilityLabel: Accessibility label for screen readers.
      */}
      <TouchableOpacity
        style={styles.signupContainer}
        onPress={() => navigation.navigate('SignUp')} // Navigates to the 'SignUp' screen on press
        hitSlop={12}
        accessibilityRole="button"
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

// =========================
// STYLESHEET SECTION
// =========================

/**
 * Styles for LoginScreen components
 * 
 * This stylesheet defines the visual appearance of the LoginScreen, including layout, colors, fonts, and spacing.
 */
const styles = StyleSheet.create({
  // Container covering the entire screen
  container: {
    flex: 1, // Takes up the full available space
    backgroundColor: '#F9F4EF', // Light background color for a welcoming feel
    alignItems: 'center', // Centers children horizontally
    justifyContent: 'center', // Centers children vertically
    paddingHorizontal: 30, // Horizontal padding for content
  },
  
  // Styling for the app logo text
  logoText: {
    fontSize: 50, // Large font size for logo
    fontWeight: 'bold', // Bold font weight for emphasis
    color: '#323232', // Dark color for contrast
    marginBottom: 8, // Space below the logo
    textAlign: 'center', // Centers the text
  },
  
  // Styling for the tagline text below the logo
  taglineText: {
    fontSize: 16, // Font size for the tagline
    color: '#323232', // Dark color for readability
    marginBottom: 40, // Space below the tagline
    textAlign: 'center', // Centers the text
    fontWeight: 'bold', // Bold font weight for emphasis
  },
  
  // Styling for the input fields (email and password)
  input: {
    width: '100%', // Full width input field
    backgroundColor: '#323232', // Dark background for input fields
    borderColor: '#323232', // Border color matching the background
    borderWidth: 1, // Border width
    borderRadius: 8, // Rounded corners for the input field
    paddingHorizontal: 30, // Horizontal padding inside the input
    paddingVertical: 20, // Vertical padding inside the input
    fontSize: 16, // Font size for user input
    color: '#FFFFFF', // White text color for readability
    marginBottom: 10, // Space below each input field
  },
  
  // Styling for the login button
  button: {
    width: '100%', // Full width button
    backgroundColor: '#FF9FD2', // Distinctive color for the button
    paddingVertical: 20, // Vertical padding for the button
    borderRadius: 10, // Rounded corners for the button
    alignItems: 'center', // Centers the button content horizontally
    marginTop: 30, // Space above the button
  },
  
  // Styling for the text inside the login button
  buttonText: {
    color: '#FFFFFF', // White text for contrast against button background
    fontSize: 18, // Font size for button text
    fontWeight: 'bold', // Bold text for emphasis
  },
  
  // Styling for the sign-up navigation link container
  signupContainer: {
    marginTop: 30, // Space above the sign-up link
  },
  
  // Styling for the sign-up prompt text
  signupText: {
    fontSize: 14, // Font size for the sign-up prompt
    color: '#323232', // Dark color for readability
    textAlign: 'center', // Centers the text
    fontFamily: "Gramatika-Black", // Custom font family
    fontWeight: 'bold', // Bold text for emphasis
  },
  
  // Styling for the 'Sign Up' link text within the sign-up prompt
  signupLinkText: {
    color: '#FF9FD2', // Highlighted color for the 'Sign Up' link
    textDecorationLine: 'underline', // Underlines the link text to indicate it's clickable
    fontFamily: "Gramatika-Black", // Custom font family
    fontWeight: 'bold', // Bold text for emphasis
  },
});