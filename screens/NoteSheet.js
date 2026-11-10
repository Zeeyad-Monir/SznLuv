// Bottom sheet for the note on one spot in a list. Opened with { listId, spotKey, name, note }.
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetHeader from '../components/SheetHeader';
import { colors, controls } from '../components/theme';
import { mutateList } from '../services/lists';
import { LIMITS, setNote } from '../services/listsState';

export default function NoteSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { listId, spotKey, name, note: initial = '' } = route?.params ?? {};
  const [note, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const save = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await mutateList(listId, list => setNote(list, spotKey, note));
      navigation.goBack();
    } catch (failure) {
      console.error('Error saving note:', { code: failure?.code });
      setError(failure?.code?.startsWith('list/') ? failure.message : 'Couldn’t save. Check your connection.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Note" closeLabel="Close Note" onClose={() => navigation.goBack()} />
      <Text style={styles.subject} numberOfLines={1}>{name}</Text>
      <TextInput
        style={[controls.field, styles.input]} value={note} onChangeText={setText} maxLength={LIMITS.note}
        placeholder="What should someone know?" placeholderTextColor="#8A8178" multiline autoFocus
        accessibilityLabel={`Note for ${name}`}
      />
      <Text style={styles.count} accessibilityLabel={`${note.length} of ${LIMITS.note} characters`}>
        {note.length}/{LIMITS.note}
      </Text>
      <Text style={styles.hint}>If this list is public, people who open it can read your notes.</Text>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <TouchableOpacity style={[controls.primary, saving && controls.primaryDisabled]} onPress={save} disabled={saving}
        accessibilityRole="button" accessibilityState={{ disabled: saving }}>
        <Text style={controls.primaryText}>{note.trim() || !initial ? 'Save note' : 'Remove note'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  subject: { marginTop: -12, marginBottom: 16, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.muted },
  input: { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
  count: { marginTop: 4, textAlign: 'right', fontSize: 13, fontWeight: '600', color: colors.muted },
  hint: { marginTop: 4, marginBottom: 12, fontSize: 14, lineHeight: 20, color: colors.muted },
  error: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: colors.error },
});
