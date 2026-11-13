// Your own profile: who you are, your Top 4, and the lists you have made public.
import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import AddSpotSheet from '../components/AddSpotSheet';
import useMySpots from '../hooks/useMySpots';
import EmptyCard from '../components/EmptyCard';
import { GlassButton } from '../components/GlassSurface';
import ProfileView from '../components/ProfileSections';
import { useSnackbar } from '../components/Snackbar';
import { GUTTER, colors, controls, text } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { isOwnSpot, spotKey } from '../services/catalogue';
import { useCity } from '../contexts/CityContext';
import { linkPath } from '../services/links';
import { getPublicListsBy } from '../services/lists';
import { getMyTop4, getProfile, mutateTop4 } from '../services/profiles';
import { MAX_PICKS, addPick, cityTop4, exposedLocations, movePick, removePick, setPublic } from '../services/top4State';
import { canNavigate, openSpot } from '../services/venueNavigation';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';
// Dark enough to read as "off" on the white visibility card.
const SWITCH_OFF = '#D6CCBE';

export default function ProfileScreen({ navigation }) {
  const { user, username } = useContext(AuthContext);
  return <OwnProfile key={user?.uid} uid={user?.uid} username={username} navigation={navigation} />;
}

function OwnProfile({ navigation, uid, username }) {
  // Top 4 is kept per city: this is the chosen city's, and another city's picks are untouched by it.
  const cityId = useCity().city.id;
  const snackbar = useSnackbar();
  const { spots: mySpots } = useMySpots();

  const [profile, setProfile] = useState(null);
  const [top4, setTop4] = useState({});
  const [publicLists, setPublicLists] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const latest = useRef(top4);
  const sharing = useRef(false);
  latest.current = top4;

  // Refreshed on every visit, so an edit made in a sheet shows when it closes.
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getProfile(uid), getMyTop4(uid), getPublicListsBy(uid)]).then(([nextProfile, nextTop4, nextLists]) => {
      if (!active) return;
      setProfile(nextProfile);
      setTop4(nextTop4);
      setPublicLists(nextLists);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [uid, attempt]));

  const city = cityTop4(top4, cityId);

  // Shows the change at once, saves it, and puts Top 4 back if the save fails.
  const change = async update => {
    const before = latest.current;
    setTop4(update(before));
    try {
      const saved = await mutateTop4(uid, username, update);
      setTop4(saved);
      if (cityTop4(saved, cityId).public) setProfile(current => current ?? { uid, username });
    } catch (error) {
      console.error('Error updating Top 4:', { code: error?.code });
      setTop4(before);
      snackbar.show({ message: SAVE_FAILED });
    }
  };

  // A place you added yourself shows its address or pin to everyone once it is public, so that is confirmed first.
  const confirmExposure = (picks, onConfirm) => {
    const revealed = exposedLocations(picks);
    if (!revealed.length) return onConfirm();
    return Alert.alert(
      'Show these places?',
      `Anyone on SznLuv will see where they are:\n\n${revealed.map(entry => `${entry.name}: ${entry.text}`).join('\n')}`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Show', onPress: onConfirm }],
      { cancelable: true },
    );
  };

  const togglePublic = value => {
    if (!value) return change(current => setPublic(current, cityId, false));
    return confirmExposure(city.picks, () => change(current => setPublic(current, cityId, true)));
  };

  const add = ref => {
    const save = () => change(current => addPick(current, cityId, ref));
    if (city.public && isOwnSpot(ref)) confirmExposure([ref], save);
    else save();
  };

  const pickMenu = (ref, index) => showMenu({
    title: ref.name,
    options: [
      { label: 'Open', onPress: () => openSpot(navigation, ref) },
      index > 0 && { label: 'Move earlier', onPress: () => change(current => movePick(current, cityId, spotKey(ref), -1)) },
      index < city.picks.length - 1 && { label: 'Move later', onPress: () => change(current => movePick(current, cityId, spotKey(ref), 1)) },
      { label: 'Remove', destructive: true, onPress: () => change(current => removePick(current, cityId, spotKey(ref))) },
    ].filter(Boolean),
  });

  const shareProfile = async () => {
    if (!profile || sharing.current) return;
    sharing.current = true;
    try {
      const url = Linking.createURL(linkPath({ type: 'person', username: profile.username }));
      await Share.share({ message: `@${profile.username} on SznLuv\n${url}` });
    } catch {
      snackbar.show({ message: 'Couldn’t share your profile. Try again.' });
    } finally {
      sharing.current = false;
    }
  };

  if (status !== 'ready') {
    return (
      <SignedInScreen style={[styles.container, styles.status]}>
        {status === 'loading'
          ? <ActivityIndicator size="large" color={colors.ink} accessibilityLabel="Loading profile" />
          : <EmptyCard icon="cloud-off" title="Couldn’t open your profile" text="Check your connection and try again."
            actionLabel="Try again" onAction={() => { setStatus('loading'); setAttempt(value => value + 1); }} />}
      </SignedInScreen>
    );
  }

  return (
    <ProfileView identity={{ uid, username, avatarColor: profile?.avatarColor, bio: profile?.bio, avatarPhotoId: profile?.avatarPhotoId }}
      navigation={navigation} lists={publicLists} picks={city.picks} onPressPick={pickMenu} onAdd={() => setAdding(true)}
      actions={(
        <>
          <GlassButton accessibilityLabel="Edit profile"
            onPress={() => {
              if (canNavigate(navigation)) navigation.navigate('EditProfile', {
                bio: profile?.bio ?? '', avatarColor: profile?.avatarColor ?? null,
                ...(profile?.avatarPhotoId ? { avatarPhotoId: profile.avatarPhotoId } : {}),
              });
            }}>
            <Ionicons name="pencil" size={16} color={colors.ink} />
            <Text style={controls.secondaryText}>Edit profile</Text>
          </GlassButton>
          {!!profile && (
            <GlassButton round accessibilityLabel="Share profile" onPress={shareProfile}>
              <Ionicons name="share-outline" size={20} color={colors.ink} />
            </GlassButton>
          )}
        </>
      )}
      top4Controls={(
        <View style={styles.visibility}>
          <Ionicons name={city.public ? 'globe-outline' : 'lock-closed'} size={20} color={colors.ink} />
          <View style={styles.visibilityWords}>
            <Text style={styles.visibilityLabel}>Show Top 4 on my profile</Text>
            <Text style={[text.meta, styles.hint]}>
              {!city.picks.length ? 'Pick up to four favourite spots.' : city.public ? 'Anyone on SznLuv can see these.' : 'Only you can see these.'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: SWITCH_OFF, true: '#D9E5B6' }} thumbColor="#FFFFFF" ios_backgroundColor={SWITCH_OFF}
            value={city.public} onValueChange={togglePublic} disabled={!city.picks.length}
            accessibilityLabel="Show Top 4 on my profile"
          />
        </View>
      )}>

      {adding && (
        <AddSpotSheet
          title="Add a pick"
          addedKeys={new Set(city.picks.map(spotKey))}
          mySpots={mySpots}
          full={city.picks.length >= MAX_PICKS} fullHint="That’s four. Remove one to add another."
          onAdd={add}
          onDismiss={() => setAdding(false)}
        />
      )}
    </ProfileView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.profile },
  status: { justifyContent: 'center', paddingHorizontal: GUTTER },
  // Who can see Top 4: a light card in the spot-page look, not a dark bar on the cream page.
  visibility: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    shadowColor: '#5A3E22', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  visibilityWords: { flex: 1 },
  visibilityLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  hint: { marginTop: 2 },
});
