// Bottom sheet for filing a newly favourited spot into a collection, shared by all four season screens.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetHeader from '../components/SheetHeader';
import { deliverCollectionPick } from '../services/collectionPicker';

export default function ChooseCollectionSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const collections = route?.params?.collections ?? [];

  const pick = (title) => {
    navigation.goBack();
    deliverCollectionPick(title);
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Collections" closeLabel="Close Collections" onClose={() => navigation.goBack()} />
      {collections.length > 0 ? (
        <View style={[styles.list, collections.length < 4 && { height: collections.length * ROW_HEIGHT }]}>
          <ScrollView>
            {collections.map((collection) => (
              <TouchableOpacity
                key={collection.title}
                style={[styles.collectionButton, { backgroundColor: collection.color }]}
                onPress={() => pick(collection.title)}
                accessibilityLabel={`Add to ${collection.title} Collection`}
                accessibilityRole="button"
              >
                <Text style={styles.collectionButtonText}>{collection.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <Text style={styles.emptyText}>No Collections Available. Create one first!</Text>
      )}
    </View>
  );
}

const ROW_HEIGHT = 60; // 50pt button + 10pt gap; the list shows four rows, then scrolls

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  list: {
    width: '100%',
    height: ROW_HEIGHT * 4,
  },
  collectionButton: {
    marginVertical: 5,
    borderRadius: 8,
    height: 50,
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  collectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
  },
});
