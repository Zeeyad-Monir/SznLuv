import React, { useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import Avatar from './Avatar';
import EmptyCard from './EmptyCard';
import ListTile from './ListTile';
import ProfileBackdrop from './ProfileBackdrop';
import Top4Grid from './Top4Grid';
import { GUTTER, colors, text, tileWidth } from './theme';
import useEntrance, { useItemEntrance } from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { useCity } from '../contexts/CityContext';
import { resolveSpot } from '../services/catalogue';
import { canNavigate } from '../services/venueNavigation';

const AVATAR_SIZE = 96;

// 1234 -> "1.2k", so a big number never crowds its cell.
export const compactCount = value => (value >= 1000 ? `${(Math.floor(value / 100) / 10).toString()}k` : String(value));
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

function ProfileIdentity({ uid, username, avatarColor, avatarPhotoId, bio }) {
  return (
    <View style={styles.identity}>
      <Avatar uid={uid} username={username} color={avatarColor} photoId={avatarPhotoId} size={AVATAR_SIZE} ring />
      <Text style={styles.username} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {username}
      </Text>
      {!!bio && <Text style={[text.body, styles.bio]}>{bio}</Text>}
    </View>
  );
}

// Three numbers the profile already has in hand, so they cost nothing to show.
function ProfileStats({ picks, lists }) {
  const follows = lists.reduce((sum, list) => sum + (Number(list.followerCount) || 0), 0);
  const cells = [
    { value: picks, label: 'Picks', spoken: plural(picks, 'pick', 'picks') },
    { value: lists.length, label: 'Lists', spoken: plural(lists.length, 'public list', 'public lists') },
    { value: follows, label: 'List follows', spoken: plural(follows, 'list follow', 'list follows') },
  ];
  return (
    <View style={styles.stats} accessible accessibilityLabel={cells.map(cell => cell.spoken).join(', ')} testID="profile-stats">
      {cells.map((cell, index) => (
        <React.Fragment key={cell.label}>
          {index > 0 && <View style={styles.divider} />}
          <View style={styles.stat}>
            <Text style={styles.statValue}>{compactCount(cell.value)}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>{cell.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

function ProfileHeading({ title, chip }) {
  return (
    <View style={styles.heading}>
      <Text style={text.sectionLabel} accessibilityRole="header">{title}</Text>
      {!!chip && (
        <View style={styles.chip}>
          <Ionicons name="location-sharp" size={12} color={colors.muted} />
          <Text style={styles.chipText}>{chip}</Text>
        </View>
      )}
    </View>
  );
}

function PublicListTiles({ lists, size, navigation, empty }) {
  const entrance = useItemEntrance(lists.map(list => list.id));
  return (
    <>
      <ProfileHeading title="Public lists" />
      {lists.length ? (
        <View style={styles.grid}>
          {lists.map(list => (
            <Animated.View key={list.id} style={entrance.styleFor(list.id)}>
              <ListTile list={list} size={size}
                onPress={() => { if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id }); }} />
            </Animated.View>
          ))}
        </View>
      ) : <EmptyCard icon="bookmark-border" text={empty} />}
    </>
  );
}

// The screen that loads the profile decides which picks and actions the viewer is allowed to see.
export default function ProfileView({ identity, picks, lists, navigation, actions, onPressPick, onAdd, top4Controls, ownSpots, children }) {
  const { width } = useWindowDimensions();
  const size = tileWidth(width);
  const scrollStyle = useFloatingScrollStyle(styles.content);
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);
  const entrance = useEntrance(5);
  const { city } = useCity();
  const lead = picks[0] ? resolveSpot(picks[0]) : null;

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={scrollStyle}>
        <ProfileBackdrop season={lead?.season} avatarColor={identity.avatarColor} />
        <Animated.View style={entrance[0]}><ProfileIdentity {...identity} /></Animated.View>
        <Animated.View style={entrance[1]}><ProfileStats picks={picks.length} lists={lists} /></Animated.View>
        {!!actions && <Animated.View style={[styles.actions, entrance[2]]}>{actions}</Animated.View>}
        <Animated.View style={entrance[3]}>
          {(onAdd || picks.length > 0) && (
            <>
              <ProfileHeading title="Top 4" chip={city.name} />
              <Top4Grid picks={picks} size={size} editable={!!onAdd} onPressPick={onPressPick} onAdd={onAdd} ownSpots={ownSpots} />
              {top4Controls}
            </>
          )}
        </Animated.View>
        <Animated.View style={entrance[4]}>
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
  content: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP, paddingBottom: 24 },
  identity: { alignItems: 'center', paddingTop: 8 },
  username: {
    marginTop: 14, maxWidth: '100%', fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5,
    color: colors.ink, textAlign: 'center',
  },
  bio: { marginTop: 4, maxWidth: 300, textAlign: 'center', color: colors.muted },
  stats: {
    marginTop: 18, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 6, borderRadius: 22,
    backgroundColor: colors.segmentTrack, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.segmentRim,
  },
  stat: { minWidth: 84, paddingHorizontal: 10, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.ink },
  statLabel: { marginTop: 1, fontSize: 12, fontWeight: '600', color: colors.muted },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4, backgroundColor: colors.segmentRim },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  heading: { marginTop: 30, marginBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: colors.segmentTrack, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.segmentRim,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
