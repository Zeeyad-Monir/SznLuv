// The signed-in user's own spots (spots/{id}), shared by Saved, the editor, the spot page and the
// "Add a spot" sheet. Nothing is read until a screen first asks, like hooks/useMyLists.js.
// The first request also brings own spots from before spots had records over to records, and so does
// any later list that still holds one (an older version of the app can still add them).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MyListsContext } from './useMyLists';
import { migrateLegacySpots, reconcilePublicSpots, subscribeMySpots } from '../services/customSpots';
import { isLegacyRef } from '../services/customSpotsState';

const IDLE = { spots: [], status: 'idle' };
const MySpotsContext = createContext({ ...IDLE, byId: {}, request() {}, retry() {} });

export function MySpotsProvider({ children }) {
  const { user, username } = useContext(AuthContext);
  const uid = user?.uid;
  const lists = useContext(MyListsContext);
  const [loaded, setLoaded] = useState({ uid: null, ...IDLE });
  const [requestedUid, setRequestedUid] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const requested = !!uid && requestedUid === uid;
  const requestLists = lists.request;

  useEffect(() => {
    if (!requested) return undefined;
    requestLists(); // Old own spots are found in the lists
    setLoaded(previous => (previous.uid === uid && previous.status === 'ready' ? previous : { uid, ...IDLE, status: 'loading' }));
    return subscribeMySpots(uid, spots => setLoaded({ uid, spots, status: 'ready' }), error => {
      console.error('Spots unavailable:', { code: error?.code });
      setLoaded(previous => ({ ...(previous.uid === uid ? previous : IDLE), uid, status: 'error' }));
    });
  }, [uid, requested, attempt, requestLists]);

  // Once per account per session (for Top 4), then whenever a list turns up an old reference.
  // The first time, shared copies of the user's spots are also checked against their public lists.
  const checked = useRef(null);
  const reconciled = useRef(null);
  const running = useRef(false);
  const listsReady = lists.status === 'ready';
  const hasLegacy = listsReady && lists.lists.some(list => list.items.some(item => isLegacyRef(item.spot)));
  useEffect(() => {
    if (!requested || !listsReady || running.current) return;
    if (checked.current === uid && !hasLegacy) return;
    running.current = true;
    migrateLegacySpots(uid, lists.lists)
      .catch(error => console.error('Own spots not brought over:', { code: error?.code }))
      .then(() => {
        if (reconciled.current === uid || !username) return undefined;
        reconciled.current = uid;
        return reconcilePublicSpots(uid, username).catch(error => console.error('Shared spots not checked:', { code: error?.code }));
      })
      .finally(() => {
        checked.current = uid;
        running.current = false;
      });
  }, [requested, listsReady, hasLegacy, uid, username, lists.lists]);

  const request = useCallback(() => setRequestedUid(uid ?? null), [uid]);
  const retry = useCallback(() => setAttempt(count => count + 1), []);
  const value = useMemo(() => {
    const { spots, status } = loaded.uid === uid ? loaded : IDLE;
    return { spots, status, byId: Object.fromEntries(spots.map(spot => [spot.id, spot])), request, retry };
  }, [loaded, uid, request, retry]);
  return <MySpotsContext.Provider value={value}>{children}</MySpotsContext.Provider>;
}

// { spots (newest first), byId, status: 'idle' | 'loading' | 'ready' | 'error', retry }
export default function useMySpots() {
  const { request, ...spots } = useContext(MySpotsContext);
  useEffect(() => { request(); }, [request]);
  return spots;
}
