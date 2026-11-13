// A row of rating stars to look at (not to tap): filled, half and empty, in honey amber.
// The number is said once by whatever holds it, so the stars themselves are hidden from screen readers.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { honey } from '../theme';

export default function Stars({ rating = 0, size = 14, gap = 1, style }) {
  const value = Number(rating) || 0;
  return (
    <View style={[styles.row, { gap }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4, 5].map(star => {
        const name = value >= star - 0.25 ? 'star' : value >= star - 0.75 ? 'star-half' : 'star-outline';
        return <Ionicons key={star} name={name} size={size} color={name === 'star-outline' ? honey.dot : honey.star} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
