// Bottom sheet for creating a collection. Favourites refetches on focus, so the new one appears on dismiss.
import React, { useContext, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetHeader from '../components/SheetHeader';
import { AuthContext } from '../contexts/AuthContext';
import { updateCollection } from '../services/favourites';

const COLORS = [
  { value: '#FFC1E3', name: 'Pink' },
  { value: '#A7C8FF', name: 'Blue' },
  { value: '#A8E6CF', name: 'Green' },
  { value: '#FFF9C4', name: 'Yellow' },
  { value: '#FF8B94', name: 'Coral' },
  { value: '#D3BFFF', name: 'Lavender' },
  { value: '#FF8657', name: 'Orange' },
];

export default function CreateCollectionSheet({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const canCreate = !!title.trim() && !!selectedColor && !saving;

  const create = async () => {
    if (submitting.current || !canCreate) return;
    submitting.current = true;
    setSaving(true);
    try {
      // Wait for the save so the refetch when this sheet closes sees the new collection.
      await updateCollection(user?.uid, { type: 'create', title: title.trim(), color: selectedColor });
      navigation.goBack();
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', error.message === 'Title already exists.' ? error.message : 'Failed to create collection. Please try again.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Create a Collection" closeLabel="Close Create Collection" onClose={() => navigation.goBack()} />

      <TextInput
        style={styles.titleInput}
        placeholder="Create title"
        placeholderTextColor="#999"
        value={title}
        onChangeText={setTitle}
        returnKeyType="done"
        accessibilityLabel="Collection title"
      />

      <View style={styles.palette}>
        {COLORS.map(({ value, name }) => (
          <TouchableOpacity
            key={value}
            style={[styles.colorCircle, { backgroundColor: value }, value === selectedColor && styles.colorCircleSelected]}
            onPress={() => setSelectedColor(value)}
            hitSlop={4}
            accessibilityLabel={`${name} colour`}
            accessibilityRole="button"
            accessibilityState={{ selected: value === selectedColor }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
        onPress={create}
        disabled={!canCreate}
        accessibilityLabel="Create new collection"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canCreate }}
      >
        <Text style={styles.createButtonText}>Create</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  titleInput: {
    width: '90%',
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    color: '#000',
  },
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 6, // Keeps all seven colours on one row on current iPhones
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#000',
  },
  createButton: {
    width: '60%',
    height: 44,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
