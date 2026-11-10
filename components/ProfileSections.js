import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import EmptyCard from './EmptyCard';
import ListTile from './ListTile';
import { colors, text } from './theme';
import { canNavigate } from '../services/venueNavigation';

export function ProfileIdentity({ username, avatarColor, bio, style, children }) {
  return (
    <Animated.View style={[styles.identity, style]}>
      <Avatar username={username} color={avatarColor} size={72} />
      <View style={styles.words}>
        <Text style={styles.username} accessibilityRole="header">{username}</Text>
        {!!bio && <Text style={[text.body, styles.bio]}>{bio}</Text>}
        {children}
      </View>
    </Animated.View>
  );
}

export function ProfileHeading({ title, caption }) {
  return (
    <View style={styles.heading}>
      <Text style={text.sectionLabel} accessibilityRole="header">{title}</Text>
      {!!caption && <Text style={text.meta}>{caption}</Text>}
    </View>
  );
}

export function PublicListTiles({ lists, size, navigation, empty }) {
  return (
    <>
      <ProfileHeading title="Public lists" />
      {lists.length ? (
        <View style={styles.grid}>
          {lists.map(list => (
            <ListTile key={list.id} list={list} size={size}
              onPress={() => { if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id }); }} />
          ))}
        </View>
      ) : <EmptyCard icon="bookmark-border" text={empty} />}
    </>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  words: { flex: 1 },
  username: { fontSize: 28, fontWeight: '700', color: colors.ink },
  bio: { marginTop: 2 },
  heading: { marginTop: 28, marginBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
