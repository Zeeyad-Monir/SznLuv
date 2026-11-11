// The one place a spot of your own is made or changed: from Saved ("Add Your Own Spot"), from a list's
// "Add a spot", or from the spot's own page. Opened with { listId?, name? } to make one (it goes into Saved,
// and into that list when there is one) or { spotId } to edit one. Only a name and a place are required;
// everything else waits under "More details" so making a spot stays quick.
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import PhotoSlots, { usePhotoSlots } from '../components/PhotoSlots';
import { useSnackbar } from '../components/Snackbar';
import { colors, controls, text } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useAfterTransition from '../hooks/useAfterTransition';
import useDeleteSpot from '../hooks/useDeleteSpot';
import useMySpots from '../hooks/useMySpots';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { DEFAULT_CITY, catalogueRef } from '../services/catalogue';
import { addExistingSpot, createSpot, newSpotId, updateSpot } from '../services/customSpots';
import {
  SPOT_CATEGORIES, SPOT_LIMITS, SPOT_SEASONS, findListedSpot, findSameSpot, spotFields, spotProblem, toRef, withinReach,
} from '../services/customSpotsState';
import { spotHasReviews } from '../services/reviews';
import { restoreSavedSpot } from '../services/favourites';
import { cleanOrphans } from '../services/spotPhotos';
import { mutateList } from '../services/lists';
import { addSpot } from '../services/listsState';
import { customLocationAvailable, findCustomOrigins } from '../services/spotLocation';
import { SettingsContext } from './SettingsContext';

const MODES = [{ value: 'pin', label: 'Drop a pin' }, { value: 'address', label: 'Type an address' }];
const START = { latitude: DEFAULT_CITY.latitude, longitude: DEFAULT_CITY.longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 };
const SAVE_FAILED = 'Couldn’t save. Check your connection.';
const PLACEHOLDER = '#8A8178';

// The form as it starts: empty, or the spot being edited.
function initialForm(spot, typedName = '') {
  if (!spot) {
    return { name: typedName, mode: 'pin', pin: null, address: '', chosen: null, category: '', description: '', tips: '', cost: '', hours: '', seasons: [] };
  }
  const pinned = Number.isFinite(spot.lat) && Number.isFinite(spot.lng);
  const point = pinned ? { latitude: spot.lat, longitude: spot.lng } : null;
  return {
    name: spot.name ?? '',
    mode: spot.address ? 'address' : 'pin',
    pin: spot.address ? null : point,
    address: spot.address ?? '',
    chosen: spot.address && point ? { key: 'saved', label: spot.address, ...point } : null,
    category: spot.category ?? '',
    description: spot.description ?? '',
    tips: spot.tips ?? '',
    cost: spot.cost ?? '',
    hours: spot.hours ?? '',
    seasons: spot.seasons ?? [],
  };
}

const hasDetails = form => !!(form.tips || form.cost || form.hours || form.seasons.length);

