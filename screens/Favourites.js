// The library. "Saved" holds what the user hearted: whole collections (a season) and single spots, each with
// a "View all" page. "My lists" holds the lists they made. "Following" is other people's lists.
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import EmptyCard from '../components/EmptyCard';
import ListTile, { NewListTile } from '../components/ListTile';
import SegmentPill from '../components/SegmentPill';
import AddOwnSpotBanner from '../components/AddOwnSpotBanner';
import SavedCollectionCard from '../components/SavedCollectionCard';
import SavedControls, { isNarrowed } from '../components/SavedControls';
import SavedSectionHeader from '../components/SavedSectionHeader';
import SavedSpotRow from '../components/SavedSpotRow';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GRID_GAP, GUTTER, colors, tileWidth } from '../components/theme';
import useEntrance, { useItemEntrance } from '../hooks/useEntrance';
import { AuthContext } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import useMyLists from '../hooks/useMyLists';
import useSavedLibrary from '../hooks/useSavedLibrary';
import useSavedQuery from '../hooks/useSavedQuery';
import { openCollection } from '../services/collections';
import { filterSaved } from '../services/savedLibrary';
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

  // The switch eases in once; tiles animate only as they first appear.
  const entrance = useEntrance(1);

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
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Animated.View style={entrance[0]}>
          <SegmentPill options={SEGMENTS} value={segment} onChange={choose} style={styles.segments} />
        </Animated.View>

        {segment === 'saved' ? (
          <Saved onExplore={() => navigation.navigate('HomeTab', { screen: 'SeasonsScreen', initial: false })} />
        ) : segment === 'lists' ? (
          <MyLists size={size} onOpen={list => open('ListScreen', { listId: list.id })}
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

// Saved: single spots the user hearted, then whole collections they kept. Each is a preview with "View all";
// the search and filters at the top narrow both, and carry over to the full pages.
const SPOT_PREVIEW = 5;
const CAROUSEL_GAP = 12;
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function Saved({ onExplore }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { city } = useCity();
  const library = useSavedLibrary();
  const savedQuery = useSavedQuery();
  const { query, filters } = savedQuery;
  const [sheetOpen, setSheetOpen] = useState(false);
  const narrowed = isNarrowed(query, filters);

  const collections = filterSaved(library.collections, { ...filters, type: 'all', query });
  const spots = filterSaved(library.spots, { ...filters, query });
  const preview = spots.slice(0, SPOT_PREVIEW);
  const entrance = useItemEntrance(preview.map(item => item.key));

  // About two and a half cards across, so the row plainly scrolls.
  const cardWidth = Math.round((width - GUTTER) * 0.4);
  const cardHeight = Math.round(cardWidth * 0.84);

  const go = (route, params) => {
    if (!canNavigate(navigation)) return;
    Keyboard.dismiss();
    if (params) navigation.navigate(route, params);
    else navigation.navigate(route);
  };
  const openItem = item => { Keyboard.dismiss(); openSpot(navigation, item.ref); };
  const openCollectionItem = item => {
    const { screen, params } = openCollection(item.collection);
    go(screen, params);
  };
  const addOwn = <AddOwnSpotBanner onPress={() => go('OwnSpotScreen', { from: 'saved' })} />;

  const collectionsLoading = library.collectionsStatus === 'loading' || library.collectionsStatus === 'idle';
  if (library.spotsLoaded && !collectionsLoading && !library.spots.length && !library.collections.length) {
    return (
      <>
        {addOwn}
        <EmptyCard icon="favorite-border" title="Nothing saved yet" style={styles.afterAction}
          text="Tap the heart on any spot or season to keep it here, or add a place of your own." actionLabel={`Explore ${city.name}`} onAction={onExplore} />
      </>
    );
  }

  const collectionCount = narrowed
    ? plural(collections.length, 'match', 'matches')
    : plural(library.collections.length, 'collection');
  const spotCount = narrowed ? plural(spots.length, 'match', 'matches') : plural(library.spots.length, 'spot');

  let collectionBody;
  if (library.collectionsStatus === 'error' && !library.collections.length) {
    collectionBody = (
      <TouchableOpacity style={styles.inlineRetry} onPress={library.retryCollections} accessibilityRole="button">
        <Text style={styles.notice}>Couldn’t load your saved collections. Tap to try again.</Text>
      </TouchableOpacity>
    );
  } else if (collectionsLoading) {
    collectionBody = <View style={{ height: cardHeight }} />;
  } else if (!library.collections.length) {
    collectionBody = (
      <TouchableOpacity style={styles.hint} onPress={onExplore} accessibilityRole="button" accessibilityLabel="Browse seasons">
        <Icon name="favorite-border" size={22} color={colors.muted} accessible={false} importantForAccessibility="no" />
        <Text style={styles.hintText}>Heart a season to keep the whole collection here.</Text>
        <Icon name="chevron-right" size={20} color={colors.muted} accessible={false} importantForAccessibility="no" />
      </TouchableOpacity>
    );
  } else if (!collections.length) {
    collectionBody = <Text style={styles.noMatch}>No collections match.</Text>;
  } else {
    collectionBody = (
      <FlatList horizontal data={collections} keyExtractor={item => item.key} showsHorizontalScrollIndicator={false}
        style={styles.carousel} contentContainerStyle={styles.carouselContent}
        snapToInterval={cardWidth + CAROUSEL_GAP} decelerationRate="fast" keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <SavedCollectionCard item={item} width={cardWidth} height={cardHeight} compact
            onPress={() => openCollectionItem(item)} onToggle={() => library.toggleCollection(item)} />
        )} />
    );
  }

  let spotBody;
  if (!library.spotsLoaded) spotBody = <ActivityIndicator style={styles.loading} color={colors.ink} />;
  else if (!library.spots.length) spotBody = <Text style={styles.noMatch}>Tap the heart on any spot to keep it here.</Text>;
  else if (!spots.length) spotBody = <Text style={styles.noMatch}>No spots match.</Text>;
  else {
    spotBody = (
      <>
        {preview.map(item => (
          <Animated.View key={item.key} style={entrance.styleFor(item.key)}>
            <SavedSpotRow item={item} onOpen={openItem} onToggle={library.toggleSpot} />
          </Animated.View>
        ))}
        {spots.length > SPOT_PREVIEW && (
          <TouchableOpacity style={styles.more} onPress={() => go('SavedSpots')} accessibilityRole="button">
            <Text style={styles.moreText}>See all {plural(spots.length, narrowed ? 'match' : 'spot', narrowed ? 'matches' : 'spots')}</Text>
            <Icon name="arrow-forward" size={18} color={colors.ink} accessible={false} importantForAccessibility="no" />
          </TouchableOpacity>
        )}
      </>
    );
  }

  return (
    <>
      <SavedControls state={savedQuery} placeholder="Search your saved" sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} style={styles.controls} />

      <SavedSectionHeader title="Saved Spots" subtitle={spotCount}
        viewAllCount={spots.length} onViewAll={() => go('SavedSpots')} />
      <View style={styles.addOwn}>{addOwn}</View>
      {spotBody}

      <View style={styles.divider} />

      <SavedSectionHeader title="Saved Collections" subtitle={collectionCount}
        viewAllCount={collections.length} onViewAll={() => go('SavedCollections')} />
      {collectionBody}
    </>
  );
}

