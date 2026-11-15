// Bottom sheet for naming a new list or changing an existing one: title, optional description, cover image.
// A new list can't be created until a cover image is picked; it can be changed later from here.
// Opened with { listId } to edit, { addSpot } to start a list with a spot already in it, or nothing.
import React, { useContext, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SheetHeader from '../components/SheetHeader';
import { coverArt } from '../components/covers';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import useMyLists from '../hooks/useMyLists';
import { storedRef } from '../services/customSpotsState';
import { createNewList, mutateList } from '../services/lists';
import { IMAGE_COVERS, LIMITS, SEASON_COVERS, editDetails, isImageCover, sameCover } from '../services/listsState';
import { EVENTS, track } from '../services/metrics';
import { closeSheetAndOpenList } from '../navigation/openList';

// Every cover image a list can use: the four season illustrations, then the app's own cover images.
const COVER_OPTIONS = [
  ...SEASON_COVERS.map(({ value, name }) => ({ type: 'season', value, name })),
  ...IMAGE_COVERS.map(({ value, name }) => ({ type: 'image', value, name })),
];
const COLUMNS = 5;
const GAP = 8;

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
  // Five covers to a row, sized to fill the sheet's width.
  const { width } = useWindowDimensions();
  const thumb = Math.floor((width - 40 - GAP * (COLUMNS - 1)) / COLUMNS);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  // A list made before image covers keeps its colour until an image is picked.
  const [cover, setCover] = useState(editing?.cover ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const hasCover = isImageCover(cover) || (!!editing && sameCover(cover, editing.cover));
  const canSave = !!title.trim() && hasCover && !saving;

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

      <Text style={styles.label} accessibilityRole="header">Cover image</Text>
      {!isImageCover(cover) && (
        <Text style={styles.hint}>{editing ? 'Swap this list’s colour cover for an image.' : 'Pick one to create your list. You can change it later.'}</Text>
      )}
      <View style={styles.grid}>
        {COVER_OPTIONS.map(option => {
          const selected = sameCover(cover, option);
          return (
            <TouchableOpacity key={`${option.type}:${option.value}`} hitSlop={3} onPress={() => setCover({ type: option.type, value: option.value })}
              style={[styles.thumb, { width: thumb, height: thumb }, selected && styles.thumbSelected]}
              accessibilityRole="button" accessibilityLabel={`${option.name} cover image`} accessibilityState={{ selected }}>
              <Image source={coverArt(option)} style={styles.thumbImage} resizeMode="cover" />
              {selected && <View style={styles.check}><Ionicons name="checkmark" size={18} color={colors.ink} /></View>}
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
  hint: { marginTop: -4, marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.summary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: 12 },
  thumb: {
    borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent', backgroundColor: '#F1ECE4',
  },
  thumbSelected: { borderColor: colors.ink },
  thumbImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  error: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.error },
  save: { marginTop: 8 },
  loading: { marginVertical: 24 },
});
