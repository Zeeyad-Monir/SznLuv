import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { toggleFavourite, removeFavourite, changeCollection } from './favouritesState';

// Recompute against the latest document on every Firestore transaction retry.
export async function mutateFavourites(uid, change) {
  if (!uid) throw new Error('You must be logged in.');
  const ref = doc(db, 'favourites', uid);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const next = change(snapshot.exists() ? snapshot.data() : {});
    transaction.set(ref, next);
    return next;
  });
}
export const toggleSavedSpot = (uid, name, entry) => mutateFavourites(uid, data => toggleFavourite(data, name, entry));
export const removeSavedSpot = (uid, name) => mutateFavourites(uid, data => removeFavourite(data, name));
export const updateCollection = (uid, action) => mutateFavourites(uid, data => changeCollection(data, action));
