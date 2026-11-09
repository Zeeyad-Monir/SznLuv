import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsContext } from '../screens/SettingsContext';
import { DEFAULT_FILTERS, DISTANCE_OPTIONS, hasCoordinates, usesOrigin, withoutCurrentLocation } from '../services/spotDiscovery';
import { customLocationAvailable, findCustomOrigins, getCurrentOrigin } from '../services/spotLocation';
import { getReduceMotion } from '../hooks/useReduceMotion';
import DiscoveryBottomSheet from './DiscoveryBottomSheet';

const EMPTY_LOOKUP = { pending: false, matches: [], error: null };

function Option({ label, selected, onPress }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SpotFilterSheet({ filters, index, onApply, onDismiss }) {
  const { bottom } = useSafeAreaInsets();
  const { isLocationEnabled, setIsLocationEnabled } = useContext(SettingsContext);
  const [draft, setDraft] = useState(filters);
  const [source, setSource] = useState(filters.origin?.source ?? null);
  const [customText, setCustomText] = useState(filters.origin?.source === 'custom' ? filters.origin.label : '');
  const [lookup, setLookup] = useState(EMPTY_LOOKUP);
  const request = useRef(null);
  const scroll = useRef(null);
  const layout = useRef({ sectionY: 0, inputY: 0 });
  const appliedOrigin = useRef(filters.origin);

  const cancelLookup = useCallback(() => {
    request.current?.abort();
    request.current = null;
  }, []);
  useEffect(() => cancelLookup, [cancelLookup]);
  useEffect(() => {
    if (!isLocationEnabled || (appliedOrigin.current?.source === 'current' && !filters.origin)) {
      setDraft(withoutCurrentLocation);
    }
    appliedOrigin.current = filters.origin;
  }, [filters.origin, isLocationEnabled]);

  const update = patch => setDraft(previous => ({ ...previous, ...patch }));

  const reset = () => {
    cancelLookup();
    Keyboard.dismiss();
    setDraft(DEFAULT_FILTERS);
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

  const needsOrigin = usesOrigin(draft) && !hasCoordinates(draft.origin);
  const canApply = !lookup.pending && !needsOrigin;
  const sortOptions = [{ value: 'catalogue', label: 'Catalogue order' }];
  if (index.alphabetical) sortOptions.push({ value: 'alphabetical', label: 'A–Z' });
  if (index.supportsDistance) sortOptions.push({ value: 'nearest', label: 'Nearest' });

  return (
    <DiscoveryBottomSheet title="Filter spots" onClosing={cancelLookup} onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView ref={scroll} style={styles.body} contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {index.categoryOptions.length > 0 && (
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.label}>Categories</Text>
                <View style={styles.options}>
                  <Option label="All categories" selected={!draft.categories.length}
                    onPress={() => update({ categories: [] })} />
                  {index.categoryOptions.map(title => (
                    <Option key={title} label={title} selected={draft.categories.includes(title)}
                      onPress={() => toggleCategory(title)} />
                  ))}
                </View>
              </View>
            )}
            {sortOptions.length > 1 && (
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.label}>Sort by</Text>
                <View style={styles.options}>
                  {sortOptions.map(({ value, label }) => (
                    <Option key={value} label={label} selected={draft.sort === value}
                      onPress={() => update({ sort: value })} />
                  ))}
                </View>
              </View>
            )}
            <View style={styles.section}
              onLayout={event => { layout.current.sectionY = event.nativeEvent.layout.y; }}>
              <Text accessibilityRole="header" style={styles.label}>Location &amp; distance</Text>
              {index.supportsDistance ? (
                <>
                  <View style={styles.options}>
                    <Option label="Current location" selected={source === 'current'} onPress={() => {
                      selectSource('current');
                      if (isLocationEnabled && (source !== 'current' || (!lookup.pending && !draft.origin))) useCurrent();
                    }} />
                    <Option label="Custom location" selected={source === 'custom'}
                      onPress={() => selectSource('custom')} />
                  </View>
                  {source === 'current' && !lookup.pending && (
                    <>
                      {!isLocationEnabled && <Text style={styles.hint}>This also turns on Allow Location Services in Profile.</Text>}
                      <TouchableOpacity accessibilityRole="button" style={styles.inlineAction} onPress={useCurrent}>
                        <Text style={styles.actionText}>{!isLocationEnabled ? 'Enable and use current location'
                          : draft.origin ? 'Refresh current location' : 'Use current location'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {source === 'custom' && (customLocationAvailable ? (
                    <>
                      <TextInput style={styles.locationInput} value={customText} onChangeText={editCustom}
                        placeholder="City, address or place" placeholderTextColor="#706961"
                        accessibilityLabel="Custom location search" autoCorrect={false}
                        onLayout={event => { layout.current.inputY = event.nativeEvent.layout.y; }}
                        onFocus={() => scroll.current?.scrollTo({
                          y: Math.max(0, layout.current.sectionY + layout.current.inputY - 8),
                          animated: !getReduceMotion(),
                        })}
                        returnKeyType="search" onSubmitEditing={useCustom} />
                      <TouchableOpacity accessibilityRole="button" style={styles.inlineAction} onPress={useCustom}
                        disabled={lookup.pending || !customText.trim()}>
                        <Text style={[styles.actionText, (lookup.pending || !customText.trim()) && styles.muted]}>Find location</Text>
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
                  ) : <Text style={styles.hint}>Custom location lookup is currently unavailable.</Text>)}
                  {lookup.pending && (
                    <View style={styles.loading} accessibilityLiveRegion="polite">
                      <ActivityIndicator color="#333" />
                      <Text style={styles.hint}>{source === 'current' ? 'Getting current location…' : 'Looking up location…'}</Text>
                    </View>
                  )}
                  {!!lookup.error && <Text style={styles.error} accessibilityRole="alert">{lookup.error.message}</Text>}
                  {lookup.error?.action === 'settings' && (
                    <TouchableOpacity accessibilityRole="button" style={styles.inlineAction}
                      onPress={() => Linking.openSettings().catch(() => {})}>
                      <Text style={styles.actionText}>Open device settings</Text>
                    </TouchableOpacity>
                  )}
                  {!!draft.origin && <Text style={styles.reference}>Measuring from {draft.origin.label}</Text>}
                  <View style={styles.options}>
                    {DISTANCE_OPTIONS.map(radiusKm => (
                      <Option key={radiusKm ?? 'any'} label={radiusKm === null ? 'Any Distance' : `${radiusKm} km`}
                        selected={draft.radiusKm === radiusKm} onPress={() => update({ radiusKm })} />
                    ))}
                  </View>
                  <Text style={styles.hint}>Distances are measured in a straight line.</Text>
                </>
              ) : <Text style={styles.hint}>Distance filters are unavailable for this season.</Text>}
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(12, bottom) }]}>
            {needsOrigin && !lookup.pending && (
              <Text style={styles.hint} accessibilityLiveRegion="polite">Choose a location to apply distance or nearest sorting.</Text>
            )}
            <View style={styles.footerActions}>
              <TouchableOpacity accessibilityRole="button" style={styles.footerButton} onPress={reset}>
                <Text style={styles.actionText}>Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canApply }}
                disabled={!canApply} style={[styles.footerButton, styles.apply, !canApply && styles.disabledApply]}
                onPress={() => { onApply(draft); dismiss(); }}>
                <Text style={styles.applyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </DiscoveryBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  bodyContent: { paddingBottom: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DED8D1', paddingTop: 14, paddingBottom: 14, gap: 8 },
  label: { color: '#323232', fontSize: 16, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44, maxWidth: '100%', justifyContent: 'center', paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD5CC', backgroundColor: '#FFF9F1',
  },
  optionSelected: { backgroundColor: '#333', borderColor: '#333' },
  optionText: { color: '#36322E', fontSize: 14, fontWeight: '500' },
  optionTextSelected: { color: '#FFF' },
  hint: { fontSize: 14, color: '#61594F', lineHeight: 20 },
  error: { fontSize: 14, color: '#982D24', lineHeight: 20 },
  reference: { fontSize: 14, fontWeight: '600', color: '#36322E', lineHeight: 20 },
  actionText: { fontSize: 15, fontWeight: '600', color: '#333', textAlign: 'center' },
  muted: { color: '#756F68' },
  inlineAction: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingVertical: 8 },
  locationInput: {
    minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: '#262321',
    borderWidth: 1, borderColor: '#DDD5CC', borderRadius: 10,
  },
  match: { minHeight: 44, justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFF5E4', padding: 10 },
  matchText: { color: '#333', fontSize: 15 },
  attribution: { color: '#61594F', fontSize: 12, textDecorationLine: 'underline' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DED8D1', paddingTop: 10, gap: 8 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footerButton: {
    flexGrow: 1, flexBasis: '45%', minHeight: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', padding: 10,
  },
  apply: { backgroundColor: '#333' },
  disabledApply: { backgroundColor: '#6F6963' },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
