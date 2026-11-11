// The library. "Saved" holds single places: spots the user hearted. "My lists" holds collections: the
// lists they made and the seasonal collections they chose to keep. "Following" is other people's lists.
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import EmptyCard from '../components/EmptyCard';
import ListTile, { NewListTile } from '../components/ListTile';
import SegmentPill from '../components/SegmentPill';
import HeartButton from '../components/HeartButton';
import SpotCard from '../components/SpotCard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GRID_GAP, GUTTER, colors, tileWidth } from '../components/theme';
import useEntrance, { useItemEntrance } from '../hooks/useEntrance';
import { AuthContext } from '../contexts/AuthContext';
import useMyLists from '../hooks/useMyLists';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import useMySpots from '../hooks/useMySpots';
import useSpotEntries from '../hooks/useSpotEntries';
import { savedCustomSpots } from '../services/customSpotsState';
import useSavedCollections, { useCollectionHeart } from '../hooks/useSavedCollections';
import { catalogueRef, resolveSpot } from '../services/catalogue';
import { collectionById, collectionCaption } from '../services/collections';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import PersonRow from '../components/PersonRow';
import { loadFollowedLists, loadFollowedPeople } from '../services/follows';
import { getPublicList } from '../services/lists';
import { canNavigate, openSpot } from '../services/venueNavigation';

const SEGMENTS = [
  { value: 'saved', label: 'Saved' },
  { value: 'lists', label: 'My lists' },
  { value: 'following', label: 'Following' },
];
const SEASON_ORDER = ['Fall', 'Winter', 'Spring', 'Summer'];

// Coming back to the library shows the side you were last on, for as long as the app stays open.
let lastSegment = 'saved';

export default function Favourites({ route }) {
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // Re-tapping this section scrolls back to the top
  const [segment, setSegment] = useState(lastSegment);
  const size = tileWidth(width);

  // Title, subtitle and the switch ease in once; tiles animate only as they first appear.
  const entrance = useEntrance(3);

  const choose = next => {
    lastSegment = next;
    setSegment(next);
  };
  // Another screen can ask for a particular side, e.g. Explore's "Make a list".
  const requested = route?.params?.segment;
  useEffect(() => {
    if (SEGMENTS.some(option => option.value === requested)) choose(requested);
  }, [requested]);
  const open = (route, params) => {
    if (!canNavigate(navigation)) return;
    if (params) navigation.navigate(route, params);
    else navigation.navigate(route);
  };

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}>
        <Animated.View style={entrance[0]}>
          <Text style={styles.title} accessibilityRole="header">Favourites</Text>
        </Animated.View>
        <Animated.View style={entrance[1]}>
          <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
        </Animated.View>
        <Animated.View style={entrance[2]}>
          <SegmentPill options={SEGMENTS} value={segment} onChange={choose} style={styles.segments} />
        </Animated.View>

        {segment === 'saved' ? (
          <Saved onExplore={() => navigation.navigate('HomeTab', { screen: 'SeasonsScreen', initial: false })} />
        ) : segment === 'lists' ? (
          <MyLists size={size} onOpen={list => open('ListScreen', { listId: list.id })}
            onOpenCollection={collection => open(collection.screen)}
            onCreate={() => navigation.navigate('ListDetails')} />
        ) : (
          <Following size={size} onOpen={list => open('ListScreen', { listId: list.id })}
            onOpenPerson={person => open('PersonScreen', { uid: person.uid })}
            onExplore={() => navigation.navigate('ExploreTab', { screen: 'Explore' })} />
        )}
      </ScrollView>
    </SignedInScreen>
  );
}

