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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login } from '../firebaseConfig';
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
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#AAAAAA"
          value={email}
          onChangeText={(text) => setEmail(text)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => {
            // Focus on password field when email is submitted
            passwordRef.current?.focus();
          }}
          blurOnSubmit={false}
          accessibilityLabel="Email"
        />
      </View>

      {/* Password input field */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#AAAAAA"
          secureTextEntry
          value={password}
          onChangeText={(text) => setPassword(text)}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          accessibilityLabel="Password"
        />
      </View>

      {/* Login button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading} // Disable button while loading
        accessibilityLabel="Login"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
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
    fontSize: 50, // Large font size for logo
    fontWeight: 'bold',
    color: '#323232', // Black for contrast
    marginBottom: 8,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 16,
    color: '#323232',
    marginBottom: 40, // Space below tagline
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#323232',
    borderColor: '#323232',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10, // Adjust padding based on platform
    fontSize: 16,
    color: '#FFFFFF', // White text for readability
  },
  button: {
    width: '100%',
    backgroundColor: '#FF9FD2', // Pink button for high contrast
    paddingVertical: 15, // Vertical padding for button text
    borderRadius: 10, // Rounded corners for button
    alignItems: 'center',
    marginTop: 20, // Space above button
  },
  buttonText: {
    color: '#FFFFFF', // White text for contrast
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    marginTop: 25, // Space above the sign-up link
  },
  signupText: {
    fontSize: 14,
    color: '#323232',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  signupLinkText: {
    color: '#FF9FD2', // Pink for emphasis on link text
    textDecorationLine: 'underline', // Underline to indicate link
    fontWeight: 'bold',
  },
});
