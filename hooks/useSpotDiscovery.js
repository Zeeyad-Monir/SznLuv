import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { SettingsContext } from '../screens/SettingsContext';
import {
  createSpotIndex, DEFAULT_FILTERS, findMatchingSpots, hasActiveFilters, withoutCurrentLocation,
} from '../services/spotDiscovery';

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
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      Location.getForegroundPermissionsAsync().then(({ granted }) => {
        if (active && !granted) clearCurrentOrigins();
      }).catch(() => {});
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, [hasCurrentOrigin, isLocationEnabled]);

  const value = useMemo(() => ({ sections, setSection }), [sections, setSection]);
  return createElement(DiscoveryContext.Provider, { value }, children);
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