// Single places: the spots the user made and saved, then the app's spots they hearted, by season.
// Removing one from here offers Undo, and never deletes a spot the user made.
function Saved({ onExplore }) {
  const navigation = useNavigation();
  const [favourites, setFavourites] = useFavouriteSpots();
  const { toggleFavouriteSpot, toggleCustomSpot } = useSaveSpot(favourites, setFavourites);
  const privateSpots = useMySpots();

  // Newest first, so a spot just made is at the top. Someone else's is shown from its public copy.
  const refs = savedCustomSpots(favourites)
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0) || String(a.name).localeCompare(String(b.name)))
    .map(({ id, owner, name }) => ({ k: 'x', id, owner, name }));
  const { entries: custom } = useSpotEntries(refs, { privateSpots });
  const groups = SEASON_ORDER.map(season => ({
    season,
    entries: Object.entries(favourites)
      .filter(([, entry]) => entry?.isFavourite && entry.season === season)
      .map(([name, entry]) => ({ name, entry }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(group => group.entries.length);
  const keys = [...custom.map(({ ref }) => ref.id), ...groups.flatMap(group => group.entries.map(({ name }) => name))];
  const entrance = useItemEntrance(keys);

  const addOwn = (
    <TouchableOpacity style={styles.addOwn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Add Your Own Spot"
      onPress={() => { if (canNavigate(navigation)) navigation.navigate('OwnSpotScreen', { from: 'saved' }); }}>
      <Icon name="add-location-alt" size={22} color={colors.ink} />
      <Text style={styles.addOwnText}>Add Your Own Spot</Text>
    </TouchableOpacity>
  );

  if (!custom.length && !groups.length) {
    return (
      <>
        {addOwn}
        <EmptyCard icon="favorite-border" title="Nothing saved yet" style={styles.afterAction}
          text="Tap the heart on any spot to keep it here, or add a place of your own." actionLabel="Explore Vancouver" onAction={onExplore} />
      </>
    );
  }
  return (
    <>
      {addOwn}
      {custom.length > 0 && (
        <View>
          <Text style={styles.sectionLabel} accessibilityRole="header">Your spots</Text>
          {custom.map(({ ref, spot, details, status }) => (
            <Animated.View key={ref.id} style={entrance.styleFor(ref.id)}>
              <SpotCard spot={status === 'unavailable' ? { ...spot, meta: 'No longer shared' } : spot}
                saved thumbnail={details?.photos?.[0]} onPress={() => openSpot(navigation, ref)}
                onToggleSave={() => toggleCustomSpot(ref)} />
            </Animated.View>
          ))}
        </View>
      )}
      {groups.map(({ season, entries }) => (
        <View key={season}>
          <Text style={styles.sectionLabel} accessibilityRole="header">{season}</Text>
          {entries.map(({ name, entry }) => {
            // A spot SznLuv no longer lists stays here, so it can still be removed.
            const resolved = resolveSpot(catalogueRef(name));
            const spot = { ...resolved, missing: false };
            return (
              <Animated.View key={name} style={entrance.styleFor(name)}>
                <SpotCard spot={spot} saved
                  onPress={() => openSpot(navigation, catalogueRef(name))}
                  onToggleSave={() => toggleFavouriteSpot({ name, season: entry.season, address: entry.location })} />
              </Animated.View>
            );
          })}
        </View>
      ))}
    </>
  );
}

// Collections the user kept with a heart, then the lists they made.
function MyLists({ size, onOpen, onOpenCollection, onCreate }) {
  const { lists, status, retry } = useMyLists();
  const { saved, status: keptStatus, isSaved, retry: retryKept } = useSavedCollections();
  const { toggleHeart } = useCollectionHeart();
  // Oldest first, like lists. One the app no longer makes is left out rather than shown broken.
  const kept = Object.keys(saved)
    .sort((a, b) => (saved[a].savedAt ?? 0) - (saved[b].savedAt ?? 0))
    .map(collectionById)
    .filter(collection => collection && isSaved(collection.id));
  const entrance = useItemEntrance([...kept.map(collection => collection.id), ...lists.map(list => list.id)], { ready: status === 'ready' });

  if (status === 'error') {
    return (
      <EmptyCard icon="cloud-off" title="Couldn’t load your lists"
        text="Check your connection and try again." actionLabel="Try again" onAction={retry} />
    );
  }
  if (status !== 'ready' || keptStatus === 'loading' || keptStatus === 'idle') {
    return <ActivityIndicator style={styles.loading} size="large" color={colors.ink} />;
  }

  const collections = kept.length > 0 && (
    <>
      <Text style={[styles.sectionLabel, styles.firstLabel]} accessibilityRole="header">Collections</Text>
      <View style={styles.grid}>
        {kept.map(collection => (
          <Animated.View key={collection.id} style={entrance.styleFor(collection.id)}>
            <ListTile list={{ title: collection.title, cover: { type: 'season', value: collection.key } }} size={size}
              caption={collectionCaption(collection.id)} onPress={() => onOpenCollection(collection)} />
            <HeartButton style={styles.tileHeart} saved size={20} hitSlop={8}
              label={`Remove ${collection.title} collection from My lists`} onPress={() => toggleHeart(collection.id)} />
          </Animated.View>
        ))}
      </View>
    </>
  );
  const keptProblem = keptStatus === 'error' && (
    <TouchableOpacity style={styles.inlineRetry} onPress={retryKept} accessibilityRole="button">
      <Text style={styles.notice}>Couldn’t load your saved collections. Tap to try again.</Text>
    </TouchableOpacity>
  );

  if (!lists.length) {
    return (
      <>
        {keptProblem}
        {collections}
        {kept.length > 0 && <Text style={styles.sectionLabel} accessibilityRole="header">Your lists</Text>}
        <EmptyCard icon="bookmark-border" title="No lists yet"
          text={kept.length ? 'Make a list for a plan, a mood, or a whole season.'
            : 'Make a list for a plan, a mood, or a whole season. Or tap the heart on a season to keep it here.'}
          actionLabel="New list" onAction={onCreate} />
      </>
    );
  }
  return (
    <>
      {keptProblem}
      {collections}
      {kept.length > 0 && <Text style={styles.sectionLabel} accessibilityRole="header">Your lists</Text>}
      <View style={styles.grid}>
        <NewListTile size={size} onPress={onCreate} />
        {lists.map(list => (
          <Animated.View key={list.id} style={entrance.styleFor(list.id)}>
            <ListTile list={list} size={size} onPress={() => onOpen(list)} />
          </Animated.View>
        ))}
      </View>
    </>
  );
}

// Lists made by other people. Each visit checks they are still shared: one that was made private or
// deleted is dropped, with a line saying so.
function Following({ size, onOpen, onOpenPerson, onExplore }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const [state, setState] = useState({ status: 'loading', lists: [], removed: [], people: [] });
  const entrance = useItemEntrance(state.lists.map(entry => entry.pointer.id), { ready: state.status === 'ready' });

  const load = useCallback(() => {
    let active = true;
    Promise.all([loadFollowedLists(uid, getPublicList), loadFollowedPeople(uid)]).then(([{ lists, removed }, people]) => {
      // The notice about dropped lists stays until this side is left, not just until the next refresh.
      if (active) setState(previous => ({ status: 'ready', lists, people, removed: [...previous.removed, ...removed] }));
    }).catch(error => {
      console.error('Followed lists unavailable:', { code: error?.code });
      if (active) setState(previous => ({ ...previous, status: previous.lists.length ? 'ready' : 'error' }));
    });
    return () => { active = false; };
  }, [uid]);
  useFocusEffect(load);

  if (state.status === 'error') {
    return (
      <EmptyCard icon="cloud-off" title="Couldn’t load the lists you follow"
        text="Check your connection and try again." actionLabel="Try again" onAction={load} />
    );
  }
  if (state.status !== 'ready') return <ActivityIndicator style={styles.loading} size="large" color={colors.ink} />;

  const notice = state.removed.map(title => (
    <Text key={title} style={styles.notice} accessibilityRole="alert">“{title}” is no longer shared.</Text>
  ));
  const people = (
    <>
      <Text style={styles.sectionLabel} accessibilityRole="header">People</Text>
      {state.people.length === 0 ? (
        <EmptyCard icon="person-outline" title="Not following anyone yet"
          text="Follow someone to keep their profile close." actionLabel="Find people" onAction={onExplore} />
      ) : state.people.map(person => <PersonRow key={person.uid} person={person} onPress={() => onOpenPerson(person)} />)}
    </>
  );
  if (!state.lists.length) {
    return (
      <>
        {notice}
        <Text style={[styles.sectionLabel, styles.firstLabel]} accessibilityRole="header">Lists</Text>
        <EmptyCard icon="bookmark-border" title="Not following any lists yet"
          text="Follow a list and it lives here, always up to date." actionLabel="Explore lists" onAction={onExplore} />
        {people}
      </>
    );
  }
  return (
    <>
      {notice}
      <Text style={[styles.sectionLabel, styles.firstLabel]} accessibilityRole="header">Lists</Text>
      <View style={styles.grid}>
        {state.lists.map(({ pointer, list, updated }) => {
          // A list that couldn't be re-read just now is shown from what was saved when it was followed.
          const shown = list ?? pointer;
          return (
            <Animated.View key={pointer.id} style={entrance.styleFor(pointer.id)}>
              <ListTile list={shown} size={size} updated={updated}
                onPress={() => onOpen(pointer)} />
            </Animated.View>
          );
        })}
      </View>
      {people}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: 20, marginBottom: 12, fontSize: 18, fontWeight: '700', color: colors.label },
  firstLabel: { marginTop: 0 },
  notice: { marginBottom: 12, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  container: { flex: 1, backgroundColor: colors.library },
  content: { paddingTop: SCREEN_CONTENT_TOP_GAP, paddingHorizontal: GUTTER, paddingBottom: 24 },
  title: { fontSize: 48, fontWeight: '700', color: '#4A4A4A', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#707070', textAlign: 'center', marginBottom: 24 },
  segments: { marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: GRID_GAP },
  tileHeart: {
    position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  inlineRetry: { minHeight: 44, justifyContent: 'center' },
  // An action, not a spot: the dashed outline of "New list", the full width of the cards below.
  addOwn: {
    minHeight: 52, marginBottom: 4, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9A88F', backgroundColor: 'rgba(255, 249, 241, 0.6)',
  },
  addOwnText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  afterAction: { marginTop: 16 },
  loading: { marginTop: 32 },
});
