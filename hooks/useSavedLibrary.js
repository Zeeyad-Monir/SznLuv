// Everything the Saved page and its "View all" pages show: the spots and the collections the user keeps.
// One shape for both, so search, filters and sort (services/savedLibrary.js) work the same on every page.
//
// Taking the heart off something leaves it where it is, with an empty heart, until the page is left. Nothing
// jumps out from under a finger, and a second tap puts it back. Coming back to the page drops it.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useSaveSpot, { useFavouriteSpots } from './useSaveSpot';
import useMySpots from './useMySpots';
import useSpotEntries from './useSpotEntries';
import useSavedCollections, { useCollectionHeart } from './useSavedCollections';
import { savedCustomSpots } from '../services/customSpotsState';
import { catalogueRef, resolveSpot } from '../services/catalogue';
import { collectionById, collectionCaption, collectionSpots } from '../services/collections';
import { SEASONS } from '../services/savedLibrary';

const freshKept = () => ({ catalogue: new Map(), custom: new Map(), collections: new Map() });

export default function useSavedLibrary() {
  const [favourites, setFavourites, spotsLoaded] = useFavouriteSpots();
  const { toggleFavouriteSpot, toggleCustomSpot } = useSaveSpot(favourites, setFavourites);
  const privateSpots = useMySpots();
  const { saved: keptCollections, status: collectionsStatus, isSaved: isCollectionSaved, retry: retryCollections } = useSavedCollections();
  const { toggleHeart } = useCollectionHeart();

  // What has been on screen since the page was last opened.
  // Leaving the page forgets it, and `visit` makes the lists below be worked out again for the next visit.
  const kept = useRef(freshKept());
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => () => {
    kept.current = freshKept();
    setVisit(count => count + 1);
  }, []));

  // The app's spots, by name. A spot SznLuv no longer lists stays, so it can still be removed.
  const catalogue = useMemo(() => {
    Object.entries(favourites).forEach(([name, entry]) => {
      if (!name.startsWith('x:') && entry?.isFavourite && SEASONS.includes(entry.season)) kept.current.catalogue.set(name, entry);
    });
    return [...kept.current.catalogue].map(([name, entry]) => {
      const spot = { ...resolveSpot(catalogueRef(name)), missing: false };
      return {
        key: name, kind: 'spot', own: false, name, meta: spot.meta, locality: spot.locality, season: entry.season,
        savedAt: entry.savedAt, saved: !!favourites[name]?.isFavourite, spot, ref: catalogueRef(name),
        address: entry.location,
      };
    });
  }, [favourites, visit]);

  // Spots people made: the user's own from their records, anyone else's from its public copy.
  const customRefs = useMemo(() => {
    savedCustomSpots(favourites).forEach(({ id, owner, name, savedAt }) => {
      kept.current.custom.set(id, { k: 'x', id, owner, name, savedAt });
    });
    return [...kept.current.custom.values()];
  }, [favourites, visit]);
  const { entries } = useSpotEntries(customRefs, { privateSpots });
  const custom = entries.map(({ ref, spot, details, status }, index) => {
    const shown = status === 'unavailable' ? { ...spot, meta: 'No longer shared' } : spot;
    return {
      key: `x:${customRefs[index].id}`, kind: 'spot', own: true, name: shown.name, meta: shown.meta, locality: shown.locality,
      savedAt: customRefs[index].savedAt, saved: !!favourites[`x:${customRefs[index].id}`]?.isFavourite,
      spot: shown, ref, thumbnail: details?.photos?.[0],
    };
  });

  // Collections, by ID. One the app no longer makes is left out rather than shown broken.
  Object.entries(keptCollections).forEach(([id, entry]) => {
    if (collectionById(id)) kept.current.collections.set(id, entry);
  });
  const collections = [...kept.current.collections].map(([id, entry]) => {
    const collection = collectionById(id);
    return {
      key: id, kind: 'collection', name: collection.title, meta: collectionCaption(id), season: collection.season,
      savedAt: entry.savedAt, saved: isCollectionSaved(id), collection, spotCount: collectionSpots(id).length,
    };
  });

  const toggleSpot = useCallback(item => (item.own
    ? toggleCustomSpot(item.ref)
    : toggleFavouriteSpot({ name: item.name, season: item.season, address: item.address })), [toggleCustomSpot, toggleFavouriteSpot]);
  const toggleCollection = useCallback(item => toggleHeart(item.key), [toggleHeart]);

  return {
    spots: [...custom, ...catalogue],
    collections,
    spotsLoaded,
    collectionsStatus,
    retryCollections,
    toggleSpot,
    toggleCollection,
  };
}