export default function OwnSpotScreen({ navigation, route }) {
  const { spotId, listId, name: typedName = '' } = route.params ?? {};
  const editing = !!spotId;
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const { spots: mySpots, byId, status } = useMySpots();
  const { isLocationEnabled } = useContext(SettingsContext);
  const askToDelete = useDeleteSpot();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const mapReady = useAfterTransition(); // The map mounts after the slide, so it can't stutter the push
  const spot = editing ? byId[spotId] : null;
  // A new spot's ID is chosen now, so its photos can upload while the rest is being filled in.
  const [draftId] = useState(() => (editing ? null : newSpotId(uid)));
  const photoSpotId = spotId ?? draftId;
  const slots = usePhotoSlots(uid, photoSpotId, spot?.photos ?? []);
  const savedPhotos = JSON.stringify(slots.saved);
  const [initialPhotos, setInitialPhotos] = useState(savedPhotos);

  const [form, setForm] = useState(() => initialForm(spot, typedName));
  const [initial, setInitial] = useState(form);
  const [moreOpen, setMoreOpen] = useState(() => hasDetails(form));
  const [lookup, setLookup] = useState({ pending: false, matches: [], error: '' });
  const [saving, setSaving] = useState(false);
  const [showProblem, setShowProblem] = useState(false);
  const request = useRef(null);
  const submitting = useRef(false);
  const done = useRef(false);

  // Editing a spot that arrives after the first render: fill the form once, when it does.
  const filled = useRef(!editing || !!spot);
  useEffect(() => {
    if (filled.current || !spot) return;
    filled.current = true;
    const start = initialForm(spot);
    setForm(start);
    setInitial(start);
    setMoreOpen(hasDetails(start));
    slots.reset(spot.photos ?? []);
    setInitialPhotos(JSON.stringify(spot.photos ?? []));
  }, [spot]);

  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const input = { ...form, pin: form.mode === 'pin' ? form.pin : form.chosen, label: form.chosen?.label };
  const problem = spotProblem(input)
    || (slots.failed ? 'A photo didn’t upload. Retry it, or remove it.' : null);
  const formChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  const dirty = formChanged || savedPhotos !== initialPhotos || slots.uploading || slots.failed;

  // Photos uploaded for an edit that won't be kept, or for a spot that won't be made.
  const discardUploads = () => cleanOrphans(uid, photoSpotId, editing ? spot?.photos ?? [] : []);

  // Leaving with unsaved changes asks first, whether by the back button or a swipe.
  usePreventRemove(dirty && !saving, ({ data }) => {
    if (done.current) { navigation.dispatch(data.action); return; }
    Alert.alert('Discard changes?', editing ? 'Your changes to this spot won’t be saved.' : 'This spot won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discardUploads(); navigation.dispatch(data.action); } },
    ]);
  });

  const editAddress = value => {
    request.current?.abort();
    setForm(previous => ({ ...previous, address: value, chosen: null }));
    setLookup({ pending: false, matches: [], error: '' });
  };

  const findAddress = async () => {
    if (!form.address.trim() || lookup.pending) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLookup({ pending: true, matches: [], error: '' });
    try {
      const matches = await findCustomOrigins(form.address, controller.signal);
      if (controller.signal.aborted) return;
      setLookup({ pending: false, matches, error: matches.length ? '' : 'No matching address. You can still save it as typed.' });
    } catch (error) {
      if (!controller.signal.aborted) setLookup({ pending: false, matches: [], error: error.message });
    }
  };

  // Runs one save, then leaves with a short confirmation. A failure keeps everything as typed.
  const run = async work => {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      const message = await work();
      done.current = true;
      navigation.goBack();
      snackbar.show({ message });
    } catch (error) {
      console.error('Error saving own spot:', { code: error?.code });
      snackbar.show({ message: /^(list|spot)\//.test(error?.code ?? '') ? error.message : SAVE_FAILED });
      submitting.current = false;
      setSaving(false);
    }
  };

  // SznLuv's own page for a spot of the same name, instead of making a second one.
  const takeListed = listed => run(async () => {
    discardUploads();
    if (listId) {
      await mutateList(listId, list => addSpot(list, catalogueRef(listed.name)));
      return `Added ${listed.name}`;
    }
    await restoreSavedSpot(uid, listed.name, { isFavourite: true, season: listed.season, location: listed.address ?? '' });
    return `Saved to ${listed.season} favourites`;
  });

  const create = fields => run(async () => {
    const same = findSameSpot(fields, mySpots);
    if (same) {
      await addExistingSpot(uid, toRef(same.id, same), { listId });
      discardUploads();
      return `Matched an existing spot: ${same.name}`;
    }
    await createSpot(uid, fields, { id: draftId, listId, photos: slots.saved });
    cleanOrphans(uid, draftId, slots.saved);
    return listId ? `Added ${fields.name}` : `Saved ${fields.name}`;
  });

  const save = () => {
    if (submitting.current || slots.uploading) return;
    if (problem) { setShowProblem(true); return; }
    const fields = spotFields(input);
    if (editing) {
      run(async () => {
        // Reviews belong to a place: a reviewed spot can be nudged, not moved somewhere else.
        if (!withinReach(spot, fields) && await spotHasReviews(spotId)) {
          throw Object.assign(new Error('This spot has reviews, so it can’t move somewhere else. Add a new spot for the new place instead.'), { code: 'spot/reviewed' });
        }
        await updateSpot(uid, spotId, fields, { photos: slots.saved });
        cleanOrphans(uid, spotId, slots.saved);
        return 'Changes saved';
      });
      return;
    }
    const listed = findListedSpot(fields.name);
    if (!listed) { create(fields); return; }
    Alert.alert(`SznLuv already lists ${listed.name}`, 'Use its page, or make a spot of your own with this name?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Make my own', onPress: () => create(fields) },
      { text: 'Use SznLuv’s page', onPress: () => takeListed(listed) },
    ]);
  };

  if (editing && !spot) {
    return (
      <SignedInScreen style={[styles.container, styles.centred]}>
        {status === 'ready' || status === 'error'
          ? <Text style={[text.body, styles.gone]}>{status === 'error' ? 'Couldn’t load this spot. Check your connection.' : 'This spot no longer exists.'}</Text>
          : <ActivityIndicator size="large" color={colors.ink} />}
      </SignedInScreen>
    );
  }

  const publicNote = editing && (spot?.publicListIds?.length ?? 0) > 0;
  const action = slots.uploading ? 'Uploading photos…' : editing ? 'Save changes' : listId ? 'Add to list' : 'Save spot';
  const blocked = saving || slots.uploading;

  return (
    <SignedInScreen style={styles.container}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={floatingScrollStyle} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} accessibilityRole="header">{editing ? 'Edit spot' : 'Add your own spot'}</Text>
          {!editing && (
            <Text style={[text.body, styles.intro]}>For a place SznLuv doesn’t list yet. Only you can see it unless you add it to a public list.</Text>
          )}
          {publicNote && (
            <Text style={[text.body, styles.intro]} accessibilityRole="alert">This spot is in a public list, so changes show to everyone straight away.</Text>
          )}

          <Text style={styles.label}>Photos <Text style={styles.optional}>(optional)</Text></Text>
          <PhotoSlots slots={slots} />

          <Text style={styles.label}>Name</Text>
          <TextInput style={controls.field} value={form.name} onChangeText={value => set('name', value)} maxLength={SPOT_LIMITS.name}
            placeholder="Waterfront steps" placeholderTextColor={PLACEHOLDER} returnKeyType="done" accessibilityLabel="Spot name" />

          <Text style={styles.label}>Where is it?</Text>
          <Chips options={MODES} isSelected={value => value === form.mode} onPress={value => set('mode', value)} />

          {form.mode === 'pin' ? (
            <>
              <View style={styles.mapFrame}>
                {mapReady && (
                  <MapView style={styles.fill}
                    initialRegion={form.pin ? { ...form.pin, latitudeDelta: 0.03, longitudeDelta: 0.03 } : START}
                    showsUserLocation={isLocationEnabled}
                    onRegionChangeComplete={(region, details) => {
                      // Only a move by hand counts: the first report is just the map settling.
                      if (details?.isGesture === false) return;
                      set('pin', { latitude: region.latitude, longitude: region.longitude });
                    }} />
                )}
                <View pointerEvents="none" style={styles.pin}>
                  <Ionicons name="location-sharp" size={40} color={colors.danger} />
                </View>
              </View>
              <Text style={[text.meta, styles.hint]} accessibilityLiveRegion="polite">
                {form.pin ? `Pin at ${form.pin.latitude.toFixed(4)}, ${form.pin.longitude.toFixed(4)}` : 'Move the map so the pin sits on your spot.'}
              </Text>
            </>
          ) : (
            <>
              <TextInput style={controls.field} value={form.address} onChangeText={editAddress}
                placeholder="Street and number, or a description" placeholderTextColor={PLACEHOLDER} autoCorrect={false}
                returnKeyType={customLocationAvailable ? 'search' : 'done'}
                onSubmitEditing={customLocationAvailable ? findAddress : undefined} accessibilityLabel="Address" />
              {customLocationAvailable && !form.chosen && (
                <TouchableOpacity style={styles.inline} accessibilityRole="button" onPress={findAddress}
                  disabled={!form.address.trim() || lookup.pending}>
                  <Text style={[styles.inlineText, (!form.address.trim() || lookup.pending) && styles.muted]}>Find this address</Text>
                </TouchableOpacity>
              )}
              {lookup.pending && <ActivityIndicator style={styles.inline} color={colors.ink} />}
              {lookup.matches.map(match => (
                <TouchableOpacity key={match.key} style={styles.match} accessibilityRole="button"
                  onPress={() => { setForm(previous => ({ ...previous, chosen: match, address: match.label })); setLookup({ pending: false, matches: [], error: '' }); }}>
                  <Text style={styles.matchText}>{match.label}</Text>
                </TouchableOpacity>
              ))}
              {!!form.chosen && <Text style={[text.meta, styles.hint]}>Found. Directions will lead to this address.</Text>}
              {!!lookup.error && <Text style={[text.meta, styles.hint]}>{lookup.error}</Text>}
              {lookup.matches.length > 0 && (
                <Text style={styles.attribution}>
                  <Text accessibilityRole="link" onPress={() => Linking.openURL('https://www.geoapify.com/').catch(() => {})}>Geoapify</Text>
                  {' · '}
                  <Text accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}>© OpenStreetMap contributors</Text>
                </Text>
              )}
            </>
          )}

          <Text style={styles.label}>Category <Text style={styles.optional}>(optional)</Text></Text>
          <Chips options={SPOT_CATEGORIES.map(category => ({ value: category, label: category }))}
            isSelected={value => value === form.category} onPress={value => set('category', form.category === value ? '' : value)} />

          <Text style={styles.label}>About it <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[controls.field, styles.multiline]} value={form.description} onChangeText={value => set('description', value)}
            maxLength={SPOT_LIMITS.description} multiline textAlignVertical="top"
            placeholder="What is it, and why go?" placeholderTextColor={PLACEHOLDER} accessibilityLabel="Description" />

          <TouchableOpacity style={styles.more} accessibilityRole="button" accessibilityState={{ expanded: moreOpen }}
            onPress={() => setMoreOpen(open => !open)}>
            <Text style={styles.moreText}>More details</Text>
            <Ionicons name={moreOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
          </TouchableOpacity>
          {moreOpen && (
            <>
              <Text style={styles.label}>Tips</Text>
              <TextInput style={[controls.field, styles.multiline]} value={form.tips} onChangeText={value => set('tips', value)}
                maxLength={SPOT_LIMITS.tips} multiline textAlignVertical="top"
                placeholder="Parking, the best time to go, what to bring" placeholderTextColor={PLACEHOLDER} accessibilityLabel="Tips" />
              <Text style={styles.label}>Cost</Text>
              <TextInput style={controls.field} value={form.cost} onChangeText={value => set('cost', value)} maxLength={SPOT_LIMITS.cost}
                placeholder="Free, or $15 per person" placeholderTextColor={PLACEHOLDER} accessibilityLabel="Cost" />
              <Text style={styles.label}>Hours</Text>
              <TextInput style={controls.field} value={form.hours} onChangeText={value => set('hours', value)} maxLength={SPOT_LIMITS.hours}
                placeholder="Daily 9 to 5, or always open" placeholderTextColor={PLACEHOLDER} accessibilityLabel="Hours" />
              <Text style={styles.label}>Best seasons</Text>
              <Chips options={SPOT_SEASONS} isSelected={value => form.seasons.includes(value)}
                onPress={value => set('seasons', form.seasons.includes(value) ? form.seasons.filter(season => season !== value) : [...form.seasons, value])} />
            </>
          )}

          {showProblem && !!problem && <Text style={styles.problem} accessibilityRole="alert">{problem}</Text>}
          <TouchableOpacity style={[controls.primary, styles.save, blocked && controls.primaryDisabled]} onPress={save}
            disabled={blocked} accessibilityRole="button" accessibilityState={{ disabled: blocked }}>
            <Text style={controls.primaryText}>{action}</Text>
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity style={[controls.secondary, styles.delete]} accessibilityRole="button" disabled={saving}
              onPress={() => askToDelete({ id: spotId, name: spot.name, shared: (spot.publicListIds?.length ?? 0) > 0 }, () => {
                done.current = true;
                navigation.pop(2); // This editor and the deleted spot's page
              })}>
              <Text style={[controls.secondaryText, styles.deleteText]}>Delete spot</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SignedInScreen>
  );
}

