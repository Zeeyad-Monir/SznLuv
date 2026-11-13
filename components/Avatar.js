// A profile photo or a person's initial on their chosen colour.
// `ring` adds a white rim and a soft lift, for the large avatar at the top of a profile.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { avatarPhotoPath, DEFAULT_AVATAR_COLOUR } from '../services/profiles';
import StoragePhoto from './StoragePhoto';
import { floatShadow } from './theme';

const RING = 3;

export default function Avatar({ uid, username, color, size = 44, photoId, localUri, ring = false }) {
  const path = avatarPhotoPath(uid, photoId);
  const initial = <Text style={[styles.initial, { fontSize: size * 0.42 }, (!color || color === DEFAULT_AVATAR_COLOUR) && styles.onRed]} accessible={false}>{(username || '?').charAt(0).toUpperCase()}</Text>;
  const circle = (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || DEFAULT_AVATAR_COLOUR }]}>
      {path || localUri
        ? <StoragePhoto key={localUri ?? path} path={path} localUri={localUri} style={{ width: size, height: size }}
            accessibilityLabel={`${username}’s profile photo`} fallback={initial} />
        : initial}
    </View>
  );
  if (!ring) return circle;
  const outer = size + 2 * RING;
  return <View style={[styles.ring, { width: outer, height: outer, borderRadius: outer / 2 }]}>{circle}</View>;
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', ...floatShadow },
  initial: { color: '#333333', fontWeight: '800' },
  onRed: { color: '#FFFFFF' },
});
