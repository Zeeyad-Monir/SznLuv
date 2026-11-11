// Edit the public photo, fallback colour and bio together.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import SheetHeader from '../components/SheetHeader';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { AVATAR_COLOURS, BIO_LIMIT, DEFAULT_AVATAR_COLOUR } from '../services/profiles';
import { chooseProfilePhoto, saveProfileEdit } from '../services/profilePhotos';

export default function EditProfileSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, username } = useContext(AuthContext);
  const [bio, setBio] = useState(route?.params?.bio ?? '');
  const [avatarColor, setAvatarColor] = useState(route?.params?.avatarColor ?? DEFAULT_AVATAR_COLOUR);
  const savedPhotoId = route?.params?.avatarPhotoId;
  const [photo, setPhoto] = useState(undefined);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const pickerOpen = useRef(false);
  const previewId = photo === undefined ? savedPhotoId : null;
  const hasPhoto = !!(previewId || photo);
  const busy = picking || saving || saved;

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

  const save = async () => {
    if (submitting.current || pickerOpen.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await saveProfileEdit(user?.uid, username, { bio, avatarColor }, photo);
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
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <TouchableOpacity style={[controls.primary, busy && controls.primaryDisabled]} onPress={save} disabled={busy}
          accessibilityRole="button" accessibilityState={{ disabled: busy, busy: saving }}>
          <Text style={controls.primaryText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  error: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.error },
});
