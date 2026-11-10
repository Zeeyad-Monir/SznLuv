// A list's own page, in its cover colour: title, who made it, and its spots as cards.
// The owner edits in place (add, note, reorder, remove), so the page always looks the way a visitor sees it.
// Anyone else sees the public copy, with Follow, share and report. Opened with { listId }.
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import AddSpotSheet, { ownSpotsFrom } from '../components/AddSpotSheet';
import EmptyCard from '../components/EmptyCard';
import { spotCount } from '../components/ListTile';
import { useSnackbar } from '../components/Snackbar';
import SpotCard from '../components/SpotCard';
import { colors, controls, text } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import useMyLists from '../hooks/useMyLists';
import usePublishedList, { rememberPublished } from '../hooks/usePublishedList';
import { getReduceMotion } from '../hooks/useReduceMotion';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { cityName, isOwnSpot, resolveSpot, spotKey } from '../services/catalogue';
import { followList, isFollowingList, markListOpened, unfollowList } from '../services/follows';
import { deleteList, getPublicList, mutateList, publishList, subscribeList } from '../services/lists';
import {
  LIMITS, addSpot, coverBackground, hasUnpublishedChanges, insertSpot, moveSpot, needsReview, removeSpot,
} from '../services/listsState';
import { EVENTS, track } from '../services/metrics';
import { shareList } from '../services/shareList';
import { canNavigate, openVenue } from '../services/venueNavigation';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';
const haptic = () => { if (Platform.OS === 'ios') selectionAsync().catch(() => {}); };

export default function ListScreen({ navigation, route }) {
  const { listId, from } = route.params;
  const { user } = useContext(AuthContext);

  // The user's own working copy, live. `null` means it isn't theirs (or doesn't exist).
  const [draft, setDraft] = useState(undefined);
  // The public copy, fetched only when there is no working copy to show.
  const [shared, setShared] = useState(undefined);
  const [failed, setFailed] = useState(false);
  const deleting = useRef(false);

  useEffect(() => subscribeList(listId, next => {
    if (deleting.current) return; // Keep the page as it was while it slides away
    setDraft(next?.ownerUid === user?.uid ? next : null);
  }, error => {
    // Being refused is the normal answer for someone else's list.
    if (error?.code !== 'permission-denied') console.error('List unavailable:', { code: error?.code });
    setDraft(null);
  }), [listId, user?.uid]);

  useEffect(() => {
    if (draft !== null) return undefined;
    let active = true;
    getPublicList(listId)
      .then(list => { if (active) { setFailed(false); setShared(list); } })
      .catch(error => {
        console.error('Public list unavailable:', { code: error?.code });
        if (active) { setFailed(true); setShared(null); }
      });
    return () => { active = false; };
  }, [draft, listId]);

  if (draft) {
    return <OwnerList navigation={navigation} list={draft} setList={setDraft} deleting={deleting} />;
  }
  if (draft === undefined || shared === undefined) {
    return (
      <SignedInScreen style={[styles.container, styles.centred]}>
        <ActivityIndicator size="large" color={colors.ink} />
      </SignedInScreen>
    );
  }
  if (shared) return <VisitorList navigation={navigation} list={shared} from={from} />;
  // One neutral page whether the list was made private, deleted, or never existed. Nothing of it is shown.
  return (
    <SignedInScreen style={[styles.container, styles.unavailable]}>
      <EmptyCard icon={failed ? 'cloud-off' : 'lock-outline'}
        title={failed ? 'Couldn’t open this list' : 'This list isn’t available'}
        text={failed ? 'Check your connection and try again.' : 'It may have been made private or removed.'}
        actionLabel="Back to Explore" onAction={() => navigation.navigate('ExploreTab', { screen: 'Explore' })} />
    </SignedInScreen>
  );
}

