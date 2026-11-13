import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { SettingsContext } from '../screens/SettingsContext';
import {
  createSpotIndex, DEFAULT_FILTERS, findMatchingSpots, hasActiveFilters, withCurrentPosition, withoutCurrentLocation,
} from '../services/spotDiscovery';
import { followPosition } from '../services/followPosition';

// While a filter is measured from "Current location", the position is followed: a new fix every 100 m moved,
// a fresh one whenever the watch has been quiet for 30 s (see followPosition), and another as soon as the app
// comes back to the front.
const FOLLOW = { accuracy: Location.Accuracy.Balanced, distanceInterval: 100, timeInterval: 10000 };

const DiscoveryContext = createContext();
const DEFAULT_STATE = { query: '', filters: DEFAULT_FILTERS };

export function SpotDiscoveryProvider({ children }) {
  const { isLocationEnabled } = useContext(SettingsContext);
  const [sections, setSections] = useState({});
  const setSection = useCallback((key, patch) => {
    setSections(previous => ({
      ...previous,
      [key]: { ...(previous[key] ?? DEFAULT_STATE), ...patch },
    }));
  }, []);

  const hasCurrentOrigin = Object.values(sections).some(section => section.filters.origin?.source === 'current');
  useEffect(() => {
    if (!hasCurrentOrigin) return;
    const clearCurrentOrigins = () => setSections(previous => Object.fromEntries(
      Object.entries(previous).map(([key, section]) => [
        key, { ...section, filters: withoutCurrentLocation(section.filters) },
      ]),
    ));
    if (!isLocationEnabled) {
      clearCurrentOrigins();
      return;
    }

    let active = true;
    const moveTo = position => {
      if (!active) return;
      const point = { ...position?.coords };
      setSections(previous => {
        let changed = false;
        const next = Object.fromEntries(Object.entries(previous).map(([key, section]) => {
          const filters = withCurrentPosition(section.filters, point);
          if (filters !== section.filters) changed = true;
          return [key, filters === section.filters ? section : { ...section, filters }];
        }));
        return changed ? next : previous;
      });
    };
    // Starts following once; a refused permission found on coming back to the app drops the filters instead.
    let following = null;
    const follow = async ({ clearIfRefused = false } = {}) => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!active) return false;
      if (!granted) {
        if (clearIfRefused) clearCurrentOrigins();
        return false;
      }
      following ??= followPosition(FOLLOW, moveTo);
      return true;
    };
    follow().catch(() => {});
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      follow({ clearIfRefused: true }).then(allowed => allowed
        && Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(moveTo)).catch(() => {});
    });
    return () => {
      active = false;
      following?.remove();
      listener.remove();
    };
  }, [hasCurrentOrigin, isLocationEnabled]);

  const value = useMemo(() => ({ sections, setSection }), [sections, setSection]);
  return createElement(DiscoveryContext.Provider, { value }, children);
}

// Just the search text and filters kept for a section, for a screen that does its own matching (the Map tab).
export function useDiscoveryState(sectionKey) {
  const { sections, setSection } = useContext(DiscoveryContext);
  const { query, filters } = sections[sectionKey] ?? DEFAULT_STATE;
  return {
    query,
    filters,
    setQuery: next => { if (next !== query) setSection(sectionKey, { query: next }); },
    applyFilters: next => { if (next !== filters) setSection(sectionKey, { filters: next }); },
    clearFilters: () => setSection(sectionKey, { filters: DEFAULT_FILTERS }),
  };
}

export default function useSpotDiscovery(sectionKey, categories, config) {
  const { sections, setSection } = useContext(DiscoveryContext);
  const { query, filters } = sections[sectionKey] ?? DEFAULT_STATE;
  const index = useMemo(() => createSpotIndex(categories, config), [categories, config]);
  const matches = useMemo(() => findMatchingSpots(index, query, filters), [index, query, filters]);
  const listRef = useRef(null);

  const update = patch => {
    setSection(sectionKey, patch);
    listRef.current?.scrollTo({ y: 0, animated: false });
  };

  return {
    ...matches,
    listRef,
    query,
    filters,
    index,
    hasActiveFilters: hasActiveFilters(filters),
    setQuery: next => { if (next !== query) update({ query: next }); },
    applyFilters: next => { if (next !== filters) update({ filters: next }); },
    clearFilters: () => update({ filters: DEFAULT_FILTERS }),
  };
}
