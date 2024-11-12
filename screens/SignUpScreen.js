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
import { db, register } from '../firebaseConfig';
import { doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';

export default function SignUpScreen() {
  const navigation = useNavigation();
  
  // States for input fields and loading state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false); // Shows a spinner during sign-up

  // Simple email validation using regex
  const validateEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/;
    return regex.test(email);
  };

  // Password validation: at least 8 characters, one letter, and one number
  const validatePassword = (password) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return regex.test(password);
  };

  // Function to handle the sign-up process
  const handleSignUp = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Basic input validation checks
    if (!normalizedUsername || !normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    // Validate username length
    if (normalizedUsername.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
      return;
    }

    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Check password strength
    if (!validatePassword(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and include both letters and numbers.'
      );
      return;
    }

    setLoading(true); // Show loading indicator during registration

    try {
      // First transaction: check if username is available
      const usernameAvailable = await runTransaction(db, async (transaction) => {
        const usernameRef = doc(db, 'usernames', normalizedUsername);
        const usernameSnap = await transaction.get(usernameRef);

        if (usernameSnap.exists()) {
          return false; // Username is taken
        } else {
          return true; // Username is available
        }
      });

      if (!usernameAvailable) {
        Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      // Register the user in Firebase Authentication
      const userCredential = await register(normalizedEmail, password);
      const user = userCredential.user;

      // Second transaction: save the username in Firestore
      await runTransaction(db, async (transaction) => {
        const usernameRef = doc(db, 'usernames', normalizedUsername);
        const usernameSnap = await transaction.get(usernameRef);

        if (usernameSnap.exists()) {
          throw new Error('Username already taken'); // Handle conflict if username is taken
        } else {
          transaction.set(usernameRef, {
            uid: user.uid,
            email: normalizedEmail,
          });
        }
      });

      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Login'); // Redirect to login screen
    } catch (error) {
      console.error('Registration failed:', error);
      
      // Error handling with specific messages
      let errorMessage = 'Registration failed. Please try again.';
      if (error.message === 'Username already taken') {
        errorMessage = 'This username is already taken. Please choose another one.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      }
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      {/* App logo and tagline */}
      <Text style={styles.logoText}>SznLuv</Text>
      <Text style={styles.taglineText}>The right date, every season</Text>

      {/* Username input field */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#AAAAAA"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        accessibilityLabel="Username"
      />
      {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

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
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

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
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      {/* Sign-Up button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading} // Disable button when loading
        accessibilityLabel="Sign Up"
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      {/* Link to Login screen */}
      <TouchableOpacity
        style={styles.loginContainer}
        onPress={() => navigation.navigate('Login')}
        accessibilityLabel="Navigate to Login"
      >
        <Text style={styles.loginText}>
          Already have an account?{' '}
          <Text style={styles.loginLinkText}>Log In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Style definitions for SignUpScreen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F4EF', // Light background for a welcoming feel
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30, // Padding for inner content
  },
  logoText: {
    fontSize: 50, // Large font size for logo
    fontWeight: 'bold',
    color: '#323232',
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
  input: {
    width: '100%', // Full width input
    backgroundColor: '#323232',
    borderColor: '#323232', 
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 30,
    paddingVertical: 20,
    fontSize: 16,
    color: '#FFFFFF', // Black text for readability
    marginBottom: 10,
  },
  errorText: {
    width: '100%',
    color: '#FF0000', // Red for error text
    marginBottom: 10,
    textAlign: 'left',
  },
  button: {
    width: '100%',
    backgroundColor: '#FF9FD2', // Black button for contrast
    paddingVertical: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,


  },
  buttonText: {
    color: '#FFFFFF', // White text for button
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    marginTop: 30,
  },
  loginText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#323232',
    textAlign: 'center',
  },
  loginLinkText: {
    fontWeight: 'bold',
    color: '#FF9FD2', // Pink for emphasis
    textDecorationLine: 'underline',
  },
});