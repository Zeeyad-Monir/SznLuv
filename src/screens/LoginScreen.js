// screens/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login } from '../firebaseConfig';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState(''); // Assuming username is used for authentication
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Implement your login logic here
    // If using email instead of username, adjust accordingly
    login(username, password).catch((error) => {
      console.error(error);
    });
  };

  return (
    <View style={styles.container}>
      {/* StatusBar configuration */}
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      {/* App Logo */}
      <Text style={styles.logoText}>SznLuv</Text>
      <Text style={styles.taglineText}>The right date, every season</Text>

      {/* Username Input */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#FFFFFF"
        value={username}
        onChangeText={setUsername}
      />

      {/* Password Input */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#FFFFFF"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Login Button */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      {/* Sign-Up Link */}
      <TouchableOpacity
        style={styles.signupContainer}
        onPress={() => navigation.navigate('SignUp')}
      >
        <Text style={styles.signupText}>
          Don't have an account?{' '}
          <Text style={styles.signupLinkText}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F4EF', // Light, soft beige background
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000', // Black color
    fontFamily: 'sans-serif',
    marginBottom: 8,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 16,
    color: '#4F4F4F', // Softer black color
    fontFamily: 'sans-serif',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF', // White background for inputs
    borderColor: '#000000', // Black border
    borderWidth: 1,
    borderRadius: 8, // Rounded edges
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000', // Black text inside
    marginBottom: 20,
  },
  button: {
    width: '100%',
    backgroundColor: '#000000', // Black background
    paddingVertical: 12, // Padding for clickable area
    borderRadius: 10, // Rounded corners
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: '#000000', // Black color for regular text
    textAlign: 'center',
  },
  signupLinkText: {
    color: '#FFC0CB', // Soft pink color
    textDecorationLine: 'underline',
  },
});
