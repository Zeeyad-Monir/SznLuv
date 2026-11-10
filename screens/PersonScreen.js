// Someone else's profile: their public Top 4 and public lists, and a button to follow them.
// Opened with { uid } or, from a link, { username }.
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import Avatar from '../components/Avatar';
import EmptyCard from '../components/EmptyCard';
import ListTile from '../components/ListTile';
import { useSnackbar } from '../components/Snackbar';
import Top4Grid from '../components/Top4Grid';
import { GUTTER, colors, controls, text, tileWidth } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { DEFAULT_CITY, isOwnSpot } from '../services/catalogue';
import { followPerson, isFollowingPerson, unfollowPerson } from '../services/follows';
import { getPublicListsBy } from '../services/lists';
import { blockUser, getBlocked } from '../services/moderation';
import { findProfileByUsername, getProfile } from '../services/profiles';
import { canNavigate, openVenue } from '../services/venueNavigation';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';

export default function PersonScreen({ navigation, route }) {
  const { uid: targetUid, username: targetUsername } = route.params;
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const { width } = useWindowDimensions();
  const size = tileWidth(width);
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);

  // undefined: loading. null: not available (no public profile, or blocked).
  const [person, setPerson] = useState(undefined);
  const [lists, setLists] = useState([]);
  const [following, setFollowingState] = useState(false);
  const followingNow = useRef(false);
  const setFollowing = value => { followingNow.current = value; setFollowingState(value); };
  const working = useRef(false);
  const entrance = useEntrance(3, { ready: !!person });

  const load = useCallback(async () => {
    try {
      const profile = targetUid ? await getProfile(targetUid) : await findProfileByUsername(targetUsername);
      if (!profile || (await getBlocked(uid)).includes(profile.uid)) return setPerson(null);
      const [theirLists, isFollowing] = await Promise.all([getPublicListsBy(profile.uid), isFollowingPerson(uid, profile.uid)]);
      setLists(theirLists);
      setFollowing(isFollowing);
      return setPerson(profile);
    } catch (error) {
      console.error('Profile unavailable:', { code: error?.code });
      return setPerson(null);
    }
  }, [targetUid, targetUsername, uid]);
  useEffect(() => { load(); }, [load]);

  const toggleFollow = async () => {
    if (working.current) return;
    working.current = true;
    const next = !followingNow.current;
    setFollowing(next);
    try {
      if (next) {
        await followPerson(uid, person);
        if (Platform.OS === 'ios') selectionAsync().catch(() => {});
        snackbar.show({ message: `Following ${person.username}. They’re in Favourites › Following.` });
      } else {
        await unfollowPerson(uid, person.uid);
        snackbar.show({ message: 'Unfollowed', actionLabel: 'Undo', onAction: toggleFollow });
      }
    } catch (error) {
      console.error('Error changing follow:', { code: error?.code });
      setFollowing(!next);
      snackbar.show({ message: SAVE_FAILED });
    } finally {
      working.current = false;
    }
  };

  const confirmBlock = () => Alert.alert(
    `Block ${person.username}?`,
    'You won’t see their lists or profile, and you’ll stop following them. They aren’t told.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(uid, person.uid);
            navigation.goBack();
            snackbar.show({ message: `Blocked ${person.username}` });
          } catch (error) {
            console.error('Error blocking:', { code: error?.code });
            snackbar.show({ message: SAVE_FAILED });
          }
        },
      },
    ],
    { cancelable: true },
  );

  const openMenu = () => showMenu({
    title: person.username,
    options: [
      { label: `Report ${person.username}`, onPress: () => navigation.navigate('Report', { targetType: 'person', targetId: person.uid, ownerUid: person.uid, name: person.username }) },
      { label: `Block ${person.username}`, destructive: true, onPress: confirmBlock },
    ],
  });

  const openPick = ref => {
    if (!canNavigate(navigation)) return;
    if (isOwnSpot(ref)) navigation.navigate('CustomSpotScreen', { spot: ref, addedBy: person.username });
    else openVenue(navigation, Alert.alert, ref.name);
  };

  if (person === undefined) {
    return (
      <SignedInScreen style={[styles.container, styles.centred]}>
        <ActivityIndicator size="large" color={colors.ink} />
      </SignedInScreen>
    );
  }
  if (!person) {
    return (
      <SignedInScreen style={[styles.container, styles.unavailable]}>
        <EmptyCard icon="person-off" title="This profile isn’t available"
          actionLabel="Back to Explore" onAction={() => navigation.navigate('ExploreTab', { screen: 'Explore' })} />
      </SignedInScreen>
    );
  }

  const isMe = person.uid === uid;
  const picks = person.top4?.[DEFAULT_CITY.id] ?? [];

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView contentContainerStyle={floatingScrollStyle}>
        <Animated.View style={[styles.identity, entrance[0]]}>
          <Avatar username={person.username} color={person.avatarColor} size={72} />
          <View style={styles.identityWords}>
            <Text style={styles.username} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">{person.username}</Text>
            {!!person.bio && <Text style={[text.body, styles.bio]}>{person.bio}</Text>}
          </View>
        </Animated.View>

        {!isMe && (
          <Animated.View style={[styles.actions, entrance[1]]}>
            <TouchableOpacity style={[following ? controls.secondary : controls.primary, styles.grow, styles.withIcon]}
              accessibilityRole="button" accessibilityState={{ selected: following }}
              accessibilityLabel={following ? `Following ${person.username}. Unfollow` : `Follow ${person.username}`} onPress={toggleFollow}>
              <Ionicons name={following ? 'checkmark' : 'add'} size={20} color={following ? colors.ink : colors.white} />
              <Text style={following ? controls.secondaryText : controls.primaryText}>{following ? 'Following' : `Follow ${person.username}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[controls.secondary, styles.square]} accessibilityRole="button"
              accessibilityLabel="More options" onPress={openMenu}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View style={entrance[2]}>
          {picks.length > 0 && (
            <>
              <View style={styles.sectionHead}>
                <Text style={text.sectionLabel} accessibilityRole="header">Top 4</Text>
                <Text style={text.meta}>{DEFAULT_CITY.name}</Text>
              </View>
              <Top4Grid picks={picks} size={size} onPressPick={openPick} />
            </>
          )}
          <View style={styles.sectionHead}>
            <Text style={text.sectionLabel} accessibilityRole="header">Lists</Text>
          </View>
          {lists.length === 0 ? (
            <Text style={[text.body, styles.none]}>No public lists yet.</Text>
          ) : (
            <View style={styles.grid}>
              {lists.map(list => (
                <ListTile key={list.id} list={list} size={size}
                  onPress={() => { if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id }); }} />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.profile },
  centred: { alignItems: 'center', justifyContent: 'center' },
  unavailable: { justifyContent: 'center', paddingHorizontal: 20 },
  content: { paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityWords: { flex: 1 },
  username: { fontSize: 28, fontWeight: '700', color: colors.ink },
  bio: { marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  grow: { flex: 1 },
  withIcon: { flexDirection: 'row', gap: 6 },
  square: { width: 48, paddingHorizontal: 0 },
  sectionHead: { marginTop: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  none: { color: colors.muted },
});
