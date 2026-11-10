// The signed-in user's own lists, shared by the library, the list page and the sheets.
// Nothing is read or written until a screen first asks for them: that first request also moves any
// old collections into lists (once), so simply opening the app changes no data.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { migrateLegacyCollections, subscribeMyLists } from '../services/lists';

const IDLE = { lists: [], status: 'idle' };
const MyListsContext = createContext({ ...IDLE, request() {}, retry() {} });

export function MyListsProvider({ children }) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  // Both are remembered per account, so signing in as someone else starts from nothing.
  const [loaded, setLoaded] = useState({ uid: null, ...IDLE });
  const [requestedUid, setRequestedUid] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const requested = !!uid && requestedUid === uid;

  useEffect(() => {
    if (!requested) return undefined;
    let active = true;
    let stop = () => {};
    const update = patch => { if (active) setLoaded(previous => ({ ...(previous.uid === uid ? previous : IDLE), uid, ...patch })); };
    const fail = error => {
      console.error('Lists unavailable:', { code: error?.code });
      update({ status: 'error' });
    };
    update({ status: 'loading' });
    migrateLegacyCollections(uid).then(() => {
      if (active) stop = subscribeMyLists(uid, lists => update({ lists, status: 'ready' }), fail);
    }).catch(fail);
    return () => {
      active = false;
      stop();
    };
  }, [uid, requested, attempt]);

  const request = useCallback(() => setRequestedUid(uid ?? null), [uid]);
  const retry = useCallback(() => setAttempt(count => count + 1), []);
  const value = useMemo(() => {
    const { lists, status } = loaded.uid === uid ? loaded : IDLE;
    return { lists, status, request, retry };
  }, [loaded, uid, request, retry]);
  return <MyListsContext.Provider value={value}>{children}</MyListsContext.Provider>;
}

// { lists, status: 'idle' | 'loading' | 'ready' | 'error', retry }
export default function useMyLists() {
  const { request, ...lists } = useContext(MyListsContext);
  useEffect(() => { request(); }, [request]);
  return lists;
}
