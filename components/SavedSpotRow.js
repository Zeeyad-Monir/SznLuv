// One saved spot on the Saved pages: the spot card from lists and collections, the same size and spacing,
// in the Saved pages' slightly darker colour. Its heart shows whether it is still kept.
// `item` comes from hooks/useSavedLibrary.js.
import React from 'react';
import { StyleSheet } from 'react-native';
import SpotCard from './SpotCard';
import { colors } from './theme';

export default function SavedSpotRow({ item, onOpen, onToggle }) {
  return (
    <SpotCard spot={item.spot} saved={item.saved} thumbnail={item.thumbnail} style={styles.card}
      onPress={() => onOpen(item)} onToggleSave={() => onToggle(item)} />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.savedCard },
});