function Chips({ options, isSelected, onPress }) {
  return (
    <View style={styles.chips}>
      {options.map(option => {
        const selected = isSelected(option.value);
        return (
          <TouchableOpacity key={option.value} style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onPress(option.value)}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  centred: { alignItems: 'center', justifyContent: 'center' },
  gone: { color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: SCREEN_CONTENT_TOP_GAP, paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: '700', color: colors.ink },
  intro: { marginTop: 8, color: colors.muted },
  label: { marginTop: 20, marginBottom: 8, fontSize: 18, fontWeight: '700', color: colors.label },
  optional: { fontSize: 14, fontWeight: '600', color: colors.label },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#DDD5CC', backgroundColor: colors.field,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: '#36322E', fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: colors.white },
  mapFrame: { height: 220, marginTop: 8, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  // The pin's tip, not its middle, marks the spot.
  pin: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 40, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8 },
  inline: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  inlineText: { fontSize: 15, fontWeight: '600', color: colors.ink, textDecorationLine: 'underline' },
  muted: { color: PLACEHOLDER },
  match: { minHeight: 44, justifyContent: 'center', borderRadius: 10, backgroundColor: colors.field, padding: 10, marginTop: 8 },
  matchText: { color: colors.ink, fontSize: 15 },
  attribution: { marginTop: 8, color: colors.muted, fontSize: 12, textDecorationLine: 'underline' },
  multiline: { minHeight: 96, paddingTop: 12 },
  more: { marginTop: 20, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  moreText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  problem: { marginTop: 16, fontSize: 14, lineHeight: 20, color: colors.error },
  save: { marginTop: 24 },
  delete: { marginTop: 12 },
  deleteText: { color: colors.danger },
});
