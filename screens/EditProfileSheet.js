// Bottom sheet for the two things on a profile you can change: avatar colour and a one-line bio.
// Opened with { bio, avatarColor }.
import React, { useContext, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SheetHeader from '../components/SheetHeader';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { AVATAR_COLOURS, BIO_LIMIT, DEFAULT_AVATAR_COLOUR, saveProfileDetails } from '../services/profiles';

export default function EditProfileSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, username } = useContext(AuthContext);
  const [bio, setBio] = useState(route?.params?.bio ?? '');
  const [avatarColor, setAvatarColor] = useState(route?.params?.avatarColor ?? DEFAULT_AVATAR_COLOUR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const save = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await saveProfileDetails(user?.uid, username, { bio, avatarColor });
      navigation.goBack();
    } catch (failure) {
      console.error('Error saving profile:', { code: failure?.code });
      setError('Couldn’t save. Check your connection.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Edit profile" closeLabel="Close Edit profile" onClose={() => navigation.goBack()} />
      <Text style={styles.label} accessibilityRole="header">Colour</Text>
      <View style={styles.palette}>
        {AVATAR_COLOURS.map(value => {
          const selected = value === avatarColor;
          return (
            <TouchableOpacity key={value} hitSlop={5} onPress={() => setAvatarColor(value)}
              style={[styles.swatch, { backgroundColor: value }, selected && styles.swatchSelected]}
              accessibilityRole="button" accessibilityLabel={`Avatar colour ${AVATAR_COLOURS.indexOf(value) + 1}`}
              accessibilityState={{ selected }}>
              {selected && <Ionicons name="checkmark" size={18} color={value === DEFAULT_AVATAR_COLOUR ? colors.white : colors.ink} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.label} accessibilityRole="header">Bio</Text>
      <TextInput style={controls.field} value={bio} onChangeText={setBio} maxLength={BIO_LIMIT}
        placeholder="A line about you (optional)" placeholderTextColor="#8A8178" returnKeyType="done" accessibilityLabel="Bio" />
      <Text style={styles.hint}>Your username, colour and bio can be seen by anyone on SznLuv once you save.</Text>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <TouchableOpacity style={[controls.primary, saving && controls.primaryDisabled]} onPress={save} disabled={saving}
        accessibilityRole="button" accessibilityState={{ disabled: saving }}>
        <Text style={controls.primaryText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  label: { marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#323232' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.ink },
  hint: { marginTop: 8, marginBottom: 12, fontSize: 14, lineHeight: 20, color: colors.muted },
  error: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.error },
});
