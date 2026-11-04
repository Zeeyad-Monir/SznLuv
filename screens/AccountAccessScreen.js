import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { auth, logout } from '../firebaseConfig';
import { normalizeUsername, validUsername, saveProfile } from '../services/accounts';
import { firebaseErrorMessage } from '../services/firebaseErrors';

// Accounts left incomplete by an interrupted signup can finish setup after login.
export default function AccountAccessScreen({ status, message, onRetry }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const finishSetup = async () => {
    const normalized = normalizeUsername(username);
    if (!validUsername(normalized)) {
      setError('Use 3–40 letters, numbers, dots, underscores or hyphens.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveProfile(auth.currentUser, normalized);
      await logout();
    } catch (failure) {
      console.error('Account recovery failed:', { code: failure.code });
      setError(firebaseErrorMessage(failure, 'signup'));
    } finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true);
    try { await logout(); }
    catch (failure) { setError(firebaseErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{status === 'missing' ? 'Finish account setup' : 'Account access'}</Text>
      <Text style={styles.message}>{message || 'Your account exists, but its profile is incomplete. Choose a username to finish setup, then log in.'}</Text>
      {status === 'missing' && <>
        <TextInput accessibilityLabel="Username" placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" editable={!busy} style={styles.input} />
        <TouchableOpacity onPress={finishSetup} disabled={busy} style={styles.button}><Text>Finish setup and return to Login</Text></TouchableOpacity>
      </>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {busy ? <ActivityIndicator /> : <>
        {status !== 'missing' && <TouchableOpacity onPress={onRetry} style={styles.button}><Text>Retry</Text></TouchableOpacity>}
        <TouchableOpacity onPress={signOut} style={styles.button}><Text>Sign Out</Text></TouchableOpacity>
      </>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#F9F4EF' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  message: { fontSize: 16, marginBottom: 16 },
  input: { padding: 16, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
  button: { padding: 18, alignItems: 'center', backgroundColor: '#FF9FD2', borderRadius: 8, marginVertical: 6 },
  error: { color: '#B00020', marginVertical: 12 },
});
