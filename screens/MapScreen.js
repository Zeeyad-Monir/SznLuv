// The Map tab: every spot you've saved, pinned where it is. It opens about 30 km around you, can be dragged and
// zoomed anywhere, and narrows with the same search and filters as the season lists, plus a choice of lists.
//
// What counts as saved is decided in services/mapSpots.js and gathered by hooks/useMapSpots.js. This screen
// only decides what to draw: the spots that survive search and filters, inside the part of the map on screen,
// grouped where they would overlap (services/mapGeometry.js). Moving the map never reads the database.
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import MapView from 'react-native-maps';
import { focusAccessibility } from '../components/DiscoveryBottomSheet';
import { MapCard, MapLocationButton, MapPill, floating } from '../components/map/MapOverlays';
import { ClusterMarker, SpotMapMarker } from '../components/map/SpotMapMarker';
import { useSnackbar } from '../components/Snackbar';
import SpotMapPreview, { PREVIEW_CARD, PREVIEW_LIFT } from '../components/map/SpotMapPreview';
import { FilterButton, SearchBar } from '../components/filters/SearchControls';
import SpotFilterSheet from '../components/SpotFilterSheet';
import { colors } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { describeDistance } from '../hooks/useDistanceTo';
import useMapLocation from '../hooks/useMapLocation';
import useMapSpots from '../hooks/useMapSpots';
import { getReduceMotion } from '../hooks/useReduceMotion';
import { useDiscoveryState } from '../hooks/useSpotDiscovery';
import { useFloatingNavClearance } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { useCity } from '../contexts/CityContext';
import {
  clusterSpots, nudgeIntoFrame, regionAround, regionFor, shiftRegion, spotsInRegion, validRegion,
} from '../services/mapGeometry';
import { mapSections } from '../services/mapSpots';
import {
  createSpotIndex, DEFAULT_FILTERS, distanceKm, findMatchingSpots, hasActiveFilters, widerRadius,
} from '../services/spotDiscovery';
import { openSpot } from '../services/venueNavigation';

const OPENING_RADIUS_KM = 30;
const RESULT_RADIUS_KM = 2;
const FIRST_FIX_MS = 1500; // How long the map waits for a position before opening without one
const SAVE_REGION_MS = 800;
const MOVE_MS = 350;
const SEARCH_ROW = 48;
const EDGE = 12;
const TOP_OVERLAY = EDGE + SEARCH_ROW + 8; // What the search row covers at the top of the map
const MAX_RESULTS = 5;
const NO_LISTS = [];
const MAP_FILTERS = { ...DEFAULT_FILTERS, listIds: NO_LISTS };
// Search the way Fall does: names, places, descriptions and the hidden tags, ranked.
const MAP_SEARCH = { rankSearch: true, alphabetical: false };
const regionKey = uid => `map.region.${uid}`;
const coordinateOf = spot => ({ latitude: spot.latitude, longitude: spot.longitude });
const countOf = total => `${total} ${total === 1 ? 'spot' : 'spots'}`;

