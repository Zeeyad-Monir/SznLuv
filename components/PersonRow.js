// One person in a list of people: avatar, username, and a chevron to their profile.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Avatar from './Avatar';
import { cardShadow, colors } from './theme';

export default function PersonRow({ person, onPress }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${person.username}, profile`}>
      <Avatar username={person.username} color={person.avatarColor} size={40} />
      <Text style={styles.name} numberOfLines={1}>{person.username}</Text>
      <Icon name="chevron-right" size={22} color={colors.ink} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64, marginBottom: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadow,
  },
  name: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.ink },
});
