// Explore: public lists from other people, a featured list, chips for people you follow and for each season,
// a sort sheet, and a search over lists (by title, creator, spot or town) and people (by username).
// Every card's heart follows the list. Pulling the page down reloads everything on it.
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EmptyCard from '../components/EmptyCard';
import ExploreCard from '../components/ExploreCard';
import ExploreSortSheet, { DEFAULT_EXPLORE_SORT, isDefaultSort } from '../components/ExploreSortSheet';
import { focusAccessibility } from '../components/DiscoveryBottomSheet';
import PersonRow from '../components/PersonRow';
import { useSnackbar } from '../components/Snackbar';
import { GRID_GAP, GUTTER, colors, tileWidth } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { cityName, DEFAULT_CITY } from '../services/catalogue';
import { getCommunityCandidates, getNewestPublicLists, getPublicListsBy, searchPublicLists } from '../services/lists';
import {
  SEASON_NAMES, currentSeason, filterBySeason, mostFollowed, parseQuery, rankLists, sortLists, visibleLists,
} from '../services/listSearch';
import { followList, loadFollowedListIds, loadFollowedPeople, unfollowList } from '../services/follows';
import { EVENTS, track } from '../services/metrics';
import { getBlocked } from '../services/moderation';
import { searchProfiles } from '../services/profiles';
import { canNavigate } from '../services/venueNavigation';

const PAGE = 20;
const DEBOUNCE_MS = 300;
const PEOPLE_SHOWN = 3;
const FOLLOWED_PEOPLE_READ = 10;
const FOLLOWING_SHOWN = 20;
// Read for the featured list and the "Most followed" sort; hiding your own and blocked lists still leaves plenty.
const CANDIDATES = 40;
const SAVE_FAILED = 'Couldn’t save. Check your connection.';
const REFRESH_FAILED = 'Couldn’t refresh. Check your connection.';

const FOR_YOU = 'forYou';
const FOLLOWING = 'following';

// The current season leads, then the rest in the year's order.
function chipOptions(now = new Date()) {
  const start = SEASON_NAMES.indexOf(currentSeason(now));
  const seasons = SEASON_NAMES.map((_, index) => SEASON_NAMES[(start + index) % SEASON_NAMES.length]);
  return [{ value: FOR_YOU, label: 'For you' }, { value: FOLLOWING, label: 'Following' },
    ...seasons.map(season => ({ value: season, label: season }))];
}

function Chips({ options, value, onChange }) {
  const select = option => {
    if (option.value === value) return;
    if (Platform.OS === 'ios') selectionAsync().catch(() => {});
    onChange(option.value);
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}
      contentContainerStyle={styles.chipsContent} accessibilityRole="tablist">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <TouchableOpacity key={option.value} style={[styles.chip, selected && styles.chipSelected]} activeOpacity={0.7}
            accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected }}
            onPress={() => select(option)}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function ListGrid({ lists, width, height, followedIds, onOpen, onToggleFollow }) {
  return (
    <View style={styles.grid}>
      {lists.map(list => (
        <ExploreCard key={list.id} list={list} width={width} height={height} followed={followedIds.has(list.id)}
          onPress={() => onOpen(list)} onToggleFollow={() => onToggleFollow(list)} />
      ))}
    </View>
  );
}

const toggled = (ids, id, on) => {
  const next = new Set(ids);
  if (on) next.add(id); else next.delete(id);
  return next;
};

