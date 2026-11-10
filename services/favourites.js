import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { toggleFavourite, removeFavourite } from './favouritesState';

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
// With `returnPrevious`, resolves to the entry that was removed so the caller can offer Undo.
export async function removeSavedSpot(uid, name, { returnPrevious = false } = {}) {
  let previous;
  const next = await mutateFavourites(uid, data => {
    previous = data[name];
    return removeFavourite(data, name);
  });
  return returnPrevious ? previous : next;
}
export const restoreSavedSpot = (uid, name, entry) => mutateFavourites(uid, data => ({ ...data, [name]: entry ?? data[name] }));
