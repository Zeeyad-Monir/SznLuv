// The library: season favourites under "Saved", the user's own lists under "My lists",
// and other people's lists they follow under "Following".
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import EmptyCard from '../components/EmptyCard';
import ListTile, { NewListTile } from '../components/ListTile';
import SegmentPill from '../components/SegmentPill';
import { SEASON_ART } from '../components/covers';
import { GRID_GAP, GUTTER, cardShadow, colors, tileWidth } from '../components/theme';
import useEntrance, { useItemEntrance } from '../hooks/useEntrance';
import { AuthContext } from '../contexts/AuthContext';
import useMyLists from '../hooks/useMyLists';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { loadFollowedLists } from '../services/follows';
import { getPublicList } from '../services/lists';
import { canNavigate } from '../services/venueNavigation';

const SEGMENTS = [
  { value: 'saved', label: 'Saved' },
  { value: 'lists', label: 'My lists' },
  { value: 'following', label: 'Following' },
];
const SEASONS = [
  { season: 'Fall', art: SEASON_ART.fall },
  { season: 'Winter', art: SEASON_ART.winter },
  { season: 'Spring', art: SEASON_ART.spring },
  { season: 'Summer', art: SEASON_ART.summer },
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

  // Title, subtitle and the switch ease in once; tiles animate only as they first appear.
  const entrance = useEntrance(3);
  const seasonEntrance = useItemEntrance(SEASONS.map(({ season }) => season));

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
    if (canNavigate(navigation)) navigation.navigate(route, params);
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
          <View style={styles.grid}>
            {SEASONS.map(({ season, art }) => (
              <Animated.View key={season} style={seasonEntrance.styleFor(season)}>
                <TouchableOpacity
                  style={[styles.seasonTile, { width: size, height: size }]}
                  onPress={() => open('SeasonalFavourites', { season })}
                  accessibilityLabel={`View ${season} Favourites`} accessibilityRole="button" activeOpacity={0.7}
                >
                  <ImageBackground source={art} style={styles.seasonArt} imageStyle={styles.seasonImage}>
                    <Text style={styles.seasonText}>{season}</Text>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : segment === 'lists' ? (
          <MyLists size={size} onOpen={list => open('ListScreen', { listId: list.id })}
            onCreate={() => navigation.navigate('ListDetails')} />
        ) : (
          <Following size={size} onOpen={list => open('ListScreen', { listId: list.id })}
            onExplore={() => navigation.navigate('ExploreTab', { screen: 'Explore' })} />
        )}
      </ScrollView>
    </SignedInScreen>
  );
}

function MyLists({ size, onOpen, onCreate }) {
  const { lists, status, retry } = useMyLists();
  const entrance = useItemEntrance(lists.map(list => list.id), { ready: status === 'ready' });

  if (status === 'error') {
    return (
      <EmptyCard icon="cloud-off" title="Couldn’t load your lists"
        text="Check your connection and try again." actionLabel="Try again" onAction={retry} />
    );
  }
  if (status !== 'ready') return <ActivityIndicator style={styles.loading} size="large" color={colors.ink} />;
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
function Following({ size, onOpen, onExplore }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const [state, setState] = useState({ status: 'loading', lists: [], removed: [] });
  const entrance = useItemEntrance(state.lists.map(entry => entry.pointer.id), { ready: state.status === 'ready' });

  const load = useCallback(() => {
    let active = true;
    loadFollowedLists(uid, getPublicList).then(({ lists, removed }) => {
      // The notice about dropped lists stays until this side is left, not just until the next refresh.
      if (active) setState(previous => ({ status: 'ready', lists, removed: [...previous.removed, ...removed] }));
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
  if (!state.lists.length) {
    return (
      <>
        {notice}
        <EmptyCard icon="bookmark-border" title="Not following any lists yet"
          text="Follow a list and it lives here, always up to date." actionLabel="Explore lists" onAction={onExplore} />
      </>
    );
  }
  return (
    <>
      {notice}
      <View style={styles.grid}>
        {state.lists.map(({ pointer, list, updated }) => {
          // A list that couldn't be re-read just now is shown from what was saved when it was followed.
          const shown = list ?? { ...pointer, items: [] };
          const by = `by ${shown.ownerUsername ?? 'someone'}`;
          return (
            <Animated.View key={pointer.id} style={entrance.styleFor(pointer.id)}>
              <ListTile list={shown} size={size} caption={updated ? `Updated · ${by}` : by} badge={updated ? 'dot' : null}
                onPress={() => onOpen(pointer)} />
            </Animated.View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: 12, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  container: { flex: 1, backgroundColor: colors.library },
  content: { paddingTop: 40, paddingHorizontal: GUTTER, paddingBottom: 24 },
  title: { fontSize: 48, fontWeight: '700', color: '#4A4A4A', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#707070', textAlign: 'center', marginBottom: 24 },
  segments: { marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: GRID_GAP },
  seasonTile: { borderRadius: 15, marginBottom: 16, overflow: 'hidden', ...cardShadow },
  seasonArt: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.85 },
  seasonImage: { resizeMode: 'cover' },
  seasonText: {
    fontSize: 25, fontWeight: '700', color: colors.white, textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  loading: { marginTop: 32 },
});
