// What the app shows while it opens: the name and tagline from the login screen, over the app's cream page,
// until the saved sign-in is restored and the pictures are loaded (services/preloadArt.js). It draws no
// picture of its own, so it is there at once.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export default function LaunchScreen() {
  return (
    <View style={styles.page} accessible accessibilityRole="progressbar" accessibilityLabel="Loading SznLuv">
      <Text style={styles.name}>SznLuv</Text>
      <Text style={styles.tagline}>The right date, every season</Text>
      <ActivityIndicator style={styles.spinner} color={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, backgroundColor: colors.page },
  name: { fontSize: 50, fontWeight: 'bold', color: colors.ink, textAlign: 'center' },
  tagline: { marginTop: 8, fontSize: 16, fontWeight: 'bold', color: colors.ink, textAlign: 'center' },
  spinner: { marginTop: 28 },
});