export default function ExploreScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const { width } = useWindowDimensions();
  const tile = tileWidth(width);
  const heroWidth = width - 2 * GUTTER;
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const sortButton = useRef(null);
  useScrollToTop(scrollRef);
  const entrance = useEntrance(2);
  const chips = useMemo(() => chipOptions(), []);

  const [query, setQuery] = useState('');
  const [chip, setChip] = useState(FOR_YOU);
  const [sort, setSort] = useState(DEFAULT_EXPLORE_SORT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [feed, setFeed] = useState({ status: 'loading', lists: [], more: false });
  const [candidates, setCandidates] = useState({ status: 'loading', lists: [] });
  const [following, setFollowing] = useState({ status: 'loading', people: 0, lists: [] });
  // What you follow now (hearts change it at once), and as it was last loaded ("Hide lists I already follow"
  // uses that one, so a card doesn't vanish the moment you heart it).
  const [followedIds, setFollowedIds] = useState(() => new Set());
  const [loadedFollowedIds, setLoadedFollowedIds] = useState(() => new Set());
  const [results, setResults] = useState({ status: 'idle', lists: [], people: [], query: '' });
  const [allPeople, setAllPeople] = useState(false);
  const feedRequest = useRef(0);
  const refreshRequest = useRef(0);
  const searchRequest = useRef(0);
  const inFlight = useRef(new Set()); // Follow changes in flight, so a double tap doesn't send two
  const searching = !!parseQuery(query);

  const hide = useCallback(lists => visibleLists(lists, { viewerUid: uid, blocked }), [uid, blocked]);

  // The newest lists, a page at a time. Resolves false if the page couldn't be read.
  const loadFeed = useCallback(async after => {
    const request = ++feedRequest.current;
    if (!after) setFeed(previous => ({ ...previous, status: previous.lists.length ? 'ready' : 'loading' }));
    try {
      const page = await getNewestPublicLists({ count: PAGE, after });
      if (request === feedRequest.current) {
        setFeed(previous => ({ status: 'ready', lists: after ? [...previous.lists, ...page] : page, more: page.length === PAGE }));
      }
      return true;
    } catch (error) {
      console.error('Explore feed failed:', { code: error?.code });
      if (request === feedRequest.current) setFeed(previous => ({ ...previous, status: previous.lists.length ? 'ready' : 'error' }));
      return false;
    }
  }, []);

  // Everything on the page at once: on focus, and when the page is pulled down. Resolves false if any part failed;
  // whatever did load is shown, and whatever didn't keeps what was there.
  const refreshAll = useCallback(async () => {
    const request = ++refreshRequest.current;
    const current = () => request === refreshRequest.current;
    const outcomes = await Promise.allSettled([
      loadFeed().then(ok => { if (!ok) throw new Error('feed'); }),
      getBlocked(uid).then(next => { if (current()) setBlocked(next); }),
      loadFollowedListIds(uid).then(ids => {
        if (!current()) return;
        setFollowedIds(new Set(ids));
        setLoadedFollowedIds(new Set(ids));
      }),
      getCommunityCandidates(CANDIDATES)
        .then(lists => { if (current()) setCandidates({ status: 'ready', lists }); })
        .catch(error => {
          if (current()) setCandidates(previous => ({ ...previous, status: previous.lists.length ? 'ready' : 'error' }));
          throw error;
        }),
      loadFollowedPeople(uid)
        .then(people => Promise.all(people.slice(0, FOLLOWED_PEOPLE_READ).map(person => getPublicListsBy(person.uid)))
          .then(theirs => {
            if (!current()) return;
            const lists = sortLists(theirs.flat(), 'newest').slice(0, FOLLOWING_SHOWN);
            setFollowing({ status: 'ready', people: people.length, lists });
          }))
        .catch(error => {
          if (current()) setFollowing(previous => ({ ...previous, status: previous.status === 'ready' ? 'ready' : 'error' }));
          throw error;
        }),
    ]);
    return outcomes.every(outcome => outcome.status === 'fulfilled');
  }, [loadFeed, uid]);

  // Fresh each time Explore comes into view, so a list published a moment ago is there.
  useFocusEffect(useCallback(() => {
    refreshAll();
    return () => { refreshRequest.current += 1; };
  }, [refreshAll]));

  // Re-tapping the Explore slot goes back to the top and into the search field.
  useEffect(() => {
    const tabs = navigation.getParent?.();
    return tabs?.addListener?.('tabPress', () => {
      if (navigation.isFocused()) inputRef.current?.focus();
    });
  }, [navigation]);

  const runSearch = useCallback(async text => {
    const request = ++searchRequest.current;
    setResults(previous => ({ ...previous, status: 'searching' }));
    try {
      const [found, people] = await Promise.all([searchPublicLists(text), searchProfiles(text)]);
      if (request !== searchRequest.current) return true; // A newer search has started
      setResults({ status: 'ready', lists: found, people, query: text });
      setAllPeople(false);
      return true;
    } catch (error) {
      console.error('Explore search failed:', { code: error?.code });
      if (request === searchRequest.current) setResults({ status: 'error', lists: [], people: [], query: text });
      return false;
    }
  }, []);

  useEffect(() => {
    if (!searching) {
      searchRequest.current += 1;
      setResults({ status: 'idle', lists: [], people: [], query: '' });
      return undefined;
    }
    setResults(previous => ({ ...previous, status: 'searching' })); // The field shows it is working straight away
    const timer = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searching, runSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    // A failed search already says so in place of its results; the rest of the page keeps what it showed.
    const ok = searching ? (await runSearch(query), true) : await refreshAll();
    setRefreshing(false);
    if (!ok) snackbar.show({ message: REFRESH_FAILED });
  };

  const open = list => {
    Keyboard.dismiss();
    if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id });
  };
  const openPerson = person => {
    Keyboard.dismiss();
    if (canNavigate(navigation)) navigation.navigate('PersonScreen', { uid: person.uid });
  };

  const toggleFollow = async list => {
    if (inFlight.current.has(list.id)) return;
    inFlight.current.add(list.id);
    const next = !followedIds.has(list.id);
    setFollowedIds(ids => toggled(ids, list.id, next)); // Flips at once; put back if the save fails
    try {
      if (next) {
        await followList(uid, list);
        track(EVENTS.listFollowed, { listId: list.id });
        snackbar.show({ message: 'Following. It’s in Favourites › Following.' });
      } else {
        await unfollowList(uid, list.id);
        snackbar.show({ message: 'Unfollowed' });
      }
    } catch (error) {
      console.error('Explore follow failed:', { code: error?.code });
      setFollowedIds(ids => toggled(ids, list.id, !next));
      snackbar.show({ message: error?.code === 'list/missing' ? error.message : SAVE_FAILED });
    } finally {
      inFlight.current.delete(list.id);
    }
  };

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    requestAnimationFrame(() => focusAccessibility(sortButton.current));
  }, []);

  // ---------------------------------------------------------------- What the page shows

  const awaitingFirstResults = searching && results.status === 'searching' && !results.query;
  const found = rankLists(results.lists, results.query, { viewerUid: uid, blocked });
  const people = results.people.filter(person => person.uid !== uid && !blocked.includes(person.uid));
  const typed = query.trim();

  const byFollowers = sort.sort === 'followed';
  // Picked from the same lists the grid shows; older public lists may carry no cityId, so no city filter here.
  const featured = chip === FOR_YOU
    ? mostFollowed(candidates.lists, { viewerUid: uid, blocked, count: 1 })[0]
    : undefined;
  // Where the grid's lists come from, and whether that source is still loading or failed.
  const source = chip === FOLLOWING
    ? { status: following.status, lists: sortLists(hide(following.lists), sort.sort), more: false }
    : byFollowers
      ? { status: candidates.status, lists: sortLists(hide(candidates.lists), 'followed'), more: false }
      : { status: feed.status, lists: hide(feed.lists), more: feed.more };
  const inChip = chip === FOR_YOU || chip === FOLLOWING ? source.lists : filterBySeason(source.lists, chip);
  const beforeHiding = inChip.filter(list => list.id !== featured?.id);
  const gridLists = sort.hideFollowed ? beforeHiding.filter(list => !loadedFollowedIds.has(list.id)) : beforeHiding;
  const retry = () => refreshAll();

  const heading = chip === FOLLOWING ? 'From people you follow'
    : chip !== FOR_YOU ? `${chip} lists`
      : byFollowers ? 'Most followed' : `New in ${cityName(DEFAULT_CITY.id)}`;

  const renderEmpty = () => {
    if (chip === FOLLOWING && following.people === 0) {
      return (
        <EmptyCard icon="people-outline" title="Not following anyone yet" text="Follow people to see their lists here."
          actionLabel="Find people" onAction={() => inputRef.current?.focus()} />
      );
    }
    if (beforeHiding.length > 0) {
      return (
        <EmptyCard icon="favorite" title="You follow every list here" text="Lists you already follow are hidden."
          actionLabel="Show them" onAction={() => setSort(previous => ({ ...previous, hideFollowed: false }))} />
      );
    }
    if (chip === FOLLOWING) {
      return <EmptyCard icon="bookmark-border" title="Nothing from people you follow yet" text="Lists they make public will show up here." />;
    }
    if (chip !== FOR_YOU) {
      return (
        <EmptyCard icon="search" title={`No ${chip.toLowerCase()} lists yet`}
          text={`Lists made mostly of ${chip.toLowerCase()} spots show up here.`} />
      );
    }
    return (
      <EmptyCard icon="bookmark-border" title="No lists yet" text="Yours could be the first."
        actionLabel="Make a list" onAction={() => navigation.navigate('FavouritesTab', { screen: 'Favourites', params: { segment: 'lists' } })} />
    );
  };

  const browse = (
    <View style={awaitingFirstResults && styles.dimmed}>
      {!!featured && (
        <ExploreCard list={featured} variant="hero" width={heroWidth} height={Math.round(heroWidth * 0.52)}
          followed={followedIds.has(featured.id)} onPress={() => open(featured)} onToggleFollow={() => toggleFollow(featured)} />
      )}
      {!(featured && source.status === 'ready' && gridLists.length === 0) && (
        <Text style={[styles.label, styles.section, !!featured && styles.afterHero]} accessibilityRole="header">{heading}</Text>
      )}
      {source.status === 'loading' ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.ink} />
      ) : source.status === 'error' ? (
        <EmptyCard icon="cloud-off" title="Couldn’t load lists" text="Check your connection and try again."
          actionLabel="Try again" onAction={retry} />
      ) : (
        <>
          {gridLists.length === 0 && !featured ? renderEmpty() : (
            <ListGrid lists={gridLists} width={tile} height={Math.round(tile * 0.8)} followedIds={followedIds}
              onOpen={open} onToggleFollow={toggleFollow} />
          )}
          {source.more && (
            <TouchableOpacity style={styles.more} accessibilityRole="button" onPress={() => loadFeed(feed.lists.at(-1))}>
              <Text style={styles.moreText}>Load more</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  const searchResults = results.status === 'error' ? (
    <EmptyCard icon="cloud-off" title="Couldn’t search" text="Check your connection and try again."
      actionLabel="Try again" onAction={() => runSearch(query)} style={styles.searchState} />
  ) : results.status === 'ready' && found.length === 0 && people.length === 0 ? (
    <EmptyCard icon="search" title={`Nothing for “${typed}”`}
      text="Try a creator’s username, a spot, a town, or a word from a list’s title."
      actionLabel="Clear search" onAction={() => setQuery('')} style={styles.searchState} />
  ) : (
    // While a new search runs, the last results stay in place, dimmed, so nothing jumps.
    <View style={results.status === 'searching' && styles.dimmed}>
      {people.length > 0 && (
        <>
          <Text style={[styles.label, styles.section]} accessibilityRole="header">People</Text>
          {(allPeople ? people : people.slice(0, PEOPLE_SHOWN)).map(person => (
            <PersonRow key={person.uid} person={person} onPress={() => openPerson(person)} />
          ))}
          {!allPeople && people.length > PEOPLE_SHOWN && (
            <TouchableOpacity style={styles.more} accessibilityRole="button" onPress={() => setAllPeople(true)}>
              <Text style={styles.moreText}>See all people</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      {found.length > 0 && (
        <Text style={styles.count} accessibilityLiveRegion="polite">{found.length} {found.length === 1 ? 'list' : 'lists'}</Text>
      )}
      <ListGrid lists={found} width={tile} height={Math.round(tile * 0.8)} followedIds={followedIds}
        onOpen={open} onToggleFollow={toggleFollow} />
    </View>
  );

  const sorted = !isDefaultSort(sort);
  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />}>
        <Animated.View style={entrance[0]}>
          <Text style={styles.title} accessibilityRole="header">Explore</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Icon name="search" size={22} color={colors.muted} accessible={false} importantForAccessibility="no" />
              <TextInput ref={inputRef} style={styles.searchInput} value={query} onChangeText={setQuery}
                placeholder="Search lists and people" placeholderTextColor="#6B635A" accessibilityLabel="Search lists and people"
                autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} />
              {results.status === 'searching' && <ActivityIndicator style={styles.searchSlot} color={colors.ink} />}
              {!!query && results.status !== 'searching' && (
                <TouchableOpacity style={styles.searchSlot} accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
                  <Icon name="cancel" size={20} color={colors.muted} accessible={false} importantForAccessibility="no" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity ref={sortButton} style={[styles.sortButton, sorted && styles.sortActive]}
              accessibilityRole="button" accessibilityState={{ expanded: sheetOpen }}
              accessibilityLabel={sorted ? 'Sort lists, changed' : 'Sort lists'}
              onPress={() => { Keyboard.dismiss(); setSheetOpen(true); }}>
              <Ionicons name="options-outline" size={24} color={sorted ? colors.white : colors.ink} />
              {sorted && <View pointerEvents="none" style={styles.activeDot} />}
            </TouchableOpacity>
          </View>
          {!searching && <Chips options={chips} value={chip} onChange={setChip} />}
        </Animated.View>

        <Animated.View style={entrance[1]}>
          {searching && !awaitingFirstResults ? searchResults : browse}
        </Animated.View>
      </ScrollView>
      {sheetOpen && <ExploreSortSheet value={sort} onApply={setSort} onDismiss={closeSheet} />}
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: GRID_GAP },
  title: { fontSize: 48, fontWeight: '700', color: colors.ink },
  label: { marginTop: 4, fontSize: 18, fontWeight: '700', color: colors.label },
  section: { marginTop: 24, marginBottom: 12 },
  afterHero: { marginTop: 4 },
  searchRow: { marginTop: 16, flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  searchBar: {
    flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 14,
    borderRadius: 24, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  searchInput: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 8, fontSize: 16, color: '#262321' },
  searchSlot: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sortButton: {
    width: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  sortActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  activeDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.snackbarAction },
  // The chip row runs to the screen edges so chips scroll out from under the gutter.
  chips: { marginTop: 14, marginHorizontal: -GUTTER },
  chipsContent: { paddingHorizontal: GUTTER, gap: 8 },
  chip: {
    minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center',
    backgroundColor: colors.segmentTrack, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.segmentRim,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  chipTextSelected: { color: colors.white },
  count: { marginTop: 16, marginBottom: 12, fontSize: 14, fontWeight: '600', color: colors.summary },
  dimmed: { opacity: 0.5 },
  searchState: { marginTop: 16 },
  loading: { marginTop: 32 },
  more: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  moreText: { fontSize: 15, fontWeight: '700', color: colors.ink, textDecorationLine: 'underline' },
});