function ListHeader({ list, style, byline }) {
  const count = list.spotCount ?? list.items.length;
  return (
    <Animated.View style={style}>
      <Text style={text.worldTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">
        {list.title}
      </Text>
      {byline}
      <Text style={[text.summary, styles.place]}>{cityName(list.cityId)} · {spotCount(count)}</Text>
      {!!list.description && <Text style={[text.body, styles.description]} numberOfLines={3}>{list.description}</Text>}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- The owner's view

function OwnerList({ navigation, list, setList, deleting }) {
  const listId = list.id;
  const { user, username } = useContext(AuthContext);
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const { lists: myLists } = useMyLists();
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
  const spots = useMemo(() => list.items.map(item => ({ item, spot: resolveSpot(item.spot) })), [list]);
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

  const openSpot = ({ item }) => {
    if (!canNavigate(navigation)) return;
    if (isOwnSpot(item.spot)) navigation.navigate('CustomSpotScreen', { spot: item.spot, addedBy: null });
    else openVenue(navigation, Alert.alert, item.spot.name);
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
                <Text style={controls.primaryText}>Add a spot</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[controls.secondary, styles.withIcon]} accessibilityRole="button"
              accessibilityLabel={list.public ? 'Public list, change sharing' : 'Private list, change sharing'} onPress={openSharing}>
              <Ionicons name={list.public ? 'globe-outline' : 'lock-closed'} size={16} color={colors.ink} />
              <Text style={controls.secondaryText}>{list.public ? 'Public' : 'Private'}</Text>
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
          {spots.length === 0 && (
            <EmptyCard icon="add-location-alt" title="Add your first spot"
              text="Search the spots in SznLuv, or add a place of your own."
              actionLabel="Add a spot" onAction={() => setAdding(true)} />
          )}
          {spots.map((entry, index) => (
            <SpotCard
              key={entry.spot.key} spot={entry.spot} note={entry.item.note}
              saved={isSaved(entry.item.spot)} onToggleSave={() => saveRef(entry.item.spot)}
              onPress={() => openSpot(entry)} onLongPress={() => setEditing(true)}
              editing={editing} canMoveUp={index > 0} canMoveDown={index < spots.length - 1}
              onMoveUp={() => apply(current => moveSpot(current, entry.spot.key, -1), { animate: true })}
              onMoveDown={() => apply(current => moveSpot(current, entry.spot.key, 1), { animate: true })}
              onRemove={() => remove(entry, index)}
              onNotePress={() => navigation.navigate('Note', {
                listId, spotKey: entry.spot.key, name: entry.spot.name, note: entry.item.note ?? '',
              })}
            />
          ))}
        </Animated.View>
      </ScrollView>

      {adding && (
        <AddSpotSheet
          addedKeys={new Set(list.items.map(item => spotKey(item.spot)))}
          ownSpots={ownSpotsFrom(myLists.filter(other => other.id !== listId))}
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

function VisitorList({ navigation, list, from }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const [following, setFollowingState] = useState(false);
  // Undo in the snackbar runs later, so the toggle reads the current answer rather than the one it was made with.
  const followingNow = useRef(false);
  const setFollowing = value => { followingNow.current = value; setFollowingState(value); };
  const [favourites, setFavourites] = useFavouriteSpots();
  const { saveRef, isSaved } = useSaveSpot(favourites, setFavourites, { sourceListId: list.id });
  const working = useRef(false);
  const entrance = useEntrance(3);
  const spots = useMemo(() => list.items.map(item => ({ item, spot: resolveSpot(item.spot) })), [list]);

  // Opening a followed list clears its "Updated" mark.
  useEffect(() => {
    let active = true;
    isFollowingList(uid, list.id).then(isFollowing => {
      if (!active) return;
      setFollowing(isFollowing);
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
    setFollowing(next); // Flips at once; put back if the save fails
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
      snackbar.show({ message: SAVE_FAILED });
    } finally {
      working.current = false;
    }
  };

  const openSpot = ({ item }) => {
    if (!canNavigate(navigation)) return;
    if (isOwnSpot(item.spot)) navigation.navigate('CustomSpotScreen', { spot: item.spot, addedBy: list.ownerUsername });
    else openVenue(navigation, Alert.alert, item.spot.name);
  };

  const openMenu = () => showMenu({
    title: list.title,
    options: [{
      label: 'Report list',
      destructive: true,
      onPress: () => navigation.navigate('Report', { targetType: 'list', targetId: list.id, ownerUid: list.ownerUid, name: list.title }),
    }],
  });

  const byline = (
    <View style={styles.byline}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(list.ownerUsername ?? '?').charAt(0).toUpperCase()}</Text></View>
      <Text style={text.summary}>by <Text style={styles.creator}>{list.ownerUsername}</Text></Text>
    </View>
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
            <Text style={following ? controls.secondaryText : controls.primaryText}>{following ? 'Following' : 'Follow list'}</Text>
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

        <Animated.View style={entrance[2]}>
          {spots.map(entry => (
            <SpotCard key={entry.spot.key} spot={entry.spot} note={entry.item.note}
              saved={isSaved(entry.item.spot)} onToggleSave={() => saveRef(entry.item.spot)}
              onPress={() => openSpot(entry)} />
          ))}
        </Animated.View>
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  centred: { alignItems: 'center', justifyContent: 'center' },
  unavailable: { justifyContent: 'center', paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  byline: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  creator: { fontWeight: '800' },
  place: { marginTop: 8, textAlign: 'center' },
  description: { marginTop: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 20 },
  grow: { flex: 1 },
  withIcon: { flexDirection: 'row', gap: 6 },
  square: { width: 48, paddingHorizontal: 0 },
  pending: {
    marginTop: -8, marginBottom: 20, minHeight: 48, paddingLeft: 14, paddingRight: 4, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  pendingText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.summary },
  pendingAction: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  pendingActionText: { fontSize: 15, fontWeight: '800', color: colors.ink, textDecorationLine: 'underline' },
});
