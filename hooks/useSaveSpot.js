// The heart. On a spot from the app it saves to that season's favourites straight away and offers
// "Add to list"; on a spot someone added themselves (no season to file it under) it opens the list picker.
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { selectionAsync } from 'expo-haptics';
import { db } from '../firebaseConfig';
import { AuthContext } from '../contexts/AuthContext';
import { useSnackbar } from '../components/Snackbar';
import { toggleSavedSpot } from '../services/favourites';
import { toggleFavourite } from '../services/favouritesState';
import { catalogueRef, findCatalogueSpot, isOwnSpot } from '../services/catalogue';

const SAVE_FAILED = 'Couldn’t save. Check your connection.';

// Live copy of the user's saved spots, keyed by spot name. `onError` runs if they can't be loaded.
export function useFavouriteSpots(onError) {
  const { user } = useContext(AuthContext);
  const [favourites, setFavourites] = useState({});
  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'favourites', user.uid), snapshot => {
      setFavourites(snapshot.exists() ? snapshot.data() : {});
    }, error => {
      console.error('Favourites subscription failed:', { code: error.code });
      onError?.(error);
    });
  }, [user]);
  return [favourites, setFavourites];
}

// `sourceListId`: the public list the spots are being saved from, if any, for the launch metrics.
export default function useSaveSpot(favourites, setFavourites, { sourceListId } = {}) {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const snackbar = useSnackbar();
  // Undo runs from a snackbar created earlier, so it must read the saved spots as they are now.
  const latest = useRef(favourites);
  latest.current = favourites;

  const addToList = useCallback(spot => {
    navigation.navigate('AddToList', sourceListId ? { spot, sourceListId } : { spot });
  }, [navigation, sourceListId]);

  // `spot` is { name, address, season }. The heart fills at once and is put back if the save fails.
  const toggleFavouriteSpot = useCallback(async spot => {
    const entry = { isFavourite: true, season: spot.season, location: spot.address ?? '' };
    const before = latest.current;
    setFavourites(toggleFavourite(before, spot.name, entry));
    try {
      const next = await toggleSavedSpot(user?.uid, spot.name, entry);
      setFavourites(next);
      const saved = !!next[spot.name]?.isFavourite;
      if (Platform.OS === 'ios') selectionAsync().catch(() => {});
      if (saved) {
        snackbar.show({
          message: `Saved to ${spot.season} favourites`,
          actionLabel: 'Add to list',
          onAction: () => addToList(catalogueRef(spot.name)),
        });
      } else {
        snackbar.show({ message: 'Removed from favourites', actionLabel: 'Undo', onAction: () => toggleFavouriteSpot(spot) });
      }
    } catch (error) {
      console.error('Error updating favourites:', { code: error?.code });
      setFavourites(before);
      snackbar.show({ message: SAVE_FAILED });
    }
  }, [addToList, setFavourites, snackbar, user]);

  // For a spot reference from a list or Top 4.
  const saveRef = useCallback(ref => {
    if (isOwnSpot(ref)) return addToList(ref);
    const spot = findCatalogueSpot(ref.name);
    if (spot) toggleFavouriteSpot(spot);
    return undefined;
  }, [addToList, toggleFavouriteSpot]);

  const isSaved = useCallback(ref => !isOwnSpot(ref) && !!favourites[ref.name]?.isFavourite, [favourites]);

  return { toggleFavouriteSpot, saveRef, isSaved, addToList };
}
