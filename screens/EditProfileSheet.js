// Edit the public photo, fallback colour and bio together, and this city's Top 4 (order, swap, remove, add).
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AddSpotSheet from '../components/AddSpotSheet';
import Avatar from '../components/Avatar';
import confirmExposure from '../components/confirmExposure';
import SheetHeader from '../components/SheetHeader';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import useMySpots from '../hooks/useMySpots';
import { resolveSpot, spotKey } from '../services/catalogue';
import { AVATAR_COLOURS, BIO_LIMIT, DEFAULT_AVATAR_COLOUR, mutateTop4 } from '../services/profiles';
import { chooseProfilePhoto, saveProfileEdit } from '../services/profilePhotos';
import { MAX_PICKS, addPick, cityTop4, movePick, removePick, replacePick } from '../services/top4State';

const keysOf = picks => picks.map(spotKey).join('|');

export default function EditProfileSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, username } = useContext(AuthContext);
  const { city } = useCity();
  const cityId = city.id;
  const { spots: mySpots } = useMySpots();
  const [bio, setBio] = useState(route?.params?.bio ?? '');
  const [avatarColor, setAvatarColor] = useState(route?.params?.avatarColor ?? DEFAULT_AVATAR_COLOUR);
  const savedPhotoId = route?.params?.avatarPhotoId;
  const [photo, setPhoto] = useState(undefined);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  // Top 4 is a draft here too, kept in the same shape the profile saves, and written only on Save.
  const [original] = useState(() => ({ picks: route?.params?.top4Picks ?? [], public: !!route?.params?.top4Public }));
  const [top4, setTop4] = useState(() => ({ [cityId]: original }));
  const [adding, setAdding] = useState(false);
  const [replacing, setReplacing] = useState(null);
  const submitting = useRef(false);
  const pickerOpen = useRef(false);
  const previewId = photo === undefined ? savedPhotoId : null;
  const hasPhoto = !!(previewId || photo);
  const busy = picking || saving || saved;
  const draft = cityTop4(top4, cityId);
  const picksChanged = keysOf(draft.picks) !== keysOf(original.picks);
  const editPicks = update => setTop4(current => update(current));

  usePreventRemove(saving && !saved, () => {});
  useEffect(() => { if (saved) navigation.goBack(); }, [navigation, saved]);

  const choosePhoto = async () => {
    if (pickerOpen.current || submitting.current) return;
    pickerOpen.current = true;
    setPicking(true);
    setError('');
    try {
      const chosen = await chooseProfilePhoto();
      if (chosen) setPhoto(chosen);
    } catch (failure) {
      console.error('Error choosing profile photo:', { code: failure?.code });
      setError('Couldn’t open your photo library. Try again.');
    } finally {
      pickerOpen.current = false;
      setPicking(false);
    }
  };

  const save = () => {
    if (submitting.current || pickerOpen.current) return undefined;
    if (!picksChanged || !draft.public) return submit();
    // A shown Top 4 that gains a place you added yourself reveals where it is, so that is confirmed first.
    const before = new Set(original.picks.map(spotKey));
    return confirmExposure(draft.picks.filter(pick => !before.has(spotKey(pick))), submit);
  };

  const submit = async () => {
    if (submitting.current || pickerOpen.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await saveProfileEdit(user?.uid, username, { bio, avatarColor }, photo);
      if (picksChanged) await mutateTop4(user?.uid, username, current => ({ ...(current ?? {}), [cityId]: draft }));
      setSaved(true);
    } catch (failure) {
      console.error('Error saving profile:', { code: failure?.code });
      setError(failure?.code?.startsWith('photo/') ? failure.message : 'Couldn’t save. Check your connection and try again.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <ScrollView style={{ maxHeight: height - insets.top - 24 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <SheetHeader title="Edit profile" closeLabel="Close Edit profile" closeDisabled={busy} onClose={() => navigation.goBack()} />
        <Text style={styles.label} accessibilityRole="header">Profile photo</Text>
        <View style={styles.photoRow}>
          <Avatar uid={user?.uid} username={username} color={avatarColor} size={64} photoId={previewId} localUri={photo?.uri} />
          <View style={styles.photoActions}>
            <TouchableOpacity style={controls.secondary} onPress={choosePhoto} disabled={busy} accessibilityRole="button">
              <Text style={controls.secondaryText}>{hasPhoto ? 'Change photo' : 'Choose photo'}</Text>
            </TouchableOpacity>
            {hasPhoto && (
              <TouchableOpacity style={styles.removePhoto} accessibilityRole="button" disabled={busy}
                onPress={() => { setPhoto(savedPhotoId ? null : undefined); setError(''); }}>
                <Text style={styles.removeText}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.label} accessibilityRole="header">Colour</Text>
        <View style={styles.palette}>
          {AVATAR_COLOURS.map(value => {
            const selected = value === avatarColor;
            return (
              <TouchableOpacity key={value} hitSlop={5} onPress={() => setAvatarColor(value)} disabled={busy}
                style={[styles.swatch, { backgroundColor: value }, selected && styles.swatchSelected]}
                accessibilityRole="button" accessibilityLabel={`Avatar colour ${AVATAR_COLOURS.indexOf(value) + 1}`}
                accessibilityState={{ selected }}>
                {selected && <Ionicons name="checkmark" size={18} color={value === DEFAULT_AVATAR_COLOUR ? colors.white : colors.ink} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.label} accessibilityRole="header">Bio</Text>
        <TextInput style={controls.field} value={bio} onChangeText={setBio} maxLength={BIO_LIMIT} editable={!busy}
          placeholder="A line about you (optional)" placeholderTextColor="#8A8178" returnKeyType="done" accessibilityLabel="Bio" />
        <Text style={styles.hint}>Your username, photo, colour and bio can be seen by anyone on SznLuv once you save.</Text>
        <Text style={styles.label} accessibilityRole="header">{`Top 4 · ${city.name}`}</Text>
        {draft.picks.map((ref, index) => {
          const spot = resolveSpot(ref);
          const key = spotKey(ref);
          const last = index === draft.picks.length - 1;
          return (
            <View key={key} style={styles.pick}>
              <Text style={styles.rank} accessible={false}>{index + 1}</Text>
              <View style={styles.pickWords}>
                <Text style={styles.pickName} numberOfLines={1}>{spot.name}</Text>
                {!!spot.meta && <Text style={styles.pickMeta} numberOfLines={1}>{spot.locality || spot.meta}</Text>}
              </View>
              {index > 0 ? (
                <TouchableOpacity style={styles.icon} hitSlop={4} disabled={busy} accessibilityRole="button" accessibilityLabel={`Move ${spot.name} up`}
                  onPress={() => editPicks(current => movePick(current, cityId, key, -1))}>
                  <Ionicons name="chevron-up" size={20} color={colors.ink} />
                </TouchableOpacity>
              ) : <View style={styles.icon} />}
              {!last ? (
                <TouchableOpacity style={styles.icon} hitSlop={4} disabled={busy} accessibilityRole="button" accessibilityLabel={`Move ${spot.name} down`}
                  onPress={() => editPicks(current => movePick(current, cityId, key, 1))}>
                  <Ionicons name="chevron-down" size={20} color={colors.ink} />
                </TouchableOpacity>
              ) : <View style={styles.icon} />}
              <TouchableOpacity style={styles.icon} hitSlop={4} disabled={busy} accessibilityRole="button" accessibilityLabel={`Replace ${spot.name}`}
                onPress={() => setReplacing(ref)}>
                <Ionicons name="swap-horizontal" size={20} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.icon} hitSlop={4} disabled={busy} accessibilityRole="button" accessibilityLabel={`Remove ${spot.name}`}
                onPress={() => editPicks(current => removePick(current, cityId, key))}>
                <Ionicons name="close" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        })}
        {draft.picks.length < MAX_PICKS && (
          <TouchableOpacity style={styles.addPick} disabled={busy} onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="Add a pick">
            <Ionicons name="add" size={20} color={colors.ink} />
            <Text style={styles.addPickText}>Add pick</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.hint}>
          {draft.public && draft.picks.length ? 'Anyone on SznLuv can see your Top 4.' : 'Only you can see your Top 4. Show it from your profile.'}
        </Text>
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <TouchableOpacity style={[controls.primary, busy && controls.primaryDisabled]} onPress={save} disabled={busy}
          accessibilityRole="button" accessibilityState={{ disabled: busy, busy: saving }}>
          <Text style={controls.primaryText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
      {adding && (
        <AddSpotSheet
          title="Add a pick"
          addedKeys={new Set(draft.picks.map(spotKey))}
          mySpots={mySpots}
          full={draft.picks.length >= MAX_PICKS} fullHint="That’s four. Remove one to add another."
          onAdd={ref => editPicks(current => addPick(current, cityId, ref))}
          onDismiss={() => setAdding(false)}
        />
      )}
      {!!replacing && (
        <AddSpotSheet
          title="Replace pick"
          addedKeys={new Set(draft.picks.map(spotKey))}
          mySpots={mySpots}
          closeOnAdd
          onAdd={ref => editPicks(current => replacePick(current, cityId, spotKey(replacing), ref))}
          onDismiss={() => setReplacing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  photoActions: { flex: 1, alignItems: 'flex-start' },
  removePhoto: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  removeText: { color: colors.error, fontSize: 15, fontWeight: '600' },
  label: { marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#323232' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.ink },
  hint: { marginTop: 8, marginBottom: 12, fontSize: 14, lineHeight: 20, color: colors.muted },
  pick: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  rank: { width: 24, fontSize: 18, fontWeight: '800', color: colors.muted },
  pickWords: { flex: 1, marginRight: 4 },
  pickName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  pickMeta: { fontSize: 13, color: colors.muted },
  icon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  addPick: {
    minHeight: 48, marginTop: 8, borderRadius: 12, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9A88F', backgroundColor: 'rgba(255, 249, 241, 0.6)',
  },
  addPickText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  error: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.error },
});
