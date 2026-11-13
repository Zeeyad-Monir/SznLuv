// Bottom sheet for naming a new list or changing an existing one: title, optional description, cover.
// Opened with { listId } to edit, { addSpot } to start a list with a spot already in it, or nothing.
import React, { useContext, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SheetHeader from '../components/SheetHeader';
import { SEASON_ART } from '../components/covers';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import useMyLists from '../hooks/useMyLists';
import { storedRef } from '../services/customSpotsState';
import { createNewList, mutateList } from '../services/lists';
import { COLOURS, DEFAULT_COVER, LIMITS, SEASON_COVERS, editDetails } from '../services/listsState';
import { EVENTS, track } from '../services/metrics';
import { closeSheetAndOpenList } from '../navigation/openList';

const sameCover = (a, b) => a?.type === b?.type && a?.value === b?.value;

export default function ListDetailsSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { lists, status } = useMyLists();
  const { listId, addSpot } = route?.params ?? {};
  const editing = lists.find(list => list.id === listId);
  const heading = listId ? 'List details' : 'New list';

  // An existing list's details have to arrive before the form can start from them.
  if (listId && !editing) {
    return (
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <SheetHeader title={heading} closeLabel={`Close ${heading}`} onClose={() => navigation.goBack()} />
        {status === 'ready' || status === 'error'
          ? <Text style={styles.error}>This list isn’t available.</Text>
          : <ActivityIndicator style={styles.loading} color={colors.ink} />}
      </View>
    );
  }
  return <DetailsForm navigation={navigation} listId={listId} addSpot={addSpot} editing={editing} heading={heading} />;
}

function DetailsForm({ navigation, listId, addSpot, editing, heading }) {
  const { user } = useContext(AuthContext);
  const { city } = useCity();
  const insets = useSafeAreaInsets();
  // Seven colours stay on one row: full size on current phones, a little smaller on narrow ones.
  const { width } = useWindowDimensions();
  const swatch = width >= 390 ? 40 : 34;
  const swatchSize = { width: swatch, height: swatch, borderRadius: swatch / 2 };

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [cover, setCover] = useState(editing?.cover ?? DEFAULT_COVER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const canSave = !!title.trim() && !saving;

  const save = async () => {
    if (submitting.current || !canSave) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      if (listId) {
        await mutateList(listId, list => editDetails(list, { title, description, cover }));
        navigation.goBack();
      } else {
        const created = await createNewList(user?.uid, {
          title, description, cover, cityId: city.id,
          items: addSpot ? [{ spot: storedRef(addSpot, user?.uid), note: '' }] : [],
        });
        track(EVENTS.listStarted, { entry: addSpot ? 'save' : 'library' });
        if (addSpot) track(EVENTS.firstSpotAdded, { entry: 'save' });
        // A list started from the library opens straight away, ready for its first spot.
        if (addSpot) navigation.goBack();
        else closeSheetAndOpenList(navigation, created.id);
      }
    } catch (failure) {
      console.error('Error saving list:', { code: failure?.code });
      setError(failure?.code?.startsWith('list/') ? failure.message : 'Couldn’t save. Check your connection.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title={heading} closeLabel={`Close ${heading}`} onClose={() => navigation.goBack()} />

      <TextInput
        style={[controls.field, styles.input]} value={title} onChangeText={setTitle} maxLength={LIMITS.title}
        placeholder="Title" placeholderTextColor="#8A8178" returnKeyType="done"
        accessibilityLabel="List title" autoFocus={!listId}
      />
      <TextInput
        style={[controls.field, styles.input]} value={description} onChangeText={setDescription}
        maxLength={LIMITS.description} placeholder="What’s it for? (optional)" placeholderTextColor="#8A8178"
        returnKeyType="done" accessibilityLabel="List description"
      />

      <Text style={styles.label} accessibilityRole="header">Cover</Text>
      <View style={styles.palette}>
        {COLOURS.map(({ value, name }) => {
          const option = { type: 'colour', value };
          const selected = sameCover(cover, option);
          return (
            <TouchableOpacity key={value} hitSlop={5} onPress={() => setCover(option)}
              style={[styles.swatch, swatchSize, { backgroundColor: value }, selected && styles.swatchSelected]}
              accessibilityRole="button" accessibilityLabel={`${name} cover`} accessibilityState={{ selected }}>
              {selected && <Ionicons name="checkmark" size={20} color={colors.ink} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.palette, styles.artRow]}>
        {SEASON_COVERS.map(({ value, name }) => {
          const option = { type: 'season', value };
          const selected = sameCover(cover, option);
          return (
            <TouchableOpacity key={value} hitSlop={4} onPress={() => setCover(option)}
              style={[styles.swatch, styles.art, selected && styles.swatchSelected]}
              accessibilityRole="button" accessibilityLabel={`${name} illustration cover`} accessibilityState={{ selected }}>
              <Image source={SEASON_ART[value]} style={styles.artImage} />
              {selected && <View style={styles.artCheck}><Ionicons name="checkmark" size={18} color={colors.ink} /></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <TouchableOpacity
        style={[controls.primary, styles.save, !canSave && controls.primaryDisabled]} onPress={save} disabled={!canSave}
        accessibilityRole="button" accessibilityState={{ disabled: !canSave }}
      >
        <Text style={controls.primaryText}>{listId ? 'Save' : 'Create list'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  input: { marginBottom: 12 },
  label: { marginTop: 4, marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#323232' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  artRow: { justifyContent: 'flex-start', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.ink },
  art: { width: 48, height: 48, borderRadius: 24 },
  artImage: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  artCheck: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  error: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.error },
  save: { marginTop: 8 },
  loading: { marginVertical: 24 },
});
