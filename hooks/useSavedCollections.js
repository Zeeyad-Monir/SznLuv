// Collections the user chose to keep, from users/{uid}/savedCollections/{collectionId}. One live listener
// for the whole app, so a heart on a season card and the tile in My lists always agree.
// Nothing is read until a screen first asks, like hooks/useMyLists.js.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { selectionAsync } from 'expo-haptics';
import { db } from '../firebaseConfig';
import { AuthContext } from '../contexts/AuthContext';
import { useSnackbar } from '../components/Snackbar';
import { collectionById } from '../services/collections';

const NONE = {};
const IDLE = { saved: NONE, status: 'idle' };
const SavedCollectionsContext = createContext({
  ...IDLE, isSaved: () => false, toggle: async () => null, request() {}, retry() {},
});

export function SavedCollectionsProvider({ children }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const [loaded, setLoaded] = useState({ uid: null, ...IDLE });
  const [requestedUid, setRequestedUid] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // A tap shows straight away and the listener confirms it. Each entry lasts only while its write is out.
  const [pending, setPending] = useState({});
  const inFlight = useRef(new Set());
  const requested = !!uid && requestedUid === uid;

  useEffect(() => {
    if (!requested) return undefined;
    setLoaded(previous => (previous.uid === uid && previous.status === 'ready' ? previous : { uid, saved: NONE, status: 'loading' }));
    return onSnapshot(collection(db, 'users', uid, 'savedCollections'), snapshot => {
      const saved = {};
      snapshot.docs.forEach(entry => { saved[entry.id] = entry.data(); });
      setLoaded({ uid, saved, status: 'ready' });
    }, error => {
      console.error('Saved collections unavailable:', { code: error?.code });
      setLoaded(previous => ({ ...(previous.uid === uid ? previous : IDLE), uid, status: 'error' }));
    });
  }, [uid, requested, attempt]);

  const current = loaded.uid === uid ? loaded : IDLE;
  const latest = useRef(current.saved);
  latest.current = current.saved;

  // Resolves to true (now saved), false (now removed) or null (ignored: that heart is still saving).
  // The document ID is the collection ID, so however often it is tapped there is never a second entry.
  const toggle = useCallback(async id => {
    if (!uid) throw new Error('You must be logged in.');
    if (inFlight.current.has(id)) return null;
    const next = !latest.current[id];
    inFlight.current.add(id);
    setPending(previous => ({ ...previous, [id]: next }));
    const ref = doc(db, 'users', uid, 'savedCollections', id);
    try {
      if (next) await setDoc(ref, { collectionId: id, cityId: collectionById(id)?.cityId ?? null, savedAt: Date.now() });
      else await deleteDoc(ref);
      return next;
    } finally {
      inFlight.current.delete(id);
      setPending(({ [id]: _settled, ...rest }) => rest);
    }
  }, [uid]);

  const request = useCallback(() => setRequestedUid(uid ?? null), [uid]);
  const retry = useCallback(() => setAttempt(count => count + 1), []);
  const value = useMemo(() => ({
    saved: current.saved,
    status: current.status,
    isSaved: id => (id in pending ? pending[id] : !!current.saved[id]),
    toggle,
    request,
    retry,
  }), [current, pending, toggle, request, retry]);
  return <SavedCollectionsContext.Provider value={value}>{children}</SavedCollectionsContext.Provider>;
}

// { saved: { [collectionId]: { savedAt, ... } }, status, isSaved(id), toggle(id), retry }
export default function useSavedCollections() {
  const { request, ...value } = useContext(SavedCollectionsContext);
  useEffect(() => { request(); }, [request]);
  return value;
}

// The collection heart with its feedback: a haptic, then a snackbar to view the collection or undo.
// A failed save puts the heart back (the pending state clears) and says so.
export function useCollectionHeart() {
  const { isSaved, toggle } = useSavedCollections();
  const snackbar = useSnackbar();
  const navigation = useNavigation();

  const toggleHeart = useCallback(async id => {
    const title = collectionById(id)?.title ?? 'Collection';
    let saved;
    try {
      saved = await toggle(id);
    } catch (error) {
      console.error('Error saving collection:', { code: error?.code });
      snackbar.show({ message: 'Couldn’t save. Check your connection.' });
      return;
    }
    if (saved === null) return;
    if (Platform.OS === 'ios') selectionAsync().catch(() => {});
    if (saved) {
      snackbar.show({
        message: `${title} saved to My lists`,
        actionLabel: 'View',
        onAction: () => navigation.navigate('FavouritesTab', { screen: 'Favourites', params: { segment: 'lists' } }),
      });
    } else {
      snackbar.show({ message: `Removed ${title} from My lists`, actionLabel: 'Undo', onAction: () => toggleHeart(id) });
    }
  }, [navigation, snackbar, toggle]);

  return { isSaved, toggleHeart };
}