export default function MapScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { city } = useCity();
  const uid = user?.uid;
  const screen = useWindowDimensions();
  const clearance = useFloatingNavClearance();
  const focused = useIsFocused();
  const snackbar = useSnackbar();
  const { query, filters, setQuery, applyFilters, clearFilters } = useDiscoveryState('map');
  const listIds = filters.listIds ?? NO_LISTS;
  const data = useMapSpots(listIds);
  const location = useMapLocation(focused);

  const map = useRef(null);
  const filterButton = useRef(null);
  const moved = useRef(false); // Once the user has moved the map, it is never moved for them again
  const fitted = useRef(false);
  const latestRegion = useRef(null);
  const saveTimer = useRef(null);
  const focusFrame = useRef(null);
  const [size, setSize] = useState({ width: screen.width, height: screen.height });
  const [remembered, setRemembered] = useState(undefined); // The last view on this phone; undefined while it is read
  const [waited, setWaited] = useState(false);
  const [opening, setOpening] = useState(null);
  const [region, setRegion] = useState(null);
  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const selectedNow = useRef(null);
  selectedNow.current = selectedKey;
  // The part of the map that isn't under the search row or the tab bar. Regions the map reports, and the
  // ones it is asked to show, describe this part.
  const clear = useMemo(() => ({ width: size.width, height: Math.max(1, size.height - TOP_OVERLAY - clearance) }), [size, clearance]);
  const aspect = clear.height / Math.max(1, clear.width);

  // ---------------------------------------------------------------- Where the map opens

  useEffect(() => {
    let active = true;
    setRemembered(undefined);
    AsyncStorage.getItem(regionKey(uid)).then(saved => {
      const parsed = saved ? JSON.parse(saved) : null;
      if (active) setRemembered(validRegion(parsed) ? parsed : null);
    }).catch(() => { if (active) setRemembered(null); });
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), FIRST_FIX_MS);
    return () => clearTimeout(timer);
  }, []);

  // Around you when location is on. Otherwise the last view, and failing that the city (until saved spots
  // arrive to be fitted, below). A position, or the phone's permission question, is only waited for briefly:
  // the map opens behind it and centres once the answer comes.
  useEffect(() => {
    if (opening || remembered === undefined) return;
    if (location.coords) setOpening(regionAround(location.coords, OPENING_RADIUS_KM, aspect));
    else if (location.status === 'off' || waited) setOpening(remembered ?? regionAround(city, OPENING_RADIUS_KM, aspect));
  }, [opening, remembered, location.status, location.coords, waited, aspect, city]);

  const wanted = useRef(null); // Where the map was last asked to go
  const move = useCallback(next => {
    wanted.current = next;
    latestRegion.current = next;
    map.current?.animateToRegion?.(next, getReduceMotion() ? 0 : MOVE_MS);
  }, []);

  // iOS places the opening region before the map has its size, which leaves it off-centre. Once the map is
  // ready and laid out, it is put where it was meant to be.
  const placed = useRef(false);
  useEffect(() => {
    if (!ready || !laidOut || !opening || placed.current) return;
    placed.current = true;
    if (!moved.current) map.current?.animateToRegion?.(wanted.current ?? opening, 0);
  }, [ready, laidOut, opening]);

  // A position that arrives after the map has opened still centres it, unless the user got there first.
  const centred = useRef(false);
  useEffect(() => {
    if (!opening || !location.coords || centred.current) return;
    centred.current = true;
    const here = regionAround(location.coords, OPENING_RADIUS_KM, aspect);
    const openedHere = Math.abs(opening.latitude - here.latitude) < 1e-6 && Math.abs(opening.longitude - here.longitude) < 1e-6;
    if (!openedHere && !moved.current) move(here);
  }, [opening, location.coords, aspect, move]);

  // ---------------------------------------------------------------- What is on the map

  // A list that was picked and is now gone (unfollowed, deleted, made private) leaves the filter by itself.
  useEffect(() => {
    if (data.selection !== listIds) applyFilters({ ...filters, listIds: data.selection });
  });

  const index = useMemo(() => createSpotIndex(mapSections(data.pins), MAP_SEARCH), [data.pins]);
  const matched = useMemo(
    () => findMatchingSpots(index, query, filters).sections.flatMap(section => section.spots),
    [index, query, filters],
  );
  const searching = !!query.trim();
  const filtering = hasActiveFilters(filters);
  const selected = selectedKey ? matched.find(spot => spot.key === selectedKey) ?? null : null;

  // A spot that is unsaved, or filtered out, while its preview is open takes the preview with it.
  useEffect(() => {
    if (selectedKey && !selected && data.status === 'ready') setSelectedKey(null);
  }, [selectedKey, selected, data.status]);

  const view = region ?? opening;
  const inView = useMemo(() => (view ? spotsInRegion(matched, view) : NO_LISTS), [matched, view]);
  const markers = useMemo(() => {
    if (!view) return NO_LISTS;
    const shown = selected && !inView.includes(selected) ? [...inView, selected] : inView;
    return clusterSpots(shown, view, { width: size.width, pinnedKey: selectedKey });
  }, [inView, selected, selectedKey, view, size.width]);

  // On iOS a marker added while the map is still is only put in place the next time the map redraws, so a
  // pin, count or preview that has just been added can stay hidden until the map is touched. Changing the
  // map's bottom padding by half a point whenever the markers change makes it redraw without moving.
  const drawn = markers.map(item => (item.type === 'cluster' ? item.id : `${item.spot.key}:${item.spot.key === selectedKey}`)).join('|')
    + `#${selected?.key ?? ''}`;
  const [redraws, setRedraws] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'ios') setRedraws(count => count + 1);
  }, [drawn]);

  const distanceTo = spot => (location.coords ? describeDistance(distanceKm(location.coords, spot)) : null);

  // ---------------------------------------------------------------- Moving the map

  const fitPadding = { top: TOP_OVERLAY + 56, right: 56, bottom: clearance + 56, left: 56 };
  const fitTo = (points, animated = !getReduceMotion()) => {
    if (!points.length) return;
    const first = points[0];
    if (points.every(point => Math.abs(point.latitude - first.latitude) < 1e-5 && Math.abs(point.longitude - first.longitude) < 1e-5)) {
      move(regionAround(first, 0.15, aspect));
    } else {
      map.current?.fitToCoordinates?.(points.map(coordinateOf), { edgePadding: fitPadding, animated });
    }
  };

  // With no location and no remembered view, the first look is at the saved spots themselves.
  useEffect(() => {
    if (!ready || fitted.current || moved.current || location.status !== 'off' || remembered || !matched.length) return;
    fitted.current = true;
    const around = regionFor(matched);
    if (around) move(around);
  }, [ready, location.status, remembered, matched, move]);

  const onRegionChangeComplete = (next, details) => {
    if (!validRegion(next)) return;
    if (details?.isGesture) moved.current = true;
    latestRegion.current = next;
    setRegion(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(regionKey(uid), JSON.stringify(next)).catch(() => {});
    }, SAVE_REGION_MS);
  };
  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    cancelAnimationFrame(focusFrame.current);
  }, []);

  // The saved lists are read again when the tab is opened after a while (hooks/useMapSpots.js decides when).
  const { refresh } = data;
  useEffect(() => { if (focused) refresh(); }, [focused, refresh]);

  // Slides the map just far enough that the preview isn't under the search bar, the edges or the tab bar.
  const keepPreviewVisible = async spot => {
    const point = await map.current?.pointForCoordinate?.(coordinateOf(spot));
    const from = latestRegion.current;
    if (!point || !from || selectedNow.current !== spot.key) return;
    const frame = { top: TOP_OVERLAY + 8, bottom: size.height - clearance - 8, left: EDGE, right: size.width - EDGE };
    const { dx, dy } = nudgeIntoFrame(point, PREVIEW_CARD, frame, PREVIEW_LIFT);
    if (dx || dy) move(shiftRegion(from, dx, dy, clear));
  };

  const selectPin = spot => {
    Keyboard.dismiss();
    setResultsOpen(false);
    setSelectedKey(spot.key);
    selectedNow.current = spot.key;
    keepPreviewVisible(spot).catch(() => {});
  };

  // A search result: fly to it, close enough that its own pin shows, and open its preview.
  const showResult = spot => {
    Keyboard.dismiss();
    setResultsOpen(false);
    moved.current = true;
    setSelectedKey(spot.key);
    const close = regionAround(spot, RESULT_RADIUS_KM, aspect);
    const current = latestRegion.current;
    const span = current && current.longitudeDelta < close.longitudeDelta ? current : close;
    // A little above centre is left free for the card.
    move(shiftRegion({ ...span, ...coordinateOf(spot) }, 0, -PREVIEW_CARD.height / 2, clear));
  };

  const openCluster = cluster => {
    moved.current = true;
    setSelectedKey(null);
    fitTo(cluster.spots);
  };

  const recentre = () => {
    if (location.status !== 'on') { location.enable(); return; }
    if (!location.coords) {
      snackbar.show({ message: 'Still finding your location. Try again in a moment.' });
      return;
    }
    moved.current = true;
    const home = regionAround(location.coords, OPENING_RADIUS_KM, aspect);
    const current = latestRegion.current;
    // Zoomed in closer than the opening view stays that close; only the centre changes.
    move(current && current.longitudeDelta < home.longitudeDelta ? { ...current, ...location.coords } : home);
  };

  const showSavedSpots = () => {
    moved.current = true;
    fitTo(matched);
  };

  const onMapPress = event => {
    if (event?.nativeEvent?.action === 'marker-press') return;
    Keyboard.dismiss();
    setResultsOpen(false);
    setSelectedKey(null);
  };

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    focusFrame.current = requestAnimationFrame(() => focusAccessibility(filterButton.current));
  }, []);

  const changeQuery = next => {
    setQuery(next);
    setResultsOpen(true);
    if (selectedKey) setSelectedKey(null);
  };

  // ---------------------------------------------------------------- What to say

  const settled = data.status === 'ready';
  const nothingSaved = settled && !data.failed && !searching && !filtering && data.savedCount === 0;
  const nothingPlaced = settled && !data.failed && !searching && !filtering && data.savedCount > 0 && data.pins.length === 0;
  const noMatch = settled && !nothingSaved && !nothingPlaced && (searching || filtering) && matched.length === 0;
  const showResults = searching && resultsOpen && matched.length > 0;

  // A distance limit is named in what the map says, and widening it is offered when nothing is that close.
  const radius = filters.origin && filters.radiusKm != null ? filters.radiusKm : null;
  const wider = radius !== null ? widerRadius(radius) : null;

  let pill = null;
  if (data.failed) {
    pill = <MapPill alert message="Couldn’t load some saved spots" actionLabel="Try again" onAction={data.retry} />;
  } else if (!settled) {
    pill = <MapPill busy message="Loading your saved spots…" />;
  } else if (matched.length > 0 && ready && region && inView.length === 0) {
    pill = <MapPill message="No saved spots in this area" actionLabel="Show saved spots" onAction={showSavedSpots} />;
  } else if (filtering && matched.length > 0) {
    pill = <MapPill message={radius !== null ? `${countOf(matched.length)} within ${radius} km`
      : `${countOf(matched.length)} ${matched.length === 1 ? 'matches' : 'match'} your filters`} actionLabel="Clear filters" onAction={clearFilters} />;
  } else if (location.status === 'off' && !nothingSaved) {
    pill = <MapPill message="Location is off" actionLabel="Turn on" onAction={location.enable} />;
  }

  return (
    <SignedInScreen style={styles.screen}>
      <View style={styles.frame} testID="map-frame" onLayout={({ nativeEvent }) => setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })}>
        {opening && (
          <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={opening} testID="saved-spots-map"
            showsUserLocation={location.status === 'on'} showsMyLocationButton={false} toolbarEnabled={false}
            pitchEnabled={false} moveOnMarkerPress={false}
            mapPadding={{ top: TOP_OVERLAY, right: 0, bottom: clearance + (redraws % 2) / 2, left: 0 }}
            onMapReady={() => setReady(true)} onLayout={() => setLaidOut(true)}
            // Any touch on the map counts as the user taking over: iOS doesn't say which region changes were theirs.
            onTouchStart={() => { moved.current = true; }} onPanDrag={() => { moved.current = true; }}
            onRegionChangeComplete={onRegionChangeComplete} onPress={onMapPress}>
            {markers.map(item => (item.type === 'cluster'
              ? <ClusterMarker key={item.id} cluster={item} onPress={openCluster} />
              : <SpotMapMarker key={`${item.spot.key}:${item.spot.key === selectedKey ? 'on' : 'off'}`}
                spot={item.spot} selected={item.spot.key === selectedKey} onPress={selectPin} />))}
            {selected && (
              <SpotMapPreview key={selected.key} spot={selected} distance={distanceTo(selected)}
                onPress={spot => openSpot(navigation, spot.ref)} />
            )}
          </MapView>
        )}

        <View pointerEvents="box-none" style={styles.top}>
          <View style={styles.searchRow}>
            <SearchBar value={query} onChangeText={changeQuery} placeholder="Search saved spots"
              style={[styles.search, floating]} onFocus={() => setResultsOpen(true)} />
            <FilterButton ref={filterButton} active={filtering} expanded={sheetOpen} style={[styles.filter, floating]}
              onPress={() => { Keyboard.dismiss(); setResultsOpen(false); setSheetOpen(true); }} />
          </View>
          {showResults ? (
            <View style={[styles.results, floating]}>
              <Text style={styles.resultCount} accessibilityLiveRegion="polite">{countOf(matched.length)} found</Text>
              {matched.slice(0, MAX_RESULTS).map(spot => (
                <TouchableOpacity key={spot.key} style={styles.result} accessibilityRole="button"
                  accessibilityLabel={`${spot.name}. Show on map`} onPress={() => showResult(spot)}>
                  <Text style={styles.resultName} numberOfLines={1}>{spot.name}</Text>
                  {!![spot.locality, distanceTo(spot)].filter(Boolean).length && (
                    <Text style={styles.resultMeta} numberOfLines={1}>{[spot.locality, distanceTo(spot)].filter(Boolean).join(' · ')}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : pill}
        </View>

        {(nothingSaved || nothingPlaced || noMatch) && (
          <View pointerEvents="box-none" style={styles.centre}>
            {nothingSaved && (
              <MapCard icon="map" title="Your map is looking a little empty."
                text="Save your favourite spots to see them here."
                actions={[{ label: 'Explore spots', primary: true, onPress: () => navigation.navigate('HomeTab', { screen: 'SeasonsScreen', initial: false }) }]} />
            )}
            {nothingPlaced && (
              <MapCard icon="place" title="Nothing to pin yet"
                text="The spots you’ve saved don’t have a place on the map yet. They’re still in Favourites." />
            )}
            {noMatch && (
              <MapCard icon="search" title={filtering ? 'No saved spots match your filters.' : 'No saved spots match your search.'}
                text={radius !== null ? `No saved spots within ${radius} km of ${filters.origin.label}. Widen the distance or clear filters.`
                  : 'Try a different search or adjust your filters.'}
                actions={[
                  ...(wider ? [{ label: `Widen to ${wider} km`, primary: true, onPress: () => applyFilters({ ...filters, radiusKm: wider }) }] : []),
                  ...(searching ? [{ label: 'Clear search', onPress: () => setQuery('') }] : []),
                  ...(filtering ? [{ label: 'Clear filters', onPress: clearFilters }] : []),
                ]} />
            )}
          </View>
        )}

        {opening && (
          <MapLocationButton locationOn={location.status === 'on'} onPress={recentre}
            style={[styles.locate, { bottom: clearance + EDGE }]} />
        )}
      </View>

      {sheetOpen && (
        <SpotFilterSheet filters={{ ...MAP_FILTERS, ...filters }} index={index} collections={data.options}
          showSort={false} defaults={MAP_FILTERS} onApply={applyFilters} onDismiss={closeSheet}
          distanceUnavailable="Distance filters need a saved spot on the map." />
      )}
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  // The colour of the map before its tiles arrive, so opening the tab never flashes white.
  frame: { flex: 1, backgroundColor: '#E8E1D5', overflow: 'hidden' },
  top: { position: 'absolute', top: EDGE, left: 16, right: 16, gap: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  search: { minHeight: SEARCH_ROW, borderRadius: SEARCH_ROW / 2, paddingLeft: 16, backgroundColor: '#FFFCF7', borderColor: colors.surfaceBorder },
  filter: { minWidth: SEARCH_ROW, minHeight: SEARCH_ROW, borderRadius: SEARCH_ROW / 2, backgroundColor: '#FFFCF7', borderColor: colors.surfaceBorder },
  results: { borderRadius: 18, paddingVertical: 6, backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: colors.surfaceBorder },
  resultCount: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13, fontWeight: '600', color: colors.muted },
  result: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 6, justifyContent: 'center' },
  resultName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  resultMeta: { marginTop: 1, fontSize: 13, fontWeight: '500', color: colors.muted },
  centre: { position: 'absolute', top: TOP_OVERLAY + 64, left: 24, right: 24 },
  locate: { position: 'absolute', right: 16 },
});
