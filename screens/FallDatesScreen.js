// screens/FallDatesScreen.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FallDatesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Fall Dates Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFA500', // Orange background for Fall
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF', // White text
    fontSize: 24,
    fontWeight: 'bold',
  },
});
