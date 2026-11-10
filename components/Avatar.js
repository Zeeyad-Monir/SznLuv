// A person's initial on their chosen colour.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DEFAULT_AVATAR_COLOUR } from '../services/profiles';

export default function Avatar({ username, color, size = 44 }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || DEFAULT_AVATAR_COLOUR }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }, (!color || color === DEFAULT_AVATAR_COLOUR) && styles.onRed]} accessible={false}>{(username || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#333333', fontWeight: '800' },
  onRed: { color: '#FFFFFF' },
});
