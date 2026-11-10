// Explore: the newest public lists, lists from people you follow, and a search over lists
// (by title, creator, spot or town) and people (by username).
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EmptyCard from '../components/EmptyCard';
import ListCard from '../components/ListCard';
import PersonRow from '../components/PersonRow';
import { colors } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { cityName, DEFAULT_CITY } from '../services/catalogue';
import { getNewestPublicLists, getPublicListsBy, searchPublicLists } from '../services/lists';
import { parseQuery, rankLists, visibleLists } from '../services/listSearch';
import { loadFollowedPeople } from '../services/follows';
import { getBlocked } from '../services/moderation';
import { searchProfiles } from '../services/profiles';
import { canNavigate } from '../services/venueNavigation';

const PAGE = 20;
const DEBOUNCE_MS = 300;
const PEOPLE_SHOWN = 3;
const FOLLOWED_SHOWN = 6;

export default function ExploreScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  useScrollToTop(scrollRef);
  const entrance = useEntrance(2);

  const [query, setQuery] = useState('');
  const [blocked, setBlocked] = useState([]);
  const [feed, setFeed] = useState({ status: 'loading', lists: [], more: false });
  const [results, setResults] = useState({ status: 'idle', lists: [], people: [], query: '' });
  const [fromFollowed, setFromFollowed] = useState([]);
  const [allPeople, setAllPeople] = useState(false);
  const feedRequest = useRef(0);
  const searchRequest = useRef(0);
  const searching = !!parseQuery(query);

  const hide = useCallback(lists => visibleLists(lists, { viewerUid: uid, blocked }), [uid, blocked]);

  const loadFeed = useCallback(async after => {
    const request = ++feedRequest.current;
    if (!after) setFeed(previous => ({ ...previous, status: previous.lists.length ? 'ready' : 'loading' }));
    try {
      const page = await getNewestPublicLists({ count: PAGE, after });
      if (request !== feedRequest.current) return;
      setFeed(previous => ({ status: 'ready', lists: after ? [...previous.lists, ...page] : page, more: page.length === PAGE }));
    } catch (error) {
      console.error('Explore feed failed:', { code: error?.code });
      if (request === feedRequest.current) setFeed(previous => ({ ...previous, status: previous.lists.length ? 'ready' : 'error' }));
    }
  }, []);

  // Fresh each time Explore comes into view, so a list published a moment ago is there.
  useFocusEffect(useCallback(() => {
    let active = true;
    loadFeed();
    getBlocked(uid).then(setBlocked).catch(() => {});
    // The latest lists from up to five people you follow.
    loadFollowedPeople(uid)
      .then(people => Promise.all(people.slice(0, 5).map(person => getPublicListsBy(person.uid))))
      .then(theirLists => {
        if (active) setFromFollowed(theirLists.flat().sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)).slice(0, FOLLOWED_SHOWN));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [loadFeed, uid]));

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
      const [candidates, people] = await Promise.all([searchPublicLists(text), searchProfiles(text)]);
      if (request !== searchRequest.current) return; // A newer search has started
      setResults({ status: 'ready', lists: candidates, people, query: text });
      setAllPeople(false);
    } catch (error) {
      console.error('Explore search failed:', { code: error?.code });
      if (request === searchRequest.current) setResults({ status: 'error', lists: [], people: [], query: text });
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

  const open = list => {
    Keyboard.dismiss();
    if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id });
  };

  // Until the first results arrive, the newest lists stay on screen (dimmed) instead of a blank page.
  const awaitingFirstResults = searching && results.status === 'searching' && !results.query;
  const feedLists = hide(feed.lists);
  const found = rankLists(results.lists, results.query, { viewerUid: uid, blocked });
  const people = results.people.filter(person => person.uid !== uid && !blocked.includes(person.uid));
  const openPerson = person => {
    Keyboard.dismiss();
    if (canNavigate(navigation)) navigation.navigate('PersonScreen', { uid: person.uid });
  };
  const typed = query.trim();

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Animated.View style={entrance[0]}>
          <Text style={styles.title} accessibilityRole="header">Explore</Text>
          <Text style={styles.label}>Lists and people</Text>
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
        </Animated.View>

        <Animated.View style={entrance[1]}>
          {searching && !awaitingFirstResults ? (
            <>
              {results.status === 'error' ? (
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
                  {found.map(list => <ListCard key={list.id} list={list} onPress={() => open(list)} />)}
                </View>
              )}
            </>
          ) : (
            <View style={awaitingFirstResults && styles.dimmed}>
              {hide(fromFollowed).length > 0 && (
                <>
                  <Text style={[styles.label, styles.section]} accessibilityRole="header">From people you follow</Text>
                  {hide(fromFollowed).map(list => <ListCard key={`followed-${list.id}`} list={list} onPress={() => open(list)} />)}
                </>
              )}
              <Text style={[styles.label, styles.section]} accessibilityRole="header">New in {cityName(DEFAULT_CITY.id)}</Text>
              {feed.status === 'loading' ? (
                <ActivityIndicator style={styles.loading} size="large" color={colors.ink} />
              ) : feed.status === 'error' ? (
                <EmptyCard icon="cloud-off" title="Couldn’t load lists" text="Check your connection and try again."
                  actionLabel="Try again" onAction={() => loadFeed()} />
              ) : feedLists.length === 0 ? (
                <EmptyCard icon="bookmark-border" title="No lists yet" text="Yours could be the first."
                  actionLabel="Make a list" onAction={() => navigation.navigate('FavouritesTab', { screen: 'Favourites', params: { segment: 'lists' } })} />
              ) : (
                <>
                  {feedLists.map(list => <ListCard key={list.id} list={list} onPress={() => open(list)} />)}
                  {feed.more && (
                    <TouchableOpacity style={styles.more} accessibilityRole="button" onPress={() => loadFeed(feed.lists.at(-1))}>
                      <Text style={styles.moreText}>Load more</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  title: { fontSize: 48, fontWeight: '700', color: colors.ink },
  label: { marginTop: 4, fontSize: 18, fontWeight: '700', color: colors.label },
  section: { marginTop: 24, marginBottom: 12 },
  searchBar: {
    marginTop: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 12,
    borderRadius: 12, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  searchInput: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 8, fontSize: 16, color: '#262321' },
  searchSlot: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  count: { marginTop: 16, marginBottom: 12, fontSize: 14, fontWeight: '600', color: colors.summary },
  dimmed: { opacity: 0.5 },
  searchState: { marginTop: 16 },
  loading: { marginTop: 32 },
  more: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  moreText: { fontSize: 15, fontWeight: '700', color: colors.ink, textDecorationLine: 'underline' },
});
