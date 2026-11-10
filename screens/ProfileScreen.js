// Your own profile: who you are, your Top 4, the lists you have made public, and the way into Settings.
import React, { useCallback, useContext, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AddSpotSheet from '../components/AddSpotSheet';
import useMySpots from '../hooks/useMySpots';
import Avatar from '../components/Avatar';
import ListTile from '../components/ListTile';
import { useSnackbar } from '../components/Snackbar';
import Top4Grid from '../components/Top4Grid';
import { GUTTER, colors, text, tileWidth } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import useMyLists from '../hooks/useMyLists';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { DEFAULT_CITY, isOwnSpot, spotKey } from '../services/catalogue';
import { getMyTop4, getProfile, mutateTop4 } from '../services/profiles';
import { MAX_PICKS, addPick, cityTop4, exposedLocations, movePick, removePick, setPublic } from '../services/top4State';
import { canNavigate, openVenue } from '../services/venueNavigation';

const CITY = DEFAULT_CITY;
const SAVE_FAILED = 'Couldn’t save. Check your connection.';

export default function ProfileScreen({ navigation }) {
  const { user, username } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const { width } = useWindowDimensions();
  const size = tileWidth(width);
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);
  const entrance = useEntrance(3);
  const { lists } = useMyLists();
  const { spots: mySpots } = useMySpots();

  const [profile, setProfile] = useState(null);
  const [top4, setTop4] = useState({});
  const [adding, setAdding] = useState(false);
  const latest = useRef(top4);
  latest.current = top4;

  // Refreshed on every visit, so an edit made in a sheet shows when it closes.
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getProfile(uid), getMyTop4(uid)]).then(([nextProfile, nextTop4]) => {
      if (!active) return;
      setProfile(nextProfile);
      setTop4(nextTop4);
    }).catch(error => console.error('Profile unavailable:', { code: error?.code }));
    return () => { active = false; };
  }, [uid]));

  const city = cityTop4(top4, CITY.id);
  const publicLists = lists.filter(list => list.public);

  // Shows the change at once, saves it, and puts Top 4 back if the save fails.
  const change = async update => {
    const before = latest.current;
    setTop4(update(before));
    try {
      setTop4(await mutateTop4(uid, username, update));
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
    if (!value) return change(current => setPublic(current, CITY.id, false));
    return confirmExposure(city.picks, () => change(current => setPublic(current, CITY.id, true)));
  };

  const add = ref => {
    const save = () => change(current => addPick(current, CITY.id, ref));
    if (city.public && isOwnSpot(ref)) confirmExposure([ref], save);
    else save();
  };

  const openPick = ref => {
    if (!canNavigate(navigation)) return;
    if (isOwnSpot(ref)) navigation.navigate('CustomSpotScreen', { spot: ref, addedBy: null });
    else openVenue(navigation, Alert.alert, ref.name);
  };

  const pickMenu = (ref, index) => showMenu({
    title: ref.name,
    options: [
      { label: 'Open', onPress: () => openPick(ref) },
      index > 0 && { label: 'Move earlier', onPress: () => change(current => movePick(current, CITY.id, spotKey(ref), -1)) },
      index < city.picks.length - 1 && { label: 'Move later', onPress: () => change(current => movePick(current, CITY.id, spotKey(ref), 1)) },
      { label: 'Remove', destructive: true, onPress: () => change(current => removePick(current, CITY.id, spotKey(ref))) },
    ].filter(Boolean),
  });

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}>
        <Animated.View style={[styles.identity, entrance[0]]}>
          <Avatar username={username} color={profile?.avatarColor} size={72} />
          <View style={styles.identityWords}>
            <Text style={styles.username} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">{username}</Text>
            {!!profile?.bio && <Text style={[text.body, styles.bio]}>{profile.bio}</Text>}
            <TouchableOpacity style={styles.edit} accessibilityRole="button"
              onPress={() => navigation.navigate('EditProfile', { bio: profile?.bio ?? '', avatarColor: profile?.avatarColor ?? null })}>
              <Text style={styles.editText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={entrance[1]}>
          <View style={styles.sectionHead}>
            <Text style={text.sectionLabel} accessibilityRole="header">Top 4</Text>
            <Text style={text.meta}>{CITY.name}</Text>
          </View>
          <Top4Grid picks={city.picks} size={size} editable onPressPick={pickMenu} onAdd={() => setAdding(true)} />
          <View style={styles.row}>
            <Text style={styles.rowText}>Show Top 4 on my profile</Text>
            <Switch
              trackColor={{ false: '#A9A9A9', true: '#D9E5B6' }} thumbColor="#FFFFFF" ios_backgroundColor="#A9A9A9"
              value={city.public} onValueChange={togglePublic} disabled={!city.picks.length}
              accessibilityLabel="Show Top 4 on my profile"
            />
          </View>
          <Text style={[text.meta, styles.hint]}>
            {!city.picks.length ? 'Pick up to four favourite spots.' : city.public ? 'Anyone on SznLuv can see these.' : 'Only you can see these.'}
          </Text>
        </Animated.View>

        <Animated.View style={entrance[2]}>
          <View style={styles.sectionHead}>
            <Text style={text.sectionLabel} accessibilityRole="header">Public lists</Text>
          </View>
          {publicLists.length === 0 ? (
            <Text style={[text.body, styles.none]}>Lists you make public appear here.</Text>
          ) : (
            <View style={styles.grid}>
              {publicLists.map(list => (
                <ListTile key={list.id} list={list} size={size}
                  onPress={() => { if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id }); }} />
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.row, styles.settings]} accessibilityRole="button"
            onPress={() => { if (canNavigate(navigation)) navigation.navigate('Settings'); }}>
            <Text style={styles.rowText}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

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
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.profile },
  content: { paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityWords: { flex: 1 },
  username: { fontSize: 28, fontWeight: '700', color: colors.ink },
  bio: { marginTop: 2 },
  edit: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  editText: { fontSize: 14, fontWeight: '600', color: '#8E8576', textDecorationLine: 'underline' },
  sectionHead: { marginTop: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  row: {
    minHeight: 50, paddingHorizontal: 15, borderRadius: 8, backgroundColor: colors.darkRow,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  rowText: { fontSize: 16, fontWeight: '500', color: colors.white },
  hint: { marginTop: 8 },
  none: { color: colors.muted },
  settings: { marginTop: 28 },
});
