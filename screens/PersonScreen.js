// Someone else's profile: their public Top 4 and public lists, and a button to follow them.
// Opened with { uid } or, from a link, { username }.
import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import EmptyCard from '../components/EmptyCard';
import ProfileView from '../components/ProfileSections';
import { useSnackbar } from '../components/Snackbar';
import { GUTTER, colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { useCity } from '../contexts/CityContext';
import { followPerson, isFollowingPerson, unfollowPerson } from '../services/follows';
import { getPublicListsBy } from '../services/lists';
import { blockUser, getBlocked } from '../services/moderation';
import { findProfileByUsername, getProfile } from '../services/profiles';
import { openSpot } from '../services/venueNavigation';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';

export default function PersonScreen({ navigation, route }) {
  const { uid: targetUid, username: targetUsername } = route?.params ?? {};
  const { user } = useContext(AuthContext);
  return <PublicProfile key={JSON.stringify([user?.uid, targetUid, targetUsername])}
    navigation={navigation} uid={user?.uid} targetUid={targetUid} targetUsername={targetUsername} />;
}

function PublicProfile({ navigation, uid, targetUid, targetUsername }) {
  const { city } = useCity();
  const snackbar = useSnackbar();

  // undefined: loading. null: not available (no public profile, or blocked).
  const [person, setPerson] = useState(undefined);
  const [lists, setLists] = useState([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [following, setFollowingState] = useState(false);
  const followingNow = useRef(false);
  const setFollowing = value => { followingNow.current = value; setFollowingState(value); };
  const working = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      const profile = targetUid ? await getProfile(targetUid) : targetUsername ? await findProfileByUsername(targetUsername) : null;
      if (!profile || (await getBlocked(uid)).includes(profile.uid)) {
        if (active) { setFailed(false); setPerson(null); }
        return;
      }
      const [theirLists, isFollowing] = await Promise.all([
        getPublicListsBy(profile.uid), profile.uid === uid ? false : isFollowingPerson(uid, profile.uid),
      ]);
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
  const picks = person.top4?.[city.id] ?? [];

  return (
    <ProfileView identity={person} navigation={navigation} picks={picks} lists={lists}
      onPressPick={ref => openSpot(navigation, ref)}
      actions={!isMe && (
        <>
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
        </>
      )} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.profile },
  centred: { alignItems: 'center', justifyContent: 'center' },
  unavailable: { justifyContent: 'center', paddingHorizontal: GUTTER },
  grow: { flex: 1 },
  withIcon: { flexDirection: 'row', gap: 6 },
  square: { width: 48, paddingHorizontal: 0 },
});
