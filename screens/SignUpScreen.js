// screens/SignUpScreen.js
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

// SIGNUP/AUTHENTICATION
// Importing the Firestore database instance and the register & logout functions for Firebase Authentication
import { db, register, logout } from '../firebaseConfig';
// Importing Firestore functions for document manipulation and transactional operations
import { doc, setDoc, runTransaction } from 'firebase/firestore';

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
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; // Regex for password strength
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
    // Normalize inputs by trimming whitespace and converting to lowercase
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // ============================
    // SIGNUP: INPUT VALIDATION
    // ============================

    // Check if any of the input fields are empty
    if (!normalizedUsername || !normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.'); // Alert user to fill all fields
      return; // Exit the function early
    }

    // Check if the username meets the minimum length requirement
    if (normalizedUsername.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
      return; // Exit the function early
    }

    // Validate the email format using the validateEmail function
    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return; // Exit the function early
    }

    // Validate the password strength using the validatePassword function
    if (!validatePassword(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and include both letters and numbers.'
      );
      return; // Exit the function early
    }

    // Set the loading state to true to display the loading indicator
    setLoading(true);

    try {
      // ============================
      // SIGNUP: USERNAME AVAILABILITY CHECK
      // ============================

      /**
       * Check if the desired username is already taken.
       * Uses a Firestore transaction to ensure atomicity.
       */
      const usernameAvailable = await runTransaction(db, async (transaction) => {
        // Reference to the 'usernames' collection document for the normalized username
        const usernameRef = doc(db, 'usernames', normalizedUsername);
        // Attempt to get the document snapshot
        const usernameSnap = await transaction.get(usernameRef);

        if (usernameSnap.exists()) {
          // If the document exists, the username is already taken
          return false;
        } else {
          // If the document does not exist, the username is available
          return true;
        }
      });

      // If the username is not available, alert the user and stop the registration process
      if (!usernameAvailable) {
        Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        setLoading(false); // Hide the loading indicator
        return; // Exit the function early
      }

      // ============================
      // AUTHENTICATION: REGISTER USER
      // ============================

      /**
       * Register the user using Firebase Authentication with the provided email and password.
       * The register function handles Firebase's createUserWithEmailAndPassword internally.
       */
      const userCredential = await register(normalizedEmail, password);
      const user = userCredential.user; // Extract the user object from the credential

      // ============================
      // SIGNUP: STORE USERNAME IN FIRESTORE
      // ============================

      /**
       * After successful authentication, store the username in the Firestore database.
       * This ensures that usernames are unique and associated with user UIDs.
       */
      await runTransaction(db, async (transaction) => {
        const usernameRef = doc(db, 'usernames', normalizedUsername); // Reference to the username document
        const usernameSnap = await transaction.get(usernameRef); // Get the document snapshot

        if (usernameSnap.exists()) {
          // If the username was taken between the initial check and now, throw an error
          throw new Error('Username already taken');
        } else {
          // If the username is still available, set the document with user details
          transaction.set(usernameRef, {
            uid: user.uid, // Store the user's UID
            email: normalizedEmail, // Store the user's email
          });
        }
      });

      // **New Step: Store Username in the 'users' Collection**
      /**
       * Create a document in the 'users' collection with the user's UID as the document ID.
       * This document will store the username and any other user-specific information.
       */
      await setDoc(doc(db, 'users', user.uid), {
        username: normalizedUsername, // Store the username
        email: normalizedEmail,       // Store the email (optional, already in 'usernames' collection)
        createdAt: new Date(),        // Timestamp of account creation
        // Add any additional fields you want to store for the user here
      });

      // ============================
      // SIGNUP: SIGN OUT AND NAVIGATE
      // ============================

      /**
       * Since Firebase automatically signs in the user upon successful registration,
       * we need to sign them out before navigating to the Login screen.
       */
      await logout(); // Sign out the user

      // Navigate the user to the Login screen
      //navigation.navigate('Login'); 

      // ============================
      // SIGNUP: SUCCESS FEEDBACK
      // ============================

      // Inform the user of successful registration after navigating
      Alert.alert('Success', 'Account created successfully! Please log in with your credentials.');

    } catch (error) {
      // Log the error for debugging purposes
      console.error('Registration failed:', error);
      
      // ============================
      // AUTHENTICATION: ERROR HANDLING
      // ============================

      /**
       * Handle different types of errors and provide user-friendly messages.
       * This includes errors from Firebase Authentication and Firestore transactions.
       */
      let errorMessage = 'Registration failed. Please try again.'; // Default error message

      // Check for specific error messages or codes to provide detailed feedback
      if (error.message === 'Username already taken') {
        errorMessage = 'This username is already taken. Please choose another one.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      }

      // Display the appropriate error message to the user
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      // Ensure that the loading indicator is hidden regardless of success or failure
      setLoading(false);
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

      {/* 
        **Removed: Link to Login Screen**
        Previously, this TouchableOpacity allowed users to navigate to the Login screen manually.
        Since we now navigate automatically after sign-up, we remove this manual navigation link.
      */}
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