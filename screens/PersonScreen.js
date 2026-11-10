// Someone else's profile: their public Top 4 and public lists, and a button to follow them.
// Opened with { uid } or, from a link, { username }.
import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import EmptyCard from '../components/EmptyCard';
import { ProfileHeading, ProfileIdentity, PublicListTiles } from '../components/ProfileSections';
import { useSnackbar } from '../components/Snackbar';
import Top4Grid from '../components/Top4Grid';
import { GUTTER, colors, controls, tileWidth } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { DEFAULT_CITY } from '../services/catalogue';
import { followPerson, isFollowingPerson, unfollowPerson } from '../services/follows';
import { getPublicListsBy } from '../services/lists';
import { blockUser, getBlocked } from '../services/moderation';
import { findProfileByUsername, getProfile } from '../services/profiles';
import { openSpot } from '../services/venueNavigation';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';

export default function PersonScreen({ navigation, route }) {
  const { uid: targetUid, username: targetUsername } = route.params;
  const { user } = useContext(AuthContext);
  return <PublicProfile key={JSON.stringify([user?.uid, targetUid, targetUsername])}
    navigation={navigation} uid={user?.uid} targetUid={targetUid} targetUsername={targetUsername} />;
}

function PublicProfile({ navigation, uid, targetUid, targetUsername }) {
  const snackbar = useSnackbar();
  const { width } = useWindowDimensions();
  const size = tileWidth(width);
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);

  // undefined: loading. null: not available (no public profile, or blocked).
  const [person, setPerson] = useState(undefined);
  const [lists, setLists] = useState([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [following, setFollowingState] = useState(false);
  const followingNow = useRef(false);
  const setFollowing = value => { followingNow.current = value; setFollowingState(value); };
  const working = useRef(false);
  const entrance = useEntrance(3, { ready: !!person });

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      const profile = targetUid ? await getProfile(targetUid) : await findProfileByUsername(targetUsername);
      if (!profile || (await getBlocked(uid)).includes(profile.uid)) {
        if (active) { setFailed(false); setPerson(null); }
        return;
      }
      const [theirLists, isFollowing] = await Promise.all([getPublicListsBy(profile.uid), isFollowingPerson(uid, profile.uid)]);
      if (!active) return;
      setLists(theirLists);
      setFollowing(isFollowing);
      setFailed(false);
      setPerson(profile);
    };
    load().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [targetUid, targetUsername, uid, attempt]));

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

  if (!failed && person === undefined) {
    return (
      <SignedInScreen style={[styles.container, styles.centred]}>
        <ActivityIndicator size="large" color={colors.ink} accessibilityLabel="Loading profile" />
      </SignedInScreen>
    );
  }
  if (failed || !person) {
    return (
      <SignedInScreen style={[styles.container, styles.unavailable]}>
        <EmptyCard icon={failed ? 'cloud-off' : 'person-off'}
          title={failed ? 'Couldn’t open this profile' : 'This profile isn’t available'}
          text={failed ? 'Check your connection and try again.' : undefined}
          actionLabel={failed ? 'Try again' : 'Back to Explore'}
          onAction={failed
            ? () => { setPerson(undefined); setFailed(false); setAttempt(value => value + 1); }
            : () => navigation.navigate('ExploreTab', { screen: 'Explore' })} />
      </SignedInScreen>
    );
  }

  const isMe = person.uid === uid;
  const picks = person.top4?.[DEFAULT_CITY.id] ?? [];

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView contentContainerStyle={floatingScrollStyle}>
        <ProfileIdentity username={person.username} avatarColor={person.avatarColor} bio={person.bio} style={entrance[0]} />

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
              <ProfileHeading title="Top 4" caption={DEFAULT_CITY.name} />
              <Top4Grid picks={picks} size={size} onPressPick={ref => openSpot(navigation, ref)} />
            </>
          )}
          <PublicListTiles lists={lists} size={size} navigation={navigation} empty="No public lists yet." />
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  grow: { flex: 1 },
  withIcon: { flexDirection: 'row', gap: 6 },
  square: { width: 48, paddingHorizontal: 0 },
});
