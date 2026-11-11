// A list's own page, in its cover colour: title, who made it, and its spots as cards.
// The owner edits in place (add, note, reorder, remove), so the page always looks the way a visitor sees it.
// Anyone else sees the public copy, with Follow, share and report. Opened with { listId }.
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, LayoutAnimation, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import AddSpotSheet from '../components/AddSpotSheet';
import useMySpots from '../hooks/useMySpots';
import EmptyCard from '../components/EmptyCard';
import ListBody from '../components/ListBody';
import { spotCount } from '../components/ListTile';
import { useSnackbar } from '../components/Snackbar';
import { colors, controls, text } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import usePublishedList, { rememberPublished } from '../hooks/usePublishedList';
import usePublicDocuments from '../hooks/usePublicDocuments';
import useSpotEntries from '../hooks/useSpotEntries';
import { getReduceMotion } from '../hooks/useReduceMotion';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { cityName, spotKey } from '../services/catalogue';
import { followList, getFollowedList, markListOpened, setListOnMap, unfollowList } from '../services/follows';
import { deleteList, mutateList, publishList, subscribeList } from '../services/lists';
import {
  LIMITS, addSpot, coverBackground, hasUnpublishedChanges, insertSpot, moveSpot, needsReview, removeSpot,
} from '../services/listsState';
import { EVENTS, track } from '../services/metrics';
import { blockUser } from '../services/moderation';
import { shareList } from '../services/shareList';
import { canNavigate, openSpot } from '../services/venueNavigation';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';
const ON_MAP_TRACK = { false: '#CFC6BA', true: colors.ink };
const haptic = () => { if (Platform.OS === 'ios') selectionAsync().catch(() => {}); };
export default function ListScreen({ navigation, route }) {
  const { listId, from } = route.params;
  const { user } = useContext(AuthContext);
  return <ListPage key={JSON.stringify([user?.uid, listId])} listId={listId} from={from}
    navigation={navigation} uid={user?.uid} />;
}

