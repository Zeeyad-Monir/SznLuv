// One saved spot on the Saved pages: the spot card from lists and collections in its Saved look (ivory with a
// thin edge, roomier). Its heart shows whether it is still kept.
// `item` comes from hooks/useSavedLibrary.js.
import React from 'react';
import SpotCard from './SpotCard';

export default function SavedSpotRow({ item, onOpen, onToggle }) {
  return (
    <SpotCard spot={item.spot} saved={item.saved} thumbnail={item.thumbnail} variant="saved"
      onPress={() => onOpen(item)} onToggleSave={() => onToggle(item)} />
  );
}
