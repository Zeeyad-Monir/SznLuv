import React, { useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import Avatar from './Avatar';
import EmptyCard from './EmptyCard';
import ListTile from './ListTile';
import Top4Grid from './Top4Grid';
import { GUTTER, colors, text, tileWidth } from './theme';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { DEFAULT_CITY } from '../services/catalogue';
import { canNavigate } from '../services/venueNavigation';

function ProfileIdentity({ uid, username, avatarColor, avatarPhotoId, bio, style }) {
  return (
    <Animated.View style={[styles.identity, style]}>
      <Avatar uid={uid} username={username} color={avatarColor} photoId={avatarPhotoId} size={72} />
      <View style={styles.words}>
        <Text style={styles.username} accessibilityRole="header">{username}</Text>
        {!!bio && <Text style={[text.body, styles.bio]}>{bio}</Text>}
      </View>
    </Animated.View>
  );
}

function ProfileHeading({ title, caption }) {
  return (
    <View style={styles.heading}>
      <Text style={text.sectionLabel} accessibilityRole="header">{title}</Text>
      {!!caption && <Text style={text.meta}>{caption}</Text>}
    </View>
  );
}

function PublicListTiles({ lists, size, navigation, empty }) {
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

// The screen that loads the profile decides which picks and actions the viewer is allowed to see.
export default function ProfileView({ identity, picks, lists, navigation, actions, onPressPick, onAdd, top4Controls, children }) {
  const { width } = useWindowDimensions();
  const size = tileWidth(width);
  const scrollStyle = useFloatingScrollStyle(styles.content);
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);
  const entrance = useEntrance(3);

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={scrollStyle}>
        <ProfileIdentity {...identity} style={entrance[0]} />
        {!!actions && <Animated.View style={[styles.actions, entrance[1]]}>{actions}</Animated.View>}
        <Animated.View style={entrance[2]}>
          {(onAdd || picks.length > 0) && (
            <>
              <ProfileHeading title="Top 4" caption={DEFAULT_CITY.name} />
              <Top4Grid picks={picks} size={size} editable={!!onAdd} onPressPick={onPressPick} onAdd={onAdd} />
              {top4Controls}
            </>
          )}
          <PublicListTiles lists={lists} size={size} navigation={navigation}
            empty={onAdd ? 'Lists you make public appear here.' : 'No public lists yet.'} />
        </Animated.View>
      </ScrollView>
      {children}
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.profile },
  content: { paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  words: { flex: 1 },
  username: { fontSize: 28, fontWeight: '700', color: colors.ink },
  bio: { marginTop: 2 },
  heading: { marginTop: 28, marginBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
