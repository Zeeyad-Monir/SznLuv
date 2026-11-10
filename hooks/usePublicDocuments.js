import { useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';

const LOADING = { status: 'loading' };
const ERROR = { status: 'error' };
const TIMEOUT_MS = 12000;

// Public copies can be withdrawn. A cache-only snapshot cannot authorize showing one.
function watchPublicDocument(path, update) {
  let verified = false;
  const timer = setTimeout(() => update(ERROR), TIMEOUT_MS);
  const stop = onSnapshot(doc(db, path), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.fromCache) {
      if (verified) update(ERROR);
      return;
    }
    // Following a list can temporarily update its follower count in the local cache.
    if (snapshot.metadata.hasPendingWrites) return;
    verified = true;
    clearTimeout(timer);
    update(snapshot.exists()
      ? { status: 'ready', value: { id: snapshot.id, ...snapshot.data() } }
      : { status: 'unavailable' });
  }, error => {
    clearTimeout(timer);
    update(error.code === 'permission-denied' ? { status: 'unavailable' } : ERROR);
  });
  return () => {
    clearTimeout(timer);
    stop();
  };
}

export default function usePublicDocuments(collection, ids) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const idsKey = JSON.stringify([...new Set(ids)].sort());
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([uid, collection, idsKey, attempt]);
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    let active = true;
    const stops = JSON.parse(idsKey).map(id => watchPublicDocument(`${collection}/${id}`, result => {
      if (active) setLoaded(previous => ({
        key, entries: { ...(previous?.key === key ? previous.entries : {}), [id]: result },
      }));
    }));
    return () => {
      active = false;
      stops.forEach(stop => stop());
    };
  }, [uid, collection, idsKey, key]);

  useEffect(() => {
    if (!uid || idsKey === '[]') return undefined;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setAttempt(value => value + 1);
    });
    return () => subscription.remove();
  }, [uid, idsKey]);

  const entries = loaded?.key === key ? loaded.entries : {};
  return {
    read: id => Object.hasOwn(entries, id) ? entries[id] : LOADING,
    retry: () => setAttempt(value => value + 1),
  };
}
