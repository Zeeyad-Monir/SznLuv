// "Rate this spot": the reader's own avatar and five empty stars. Tapping a star opens the review sheet
// with that rating already chosen, like rating a place on a map.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../Avatar';
import { honey, spot } from '../theme';

export const starLabel = stars => `${stars} star${stars === 1 ? '' : 's'}`;

export default function RateRow({ uid, username, profile, onRate }) {
  return (
    <View style={styles.row}>
      <Avatar uid={uid} username={username} color={profile?.avatarColor} photoId={profile?.avatarPhotoId} size={40} />
      <View style={styles.body}>
        <Text style={styles.title}>Rate this spot</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(stars => (
            <TouchableOpacity key={stars} style={styles.star} onPress={() => onRate(stars)}
              accessibilityRole="button" accessibilityLabel={starLabel(stars)} accessibilityHint="Opens your review">
              <Ionicons name="star-outline" size={26} color={honey.starIdle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...StyleSheet.flatten(spot.inset), borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 8,
  },
  body: { flex: 1 },
  title: { ...StyleSheet.flatten(spot.label), fontSize: 15 },
  stars: { flexDirection: 'row', marginLeft: -9 },
  star: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
});
