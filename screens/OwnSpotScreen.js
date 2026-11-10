// "Add your own spot": for a place the app doesn't list. A name, and either a dropped pin or an address.
// Opened with { listId, name } and adds the new spot to that list.
import React, { useContext, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ownSpotsFrom } from '../components/AddSpotSheet';
import { useSnackbar } from '../components/Snackbar';
import { colors, controls, text } from '../components/theme';
import useAfterTransition from '../hooks/useAfterTransition';
import useMyLists from '../hooks/useMyLists';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { DEFAULT_CITY } from '../services/catalogue';
import { mutateList } from '../services/lists';
import { LIMITS, addSpot } from '../services/listsState';
import { buildOwnSpot, ownSpotProblem } from '../services/ownSpots';
import { customLocationAvailable, findCustomOrigins } from '../services/spotLocation';
import { SettingsContext } from './SettingsContext';

const MODES = [{ value: 'pin', label: 'Drop a pin' }, { value: 'address', label: 'Type an address' }];
const START = { latitude: DEFAULT_CITY.latitude, longitude: DEFAULT_CITY.longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 };

export default function OwnSpotScreen({ navigation, route }) {
  const { listId, name: typedName = '' } = route.params;
  const snackbar = useSnackbar();
  const { lists } = useMyLists();
  const { isLocationEnabled } = useContext(SettingsContext);
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const mapReady = useAfterTransition(); // The map mounts after the slide, so it can't stutter the push

  const [name, setName] = useState(typedName);
  const [mode, setMode] = useState('pin');
  const [pin, setPin] = useState(null); // Set once the map has been moved, so a pin is always a choice
  const [address, setAddress] = useState('');
  const [chosen, setChosen] = useState(null); // A looked-up address: its label and coordinates
  const [lookup, setLookup] = useState({ pending: false, matches: [], error: '' });
  const [saving, setSaving] = useState(false);
  const [showProblem, setShowProblem] = useState(false);
  const request = useRef(null);
  const submitting = useRef(false);

  const form = { name, mode, address, pin: mode === 'pin' ? pin : chosen, label: chosen?.label };
  const problem = ownSpotProblem(form);

  const editAddress = value => {
    request.current?.abort();
    setAddress(value);
    setChosen(null);
    setLookup({ pending: false, matches: [], error: '' });
  };

  const findAddress = async () => {
    if (!address.trim() || lookup.pending) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLookup({ pending: true, matches: [], error: '' });
    try {
      const matches = await findCustomOrigins(address, controller.signal);
      if (controller.signal.aborted) return;
      setLookup({ pending: false, matches, error: matches.length ? '' : 'No matching address. You can still save it as typed.' });
    } catch (error) {
      if (!controller.signal.aborted) setLookup({ pending: false, matches: [], error: error.message });
    }
  };

  const save = async () => {
    if (submitting.current) return;
    if (problem) { setShowProblem(true); return; }
    submitting.current = true;
    setSaving(true);
    const { ref, matched } = buildOwnSpot(form, ownSpotsFrom(lists));
    try {
      await mutateList(listId, list => addSpot(list, ref));
      navigation.goBack();
      snackbar.show({ message: matched ? `Matched an existing spot: ${ref.name}` : `Added ${ref.name}` });
    } catch (error) {
      console.error('Error adding own spot:', { code: error?.code });
      snackbar.show({ message: error?.code?.startsWith('list/') ? error.message : 'Couldn’t save. Check your connection.' });
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <SignedInScreen style={styles.container}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={floatingScrollStyle} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} accessibilityRole="header">Add your own spot</Text>
          <Text style={[text.body, styles.intro]}>For a place SznLuv doesn’t list yet. Only you can see it unless you make the list public.</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput style={controls.field} value={name} onChangeText={setName} maxLength={LIMITS.spotName}
            placeholder="Waterfront steps" placeholderTextColor="#8A8178" returnKeyType="done" accessibilityLabel="Spot name" />

          <Text style={styles.label}>Where is it?</Text>
          <View style={styles.modes}>
            {MODES.map(option => {
              const selected = option.value === mode;
              return (
                <TouchableOpacity key={option.value} style={[styles.mode, selected && styles.modeSelected]}
                  accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setMode(option.value)}>
                  <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'pin' ? (
            <>
              <View style={styles.mapFrame}>
                {mapReady && (
                  <MapView style={styles.fill} initialRegion={START} showsUserLocation={isLocationEnabled}
                    onRegionChangeComplete={(region, details) => {
                      // Only a move by hand counts: the first report is just the map settling.
                      if (details?.isGesture === false) return;
                      setPin({ latitude: region.latitude, longitude: region.longitude });
                    }} />
                )}
                <View pointerEvents="none" style={styles.pin}>
                  <Ionicons name="location-sharp" size={40} color={colors.danger} />
                </View>
              </View>
              <Text style={[text.meta, styles.hint]} accessibilityLiveRegion="polite">
                {pin ? `Pin at ${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}` : 'Move the map so the pin sits on your spot.'}
              </Text>
            </>
          ) : (
            <>
              <TextInput style={controls.field} value={address} onChangeText={editAddress}
                placeholder="Street and number, or a description" placeholderTextColor="#8A8178" autoCorrect={false}
                returnKeyType={customLocationAvailable ? 'search' : 'done'}
                onSubmitEditing={customLocationAvailable ? findAddress : undefined} accessibilityLabel="Address" />
              {customLocationAvailable && !chosen && (
                <TouchableOpacity style={styles.inline} accessibilityRole="button" onPress={findAddress}
                  disabled={!address.trim() || lookup.pending}>
                  <Text style={[styles.inlineText, (!address.trim() || lookup.pending) && styles.muted]}>Find this address</Text>
                </TouchableOpacity>
              )}
              {lookup.pending && <ActivityIndicator style={styles.inline} color={colors.ink} />}
              {lookup.matches.map(match => (
                <TouchableOpacity key={match.key} style={styles.match} accessibilityRole="button"
                  onPress={() => { setChosen(match); setAddress(match.label); setLookup({ pending: false, matches: [], error: '' }); }}>
                  <Text style={styles.matchText}>{match.label}</Text>
                </TouchableOpacity>
              ))}
              {!!chosen && <Text style={[text.meta, styles.hint]}>Found. Directions will lead to this address.</Text>}
              {!!lookup.error && <Text style={[text.meta, styles.hint]}>{lookup.error}</Text>}
              {(lookup.matches.length > 0 || !!chosen) && (
                <Text style={styles.attribution}>
                  <Text accessibilityRole="link" onPress={() => Linking.openURL('https://www.geoapify.com/').catch(() => {})}>Geoapify</Text>
                  {' · '}
                  <Text accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}>© OpenStreetMap contributors</Text>
                </Text>
              )}
            </>
          )}

          {showProblem && !!problem && <Text style={styles.problem} accessibilityRole="alert">{problem}</Text>}
          <TouchableOpacity style={[controls.primary, styles.save, saving && controls.primaryDisabled]} onPress={save}
            disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }}>
            <Text style={controls.primaryText}>Add to list</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: '700', color: colors.ink },
  intro: { marginTop: 8, color: colors.muted },
  label: { marginTop: 20, marginBottom: 8, fontSize: 18, fontWeight: '700', color: colors.label },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  mode: {
    minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#DDD5CC', backgroundColor: colors.field,
  },
  modeSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { color: '#36322E', fontSize: 14, fontWeight: '500' },
  modeTextSelected: { color: colors.white },
  mapFrame: { height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  // The pin's tip, not its middle, marks the spot.
  pin: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 40, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8 },
  inline: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  inlineText: { fontSize: 15, fontWeight: '600', color: colors.ink, textDecorationLine: 'underline' },
  muted: { color: '#8A8178' },
  match: { minHeight: 44, justifyContent: 'center', borderRadius: 10, backgroundColor: colors.field, padding: 10, marginTop: 8 },
  matchText: { color: colors.ink, fontSize: 15 },
  attribution: { marginTop: 8, color: colors.muted, fontSize: 12, textDecorationLine: 'underline' },
  problem: { marginTop: 16, fontSize: 14, lineHeight: 20, color: colors.error },
  save: { marginTop: 20 },
});
