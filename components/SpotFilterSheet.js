import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, Linking, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SettingsContext } from '../screens/SettingsContext';
import {
  DEFAULT_FILTERS, RADIUS_DEFAULT, hasCoordinates, isApproximate, usesOrigin, withCurrentPosition, withoutCurrentLocation,
} from '../services/spotDiscovery';
import { customLocationAvailable, findCustomOrigins, getCurrentOrigin } from '../services/spotLocation';
import { getReduceMotion } from '../hooks/useReduceMotion';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';
import FilterOption from './filters/FilterOption';
import FilterSection from './filters/FilterSection';
import ListPicker from './filters/ListPicker';
import RadiusSlider from './filters/RadiusSlider';
import SheetFooter from './filters/SheetFooter';
import shared from './filters/styles';
import { colors } from './theme';

const EMPTY_LOOKUP = { pending: false, matches: [], error: null };

// The Map tab adds to the same sheet: `collections` ([{ id, title, caption }]) puts "Lists & collections"
// first and keeps the picks in `filters.listIds`; `showSort={false}` drops sorting, which a map
// has no use for; `defaults` is what Reset goes back to.
export default function SpotFilterSheet({
  filters, index, onApply, onDismiss, collections = null, showSort = true, defaults = DEFAULT_FILTERS,
  distanceUnavailable = 'Distance filters are unavailable for this season.',
}) {
  const { isLocationEnabled, setIsLocationEnabled } = useContext(SettingsContext);
  const [draft, setDraft] = useState(filters);
  const [source, setSource] = useState(filters.origin?.source ?? null);
  const [customText, setCustomText] = useState(filters.origin?.source === 'custom' ? filters.origin.label : '');
  const [lookup, setLookup] = useState(EMPTY_LOOKUP);
  const request = useRef(null);
  const scroll = useRef(null);
  const layout = useRef({ sectionY: 0, inputY: 0 });
  const appliedOrigin = useRef(filters.origin);
  // Turning the distance limit off and on again brings back the last distance chosen.
  const lastRadius = useRef(filters.radiusKm ?? RADIUS_DEFAULT);
  // When the limit was turned on. For a moment after, the sheet follows its growing content down, so the
  // slider, and the location lines that appear above it as the fix arrives, end up in view.
  const revealSlider = useRef(0);

  const cancelLookup = useCallback(() => {
    request.current?.abort();
    request.current = null;
  }, []);
  useEffect(() => cancelLookup, [cancelLookup]);
  useEffect(() => {
    if (!isLocationEnabled || (appliedOrigin.current?.source === 'current' && !filters.origin)) {
      setDraft(withoutCurrentLocation);
    } else if (filters.origin?.source === 'current') {
      // The applied position moved while the sheet is open: the draft follows, so Apply keeps the new fix.
      setDraft(previous => withCurrentPosition(previous, { ...filters.origin, accuracy: filters.origin.accuracyM }));
    }
    appliedOrigin.current = filters.origin;
  }, [filters.origin, isLocationEnabled]);

  const update = patch => setDraft(previous => ({ ...previous, ...patch }));

  const reset = () => {
    cancelLookup();
    Keyboard.dismiss();
    setDraft(defaults);
    setSource(null);
    setCustomText('');
    setLookup(EMPTY_LOOKUP);
  };

  const selectSource = next => {
    if (next === source) return;
    cancelLookup();
    setSource(next);
    setLookup(EMPTY_LOOKUP);
    update({ origin: null });
  };

  const runLookup = async (load, receive) => {
    cancelLookup();
    Keyboard.dismiss();
    const controller = new AbortController();
    request.current = controller;
    setLookup({ ...EMPTY_LOOKUP, pending: true });
    update({ origin: null });
    try {
      const result = await load(controller.signal);
      if (!controller.signal.aborted) receive(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        setLookup({ ...EMPTY_LOOKUP, error: error?.action !== undefined
          ? error : { message: 'Location is unavailable. Try again or choose a custom location.' } });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  };

  const useCurrent = () => runLookup(getCurrentOrigin, origin => {
    if (!isLocationEnabled) setIsLocationEnabled(true);
    update({ origin });
    setLookup(EMPTY_LOOKUP);
  });

  const useCustom = () => {
    if (!customLocationAvailable || !customText.trim() || lookup.pending) return;
    runLookup(signal => findCustomOrigins(customText, signal), matches => {
      setLookup(matches.length ? { ...EMPTY_LOOKUP, matches } : {
        ...EMPTY_LOOKUP,
        error: { message: 'No locations found. Try adding a city or a more specific address.' },
      });
    });
  };

  const editCustom = text => {
    cancelLookup();
    setCustomText(text);
    setLookup(EMPTY_LOOKUP);
    update({ origin: null });
  };

  const chooseCustom = ({ key, ...origin }) => {
    setCustomText(origin.label);
    setLookup(EMPTY_LOOKUP);
    update({ origin });
  };

  const toggleCategory = title => setDraft(previous => ({
    ...previous,
    categories: previous.categories.includes(title)
      ? previous.categories.filter(category => category !== title)
      : [...previous.categories, title],
  }));

  const pickedLists = draft.listIds ?? [];
  const toggleList = ({ id }) => setDraft(previous => {
    const picked = previous.listIds ?? [];
    return { ...previous, listIds: picked.includes(id) ? picked.filter(other => other !== id) : [...picked, id] };
  });

  const chooseCurrent = () => {
    selectSource('current');
    if (isLocationEnabled && (source !== 'current' || (!lookup.pending && !draft.origin))) useCurrent();
  };

  // On, with no place chosen yet, it starts from where you are (asking first if location is off).
  const limitDistance = on => {
    if (!on) {
      lastRadius.current = draft.radiusKm ?? lastRadius.current;
      update({ radiusKm: null });
      return;
    }
    update({ radiusKm: lastRadius.current });
    revealSlider.current = Date.now();
    if (!source) chooseCurrent();
  };
  const setRadius = radiusKm => {
    lastRadius.current = radiusKm;
    update({ radiusKm });
  };

  const needsOrigin = usesOrigin(draft) && !hasCoordinates(draft.origin);
  const canApply = !lookup.pending && !needsOrigin;
  const sortOptions = [{ value: 'catalogue', label: 'Catalogue order' }];
  if (index.alphabetical) sortOptions.push({ value: 'alphabetical', label: 'A–Z' });
  if (index.supportsDistance) sortOptions.push({ value: 'nearest', label: 'Nearest' });

  const limited = draft.radiusKm !== null;

  return (
    <DiscoveryBottomSheet title="Filter spots" onClosing={cancelLookup} onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView ref={scroll} style={shared.body} contentContainerStyle={shared.bodyContent}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            onContentSizeChange={() => {
              if (Date.now() - revealSlider.current > 1500) return;
              scroll.current?.scrollToEnd?.({ animated: !getReduceMotion() });
            }}>
            {!!collections && (
              <ListPicker first title="Lists & collections" items={collections} selectedIds={pickedLists}
                onToggle={toggleList} onClear={() => update({ listIds: [] })}
                emptyText="No saved lists yet. Lists you make, follow or keep with a heart show up here." />
            )}
            {index.categoryOptions.length > 0 && (
              <FilterSection title="Categories" first={!collections}>
                <View style={shared.options}>
                  <FilterOption label="All categories" selected={!draft.categories.length}
                    onPress={() => update({ categories: [] })} />
                  {index.categoryOptions.map(title => (
                    <FilterOption key={title} label={title} selected={draft.categories.includes(title)}
                      onPress={() => toggleCategory(title)} />
                  ))}
                </View>
              </FilterSection>
            )}
            {showSort && sortOptions.length > 1 && (
              <FilterSection title="Sort by">
                <View style={shared.options}>
                  {sortOptions.map(({ value, label }) => (
                    <FilterOption key={value} label={label} selected={draft.sort === value}
                      onPress={() => update({ sort: value })} />
                  ))}
                </View>
              </FilterSection>
            )}
            <FilterSection title="Location & distance" first={!collections && !index.categoryOptions.length && !(showSort && sortOptions.length > 1)}
              onLayout={event => { layout.current.sectionY = event.nativeEvent.layout.y; }}>
              {index.supportsDistance ? (
                <>
                  <View style={shared.options}>
                    <FilterOption label="Current location" selected={source === 'current'} onPress={chooseCurrent} />
                    <FilterOption label="Custom location" selected={source === 'custom'}
                      onPress={() => selectSource('custom')} />
                  </View>
                  {source === 'current' && !lookup.pending && (
                    <>
                      {!isLocationEnabled && <Text style={shared.hint}>This also turns on Allow Location Services in Profile.</Text>}
                      <TouchableOpacity accessibilityRole="button" style={shared.inlineAction} onPress={useCurrent}>
                        <Text style={[shared.actionText, shared.underlined]}>{!isLocationEnabled ? 'Enable and use current location'
                          : draft.origin ? 'Refresh current location' : 'Use current location'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {source === 'custom' && (customLocationAvailable ? (
                    <>
                      <TextInput style={shared.field} value={customText} onChangeText={editCustom}
                        placeholder="City, address or place" placeholderTextColor={colors.placeholder}
                        accessibilityLabel="Custom location search" autoCorrect={false}
                        onLayout={event => { layout.current.inputY = event.nativeEvent.layout.y; }}
                        onFocus={() => scroll.current?.scrollTo({
                          y: Math.max(0, layout.current.sectionY + layout.current.inputY - 8),
                          animated: !getReduceMotion(),
                        })}
                        returnKeyType="search" onSubmitEditing={useCustom} />
                      <TouchableOpacity accessibilityRole="button" style={shared.inlineAction} onPress={useCustom}
                        disabled={lookup.pending || !customText.trim()}>
                        <Text style={[shared.actionText, shared.underlined, (lookup.pending || !customText.trim()) && shared.muted]}>Find location</Text>
                      </TouchableOpacity>
                      {lookup.matches.map(match => (
                        <TouchableOpacity key={match.key} accessibilityRole="button"
                          onPress={() => chooseCustom(match)} style={styles.match}>
                          <Text style={styles.matchText}>{match.label}</Text>
                        </TouchableOpacity>
                      ))}
                      {(lookup.matches.length > 0 || draft.origin) && (
                        <Text style={styles.attribution}>
                          <Text accessibilityRole="link" onPress={() => Linking.openURL('https://www.geoapify.com/').catch(() => {})}>Geoapify</Text>
                          {' · '}
                          <Text accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}>© OpenStreetMap contributors</Text>
                        </Text>
                      )}
                    </>
                  ) : <Text style={shared.hint}>Custom location lookup is currently unavailable.</Text>)}
                  {lookup.pending && (
                    <View style={shared.loading} accessibilityLiveRegion="polite">
                      <ActivityIndicator color={colors.ink} />
                      <Text style={shared.hint}>{source === 'current' ? 'Getting current location…' : 'Looking up location…'}</Text>
                    </View>
                  )}
                  {!!lookup.error && <Text style={shared.error} accessibilityRole="alert">{lookup.error.message}</Text>}
                  {lookup.error?.action === 'settings' && (
                    <TouchableOpacity accessibilityRole="button" style={shared.inlineAction}
                      onPress={() => Linking.openSettings().catch(() => {})}>
                      <Text style={[shared.actionText, shared.underlined]}>Open device settings</Text>
                    </TouchableOpacity>
                  )}
                  {!!draft.origin && <Text style={shared.emphasis}>Measuring from {draft.origin.label}</Text>}
                  {isApproximate(draft.origin) && (
                    <>
                      <Text style={shared.hint} accessibilityLiveRegion="polite">
                        Your phone is only sharing an approximate location (within about {Math.max(1, Math.round(draft.origin.accuracyM / 1000))} km), so
                        distances may be off. Turn on Precise Location for SznLuv in Settings for exact results.
                      </Text>
                      {lookup.error?.action !== 'settings' && (
                        <TouchableOpacity accessibilityRole="button" style={shared.inlineAction}
                          onPress={() => Linking.openSettings().catch(() => {})}>
                          <Text style={[shared.actionText, shared.underlined]}>Open device settings</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                  <View style={[shared.switchRow, styles.limit]}>
                    <Text style={shared.switchLabel}>Limit by distance</Text>
                    <Switch value={limited} onValueChange={limitDistance} accessibilityLabel="Limit by distance"
                      trackColor={{ true: colors.ink }} />
                  </View>
                  {limited && <RadiusSlider value={draft.radiusKm} onChange={setRadius} disabled={lookup.pending} />}
                </>
              ) : <Text style={shared.hint}>{distanceUnavailable}</Text>}
            </FilterSection>
          </ScrollView>
          <SheetFooter resetLabel="Reset Filters" applyLabel="Apply Filters" onReset={reset} canApply={canApply}
            hint={needsOrigin && !lookup.pending
              ? (limited ? 'Choose a location to filter by distance.' : 'Choose a location to sort by nearest.') : null}
            onApply={() => { onApply(draft); dismiss(); }} />
        </>
      )}
    </DiscoveryBottomSheet>
  );
}

const styles = StyleSheet.create({
  limit: { marginTop: 4 },
  match: { minHeight: 44, justifyContent: 'center', borderRadius: 14, backgroundColor: colors.page, padding: 10 },
  matchText: { color: colors.ink, fontSize: 15 },
  attribution: { color: colors.muted, fontSize: 12, textDecorationLine: 'underline' },
});
