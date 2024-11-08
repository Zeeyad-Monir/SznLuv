// screens/SignUpScreen.js

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
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, one letter and one number
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return regex.test(password);
  };

  const handleSignUp = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Input Validation
    if (!normalizedUsername || !normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    if (normalizedUsername.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and include both letters and numbers.'
      );
      return;
    }

    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const usernameRef = doc(db, 'usernames', normalizedUsername);
        const usernameSnap = await transaction.get(usernameRef);

        if (usernameSnap.exists()) {
          throw new Error('Username already taken');
        }

        const userCredential = await register(normalizedEmail, password);
        const user = userCredential.user;

        transaction.set(usernameRef, {
          uid: user.uid,
          email: normalizedEmail,
        });
      });

      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Registration failed:', error);
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
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F4EF" />

      <Text style={styles.logoText}>SznLuv</Text>
      <Text style={styles.taglineText}>The right date, every season</Text>

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

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading}
        accessibilityLabel="Sign Up"
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginContainer}
        onPress={() => navigation.navigate('Login')}
        accessibilityLabel="Navigate to Login"
      >
        <Text style={styles.loginText}>
          Already have an account?{' '}
          <Text style={styles.loginLinkText}>Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 16,
    color: '#4F4F4F',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    marginBottom: 20,
  },
  errorText: {
    width: '100%',
    color: '#FF0000',
    marginBottom: 10,
    textAlign: 'left',
  },
  button: {
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  loginLinkText: {
    color: '#FFC0CB',
    textDecorationLine: 'underline',
  },
});