// The lists the user made.
function MyLists({ size, onOpen, onCreate }) {
  const { lists, status, retry } = useMyLists();
  const entrance = useItemEntrance(lists.map(list => list.id), { ready: status === 'ready' });

  if (status === 'error') {
    return (
      <EmptyCard icon="cloud-off" title="Couldn’t load your lists"
        text="Check your connection and try again." actionLabel="Try again" onAction={retry} />
    );
  }
  if (status !== 'ready') {
    return <ActivityIndicator style={styles.loading} size="large" color={colors.ink} />;
  }
  if (!lists.length) {
    return (
      <EmptyCard icon="bookmark-border" title="No lists yet"
        text="Make a list for a plan, a mood, or a whole season." actionLabel="New list" onAction={onCreate} />
    );
  }
  return (
    <View style={styles.grid}>
      <NewListTile size={size} onPress={onCreate} />
      {lists.map(list => (
        <Animated.View key={list.id} style={entrance.styleFor(list.id)}>
          <ListTile list={list} size={size} onPress={() => onOpen(list)} />
        </Animated.View>
      ))}
    </View>
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
  container: { flex: 1, backgroundColor: colors.page },
  content: { paddingTop: SCREEN_CONTENT_TOP_GAP, paddingHorizontal: GUTTER, paddingBottom: 24 },
  // The switch opens the page, with the same gap below it as above it.
  segments: { marginBottom: SCREEN_CONTENT_TOP_GAP, backgroundColor: colors.librarySegmentTrack },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: GRID_GAP },
  inlineRetry: { minHeight: 44, justifyContent: 'center' },
  controls: { marginBottom: 26 },
  // The row runs to the screen's edges, so cards slide out from under the margin rather than stopping at it.
  // Its vertical padding leaves room for the cards' shadows.
  carousel: { marginHorizontal: -GUTTER, marginVertical: -4 },
  carouselContent: { paddingHorizontal: GUTTER, paddingVertical: 4, gap: CAROUSEL_GAP },
  // The spots above end with their own 16-point gap, so 8 more makes 24 above the line as below it.
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginTop: 8, marginBottom: 24 },
  addOwn: { marginBottom: 16 },
  hint: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: colors.field, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.fieldBorder,
  },
  hintText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.muted },
  noMatch: { paddingTop: 4, paddingBottom: 12, fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.muted },
  more: {
    minHeight: 48, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 24,
    backgroundColor: colors.field, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.fieldBorder,
  },
  moreText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  afterAction: { marginTop: 16 },
  loading: { marginTop: 32 },
});