function ListPage({ listId, from, navigation, uid }) {
  const [draft, setDraft] = useState(undefined);
  const [draftError, setDraftError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState('spots');
  const deleting = useRef(false);
  const { read, retry } = usePublicDocuments('publicLists', draft === null ? [listId] : []);
  const shared = read(listId);

  useEffect(() => subscribeList(listId, next => {
    if (!deleting.current) setDraft(next?.ownerUid === uid ? next : null);
  }, error => {
    if (error?.code === 'permission-denied') setDraft(null);
    else setDraftError(true);
  }), [listId, uid, attempt]);

  if (draft && !draftError) {
    return <OwnerList navigation={navigation} list={draft} setList={setDraft} deleting={deleting}
      view={view} setView={setView} />;
  }
  const failed = draftError || shared.status === 'error';
  if (!failed && (draft === undefined || shared.status === 'loading')) {
    return (
      <SignedInScreen style={[styles.container, styles.centred]}>
        <ActivityIndicator size="large" color={colors.ink} accessibilityLabel="Loading list" />
      </SignedInScreen>
    );
  }
  if (!failed && shared.value) {
    return <VisitorList navigation={navigation} list={shared.value} from={from} view={view} setView={setView} />;
  }
  const retryList = () => {
    if (!draftError) return retry();
    setDraft(undefined);
    setDraftError(false);
    setAttempt(value => value + 1);
  };
  // One neutral page whether the list was made private, deleted, or never existed. Nothing of it is shown.
  return (
    <SignedInScreen style={[styles.container, styles.unavailable]}>
      <EmptyCard icon={failed ? 'cloud-off' : 'lock-outline'}
        title={failed ? 'Couldn’t open this list' : 'This list isn’t available'}
        text={failed ? 'Check your connection and try again.' : 'It may have been made private or removed.'}
        actionLabel={failed ? 'Try again' : 'Back to Explore'}
        onAction={failed ? retryList : () => navigation.navigate('ExploreTab', { screen: 'Explore' })} />
    </SignedInScreen>
  );
}

function ListHeader({ list, style, byline }) {
  const count = list.spotCount ?? list.items.length;
  return (
    <Animated.View style={style}>
      <Text style={text.worldTitle} accessibilityRole="header">
        {list.title}
      </Text>
      {byline}
      <Text style={[text.summary, styles.place]}>{cityName(list.cityId)} · {spotCount(count)}</Text>
      {!!list.description && <Text style={[text.body, styles.description]} numberOfLines={3}>{list.description}</Text>}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- The owner's view

function OwnerList({ navigation, list, setList, deleting, view, setView }) {
  const listId = list.id;
  const { user, username } = useContext(AuthContext);
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const mySpots = useMySpots();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [favourites, setFavourites] = useFavouriteSpots();
  const { saveRef, isSaved } = useSaveSpot(favourites, setFavourites);
  const { published, refresh } = usePublishedList(list);
  const latest = useRef(list);
  latest.current = list;

  // Coming back from the Sharing sheet, the public copy may have changed.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const entrance = useEntrance(3);
  const { entries, retry } = useListEntries(list, { privateSpots: mySpots, ownedDraft: true });
  const full = list.items.length >= LIMITS.spots;
  const pending = list.public && hasUnpublishedChanges(list, published);

  // Shows the change at once, saves it, and puts the list back if the save fails.
  const apply = async (change, { animate = false } = {}) => {
    const before = latest.current;
    let next;
    try { next = change(before); } catch (error) { snackbar.show({ message: error.message }); return false; }
    if (next === before) return true;
    if (animate && !getReduceMotion()) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setList(next);
    try {
      await mutateList(listId, change);
      return true;
    } catch (error) {
      console.error('Error updating list:', { code: error?.code });
      setList(before);
      snackbar.show({ message: error?.code?.startsWith('list/') ? error.message : SAVE_FAILED });
      return false;
    }
  };

  const addToThisList = async ref => {
    const first = !latest.current.items.length;
    if (await apply(current => addSpot(current, ref), { animate: true }) && first) track(EVENTS.firstSpotAdded, { entry: 'library' });
  };

  const remove = ({ item, spot }, index) => {
    apply(current => removeSpot(current, spot.key), { animate: true });
    snackbar.show({
      message: `Removed ${spot.name}`,
      actionLabel: 'Undo',
      onAction: () => apply(current => insertSpot(current, item, index), { animate: true }),
    });
  };

  const openSharing = () => navigation.navigate('Sharing', { listId });

  // An update that reveals a new note or a place of the owner's goes through the review first.
  const updatePublic = async () => {
    if (updating) return;
    if (needsReview(list, published)) { openSharing(); return; }
    setUpdating(true);
    try {
      rememberPublished(listId, await publishList(user?.uid, username, listId));
      refresh();
      haptic();
      snackbar.show({ message: 'Public list updated' });
    } catch (error) {
      console.error('Error updating public list:', { code: error?.code });
      snackbar.show({ message: error?.code?.startsWith('list/') ? error.message : SAVE_FAILED });
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = () => Alert.alert(
    `Delete “${list.title}”?`,
    list.public ? 'It will also disappear for anyone following it. This can’t be undone.' : 'This can’t be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete list', style: 'destructive',
        onPress: async () => {
          deleting.current = true;
          try {
            await deleteList(listId);
            navigation.goBack();
            snackbar.show({ message: 'List deleted' });
          } catch (error) {
            deleting.current = false;
            console.error('Error deleting list:', { code: error?.code });
            snackbar.show({ message: 'Couldn’t delete. Check your connection.' });
          }
        },
      },
    ],
    { cancelable: true },
  );

  const openMenu = () => showMenu({
    title: list.title,
    options: [
      list.items.length > 0 && { label: 'Edit spots', onPress: () => setEditing(true) },
      { label: 'List details', onPress: () => navigation.navigate('ListDetails', { listId }) },
      list.public && { label: 'Share link', onPress: () => shareList({ ...list, ownerUsername: username }).catch(() => {}) },
      { label: 'Delete list', destructive: true, onPress: confirmDelete },
    ].filter(Boolean),
  });

  return (
    <SignedInScreen style={[styles.container, { backgroundColor: coverBackground(list.cover) }]}>
      <ScrollView contentContainerStyle={floatingScrollStyle} keyboardShouldPersistTaps="handled">
        <ListHeader list={list} style={entrance[0]} />

        <Animated.View style={entrance[1]}>
          <View style={styles.actions}>
            {editing ? (
              <TouchableOpacity style={[controls.primary, styles.grow]} accessibilityRole="button" onPress={() => setEditing(false)}>
                <Text style={controls.primaryText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[controls.primary, styles.grow, styles.withIcon]} accessibilityRole="button" onPress={() => setAdding(true)}>
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={[controls.primaryText, styles.actionLabel]}>Add a spot</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[controls.secondary, styles.withIcon]} accessibilityRole="button"
              accessibilityLabel={list.public ? 'Public list, change sharing' : 'Private list, change sharing'} onPress={openSharing}>
              <Ionicons name={list.public ? 'globe-outline' : 'lock-closed'} size={16} color={colors.ink} />
              <Text style={[controls.secondaryText, styles.actionLabel]}>{list.public ? 'Public' : 'Private'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[controls.secondary, styles.square]} accessibilityRole="button"
              accessibilityLabel="More options" onPress={openMenu}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>
          {pending && (
            <View style={styles.pending}>
              <Text style={styles.pendingText}>Changes not public yet</Text>
              <TouchableOpacity style={styles.pendingAction} accessibilityRole="button" disabled={updating}
                accessibilityLabel="Update public list" onPress={updatePublic}>
                <Text style={styles.pendingActionText}>Update</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <Animated.View style={entrance[2]}>
          <ListBody sections={[{ entries }]} view={view} onViewChange={setView} isSaved={isSaved} onSave={saveRef}
            onOpen={ref => openSpot(navigation, ref)} editing={editing} retry={retry}
            empty={<EmptyCard icon="add-location-alt" title="Add your first spot"
              text="Search the spots in SznLuv, or add a place of your own."
              actionLabel="Add a spot" onAction={() => setAdding(true)} />}
            editProps={(entry, index) => ({
              onLongPress: () => setEditing(true),
              canMoveUp: index > 0,
              canMoveDown: index < entries.length - 1,
              onMoveUp: () => apply(current => moveSpot(current, entry.spot.key, -1), { animate: true }),
              onMoveDown: () => apply(current => moveSpot(current, entry.spot.key, 1), { animate: true }),
              onRemove: () => remove(entry, index),
              onNotePress: () => navigation.navigate('Note', {
                listId, spotKey: entry.spot.key, name: entry.spot.name, note: entry.note ?? '',
              }),
            })} />
        </Animated.View>
      </ScrollView>

      {adding && (
        <AddSpotSheet
          addedKeys={new Set(list.items.map(item => spotKey(item.spot)))}
          mySpots={mySpots.spots}
          full={full} fullHint={`This list is full. A list can hold up to ${LIMITS.spots} spots.`}
          onAdd={addToThisList}
          onAddOwn={name => navigation.navigate('OwnSpotScreen', { listId, name })}
          onDismiss={() => setAdding(false)}
        />
      )}
    </SignedInScreen>
  );
}

// ---------------------------------------------------------------- Everyone else's view

function VisitorList({ navigation, list, from, view, setView }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const [following, setFollowingState] = useState(false);
  // Undo in the snackbar runs later, so the toggle reads the current answer rather than the one it was made with.
  const followingNow = useRef(false);
  const setFollowing = value => { followingNow.current = value; setFollowingState(value); };
  // Whether this list's spots are pinned on the Map tab without being picked there. Off for a new follow.
  const [onMap, setOnMap] = useState(false);
  const savingOnMap = useRef(false);
  const [favourites, setFavourites] = useFavouriteSpots();
  const { saveRef, isSaved } = useSaveSpot(favourites, setFavourites, { sourceListId: list.id });
  const working = useRef(false);
  const entrance = useEntrance(3);
  const { entries, retry } = useListEntries(list);

  // Opening a followed list clears its "Updated" mark.
  useEffect(() => {
    let active = true;
    getFollowedList(uid, list.id).then(pointer => {
      if (!active) return;
      const isFollowing = !!pointer;
      setFollowing(isFollowing);
      setOnMap(pointer?.showOnMap === true);
      if (isFollowing) {
        markListOpened(uid, list.id).catch(() => {});
        track(EVENTS.followedListReopened, { listId: list.id, from: from === 'link' ? 'link' : 'library' });
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [uid, list.id, from]);

  const toggleFollow = async () => {
    if (working.current) return;
    working.current = true;
    const next = !followingNow.current;
    const wasOnMap = onMap;
    setFollowing(next); // Flips at once; put back if the save fails
    setOnMap(false); // The map switch belongs to the follow: a new follow starts with it off
    try {
      if (next) {
        await followList(uid, list);
        track(EVENTS.listFollowed, { listId: list.id });
        haptic();
        snackbar.show({ message: 'Following. It’s in Favourites › Following.' });
      } else {
        await unfollowList(uid, list.id);
        snackbar.show({ message: 'Unfollowed', actionLabel: 'Undo', onAction: toggleFollow });
      }
    } catch (error) {
      console.error('Error changing follow:', { code: error?.code });
      setFollowing(!next);
      setOnMap(wasOnMap);
      snackbar.show({ message: SAVE_FAILED });
    } finally {
      working.current = false;
    }
  };

  // Only changes what the Map tab shows by default. The list stays followed either way.
  const toggleOnMap = async value => {
    if (savingOnMap.current || !followingNow.current) return;
    savingOnMap.current = true;
    setOnMap(value);
    try {
      await setListOnMap(uid, list.id, value);
    } catch (error) {
      console.error('Error changing map visibility:', { code: error?.code });
      setOnMap(!value);
      snackbar.show({ message: SAVE_FAILED });
    } finally {
      savingOnMap.current = false;
    }
  };

  const confirmBlock = () => Alert.alert(
    `Block ${list.ownerUsername}?`,
    'You won’t see their lists or profile, and you’ll stop following them. They aren’t told.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(uid, list.ownerUid);
            navigation.goBack();
            snackbar.show({ message: `Blocked ${list.ownerUsername}` });
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
    title: list.title,
    options: [
      {
        label: 'Report list',
        onPress: () => navigation.navigate('Report', { targetType: 'list', targetId: list.id, ownerUid: list.ownerUid, name: list.title }),
      },
      { label: `Block ${list.ownerUsername}`, destructive: true, onPress: confirmBlock },
    ],
  });

  const byline = (
    <TouchableOpacity style={styles.byline} accessibilityRole="link" accessibilityLabel={`By ${list.ownerUsername}. Open profile`}
      onPress={() => { if (canNavigate(navigation)) navigation.navigate('PersonScreen', { uid: list.ownerUid }); }}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(list.ownerUsername ?? '?').charAt(0).toUpperCase()}</Text></View>
      <Text style={text.summary}>by <Text style={styles.creator}>{list.ownerUsername}</Text></Text>
    </TouchableOpacity>
  );

  return (
    <SignedInScreen style={[styles.container, { backgroundColor: coverBackground(list.cover) }]}>
      <ScrollView contentContainerStyle={floatingScrollStyle}>
        <ListHeader list={list} style={entrance[0]} byline={byline} />

        <Animated.View style={[styles.actions, entrance[1]]}>
          <TouchableOpacity style={[following ? controls.secondary : controls.primary, styles.grow, styles.withIcon]}
            accessibilityRole="button" accessibilityState={{ selected: following }}
            accessibilityLabel={following ? 'Following list. Unfollow' : 'Follow list'} onPress={toggleFollow}>
            <Ionicons name={following ? 'checkmark' : 'add'} size={20} color={following ? colors.ink : colors.white} />
            <Text style={[following ? controls.secondaryText : controls.primaryText, styles.actionLabel]}>{following ? 'Following' : 'Follow list'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[controls.secondary, styles.square]} accessibilityRole="button"
            accessibilityLabel="Share link" onPress={() => shareList(list).catch(() => {})}>
            <Ionicons name="share-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={[controls.secondary, styles.square]} accessibilityRole="button"
            accessibilityLabel="More options" onPress={openMenu}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
          </TouchableOpacity>
        </Animated.View>

        {following && (
          <View style={styles.onMap}>
            <View style={styles.onMapWords}>
              <Text style={styles.onMapLabel}>Show all spots on map</Text>
              <Text style={styles.onMapHint}>When enabled, spots from this collection will appear on your map.</Text>
            </View>
            <Switch accessibilityLabel="Show all spots on map"
              accessibilityHint="When enabled, spots from this collection will appear on your map."
              trackColor={ON_MAP_TRACK} thumbColor={colors.white} ios_backgroundColor={ON_MAP_TRACK.false}
              value={onMap} onValueChange={toggleOnMap} />
          </View>
        )}

        <Animated.View style={entrance[2]}>
          <ListBody sections={[{ entries }]} view={view} onViewChange={setView} isSaved={isSaved} onSave={saveRef}
            onOpen={ref => openSpot(navigation, ref, list.id)} retry={retry}
            empty={<EmptyCard icon="place" title="No spots yet" text="Spots appear here when the creator adds them." />} />
        </Animated.View>
      </ScrollView>
    </SignedInScreen>
  );
}

function useListEntries(list, options) {
  const { entries, retry } = useSpotEntries(list.items.map(item => item.spot), options);
  return {
    entries: entries.map((entry, index) => ({ ...entry, item: list.items[index], note: list.items[index].note })),
    retry,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  centred: { alignItems: 'center', justifyContent: 'center' },
  unavailable: { justifyContent: 'center', paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingTop: SCREEN_CONTENT_TOP_GAP, paddingBottom: 24 },
  byline: { marginTop: 4, minHeight: 36, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  creator: { fontWeight: '800', textDecorationLine: 'underline' },
  place: { marginTop: 8, textAlign: 'center' },
  description: { marginTop: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 20 },
  grow: { flex: 1 },
  withIcon: { flexDirection: 'row', flexShrink: 1, gap: 6 },
  actionLabel: { flexShrink: 1 },
  square: { width: 48, paddingHorizontal: 0 },
  pending: {
    marginTop: -8, marginBottom: 20, minHeight: 48, paddingLeft: 14, paddingRight: 4, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  pendingText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.summary },
  onMap: {
    marginTop: -8, marginBottom: 20, minHeight: 56, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, borderRadius: 12, gap: 12,
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  onMapWords: { flex: 1, gap: 2 },
  onMapLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  onMapHint: { fontSize: 13, lineHeight: 18, color: colors.muted },
  pendingAction: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  pendingActionText: { fontSize: 15, fontWeight: '800', color: colors.ink, textDecorationLine: 'underline' },
});
