// Everything the Map tab can pin, gathered from where it is already kept: single hearts, my lists, the
// seasons I kept, and the lists I follow. services/mapSpots.js decides which of them count.
//
// Kept cheap on purpose. Hearts, my lists, my spots and kept seasons use the listeners the app already runs.
// A followed list is read once, and only when it is switched on for the map or picked in the filter. Someone
// else's spot is read once, and only when its reference doesn't say where it is. Both are remembered for the
// session and read again after five minutes, when the tab is opened or the app comes back. Moving the map
// reads nothing.
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { getPublicSpot } from '../services/customSpots';
import { ownerOfSpotId } from '../services/customSpotsState';
import { subscribeFollowedLists } from '../services/follows';
import { getPublicList } from '../services/lists';
import {
  eligibleRefs, mapSources, neededListIds, needsPublicCopy, pinnable, pruneSelection, selectableSources, toMapSpot,
} from '../services/mapSpots';
import useMyLists from './useMyLists';
import useMySpots from './useMySpots';
import { useFavouriteSpots } from './useSaveSpot';
import useSavedCollections from './useSavedCollections';

const FRESH_MS = 5 * 60 * 1000;
const NONE = [];

// Public copies read this session: "uid|collection/id" -> { at, value }. A null value means "not shared".
const copies = new Map();
const failures = new Set();
const inFlight = new Set();
const watchers = new Set();
const announce = () => watchers.forEach(watch => watch());
const copyKey = (uid, collection, id) => `${uid}|${collection}/${id}`;

function usePublicCopies(uid, collection, load, ids, checkedAt) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const watch = () => setVersion(count => count + 1);
    watchers.add(watch);
    return () => { watchers.delete(watch); };
  }, []);

  const idsKey = JSON.stringify([...new Set(ids)].sort());
  useEffect(() => {
    if (!uid) return;
    for (const id of JSON.parse(idsKey)) {
      const key = copyKey(uid, collection, id);
      const held = copies.get(key);
      if (inFlight.has(key) || failures.has(key) || (held && Date.now() - held.at < FRESH_MS)) continue;
      inFlight.add(key);
      load(id).then(value => {
        copies.set(key, { at: Date.now(), value: value ?? null });
      }, error => {
        // A copy that was withdrawn can answer "not allowed" rather than "not there".
        if (error?.code === 'permission-denied') copies.set(key, { at: Date.now(), value: null });
        else {
          console.error('Map data unavailable:', { code: error?.code });
          failures.add(key);
        }
      }).finally(() => {
        inFlight.delete(key);
        announce();
      });
    }
  }, [uid, collection, load, idsKey, checkedAt]);

  const wanted = JSON.parse(idsKey).map(id => copyKey(uid, collection, id));
  return {
    version,
    // undefined until read; null when it isn't shared.
    read: id => copies.get(copyKey(uid, collection, id))?.value,
    loading: wanted.some(key => !copies.has(key) && !failures.has(key)),
    failed: wanted.some(key => failures.has(key)),
  };
}

const waiting = status => status === 'idle' || status === 'loading';

// `selectedIds`: the lists picked in the map's filter (services/mapSpots.js source IDs).
export default function useMapSpots(selectedIds = NONE) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const [attempt, setAttempt] = useState(0);
  const [checkedAt, setCheckedAt] = useState(0);
  const [heartsFailed, setHeartsFailed] = useState(false);
  const [favourites, , heartsReady] = useFavouriteSpots(() => setHeartsFailed(true), attempt);
  const lists = useMyLists();
  const mySpots = useMySpots();
  const kept = useSavedCollections();

  const [follows, setFollows] = useState({ uid: null, pointers: NONE, status: 'loading' });
  useEffect(() => {
    if (!uid) return undefined;
    setFollows(previous => (previous.uid === uid ? previous : { uid, pointers: NONE, status: 'loading' }));
    return subscribeFollowedLists(uid, pointers => setFollows({ uid, pointers, status: 'ready' }), error => {
      console.error('Followed lists unavailable:', { code: error?.code });
      setFollows(previous => ({ uid, pointers: previous.uid === uid ? previous.pointers : NONE, status: 'error' }));
    });
  }, [uid, attempt]);
  const pointers = follows.uid === uid ? follows.pointers : NONE;
  const followsStatus = follows.uid === uid ? follows.status : 'loading';

  const refresh = useCallback(() => setCheckedAt(Date.now()), []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [refresh]);

  const publicLists = usePublicCopies(uid, 'publicLists', getPublicList, neededListIds(pointers, selectedIds), checkedAt);
  const sources = useMemo(() => mapSources({
    favourites,
    myLists: lists.lists,
    followed: pointers.map(pointer => ({ pointer, list: publicLists.read(pointer.id) })),
    keptCollections: kept.saved,
  }), [favourites, lists.lists, pointers, kept.saved, publicLists.version, uid]);

  // A list only leaves the selection once it is known to be gone, not while things are still arriving.
  const settled = lists.status === 'ready' && kept.status === 'ready' && followsStatus === 'ready' && !publicLists.loading;
  const selection = useMemo(() => (settled ? pruneSelection(selectedIds, sources) : selectedIds), [settled, selectedIds, sources]);

  const refs = useMemo(() => eligibleRefs(sources, selection), [sources, selection]);
  const publicSpots = usePublicCopies(uid, 'publicSpots', getPublicSpot,
    refs.filter(ref => needsPublicCopy(ref, uid)).map(ref => ref.id), checkedAt);

  const pins = useMemo(() => pinnable(refs.map(ref => {
    if (ref.k !== 'x') return toMapSpot(ref);
    const owner = ref.owner ?? ownerOfSpotId(ref.id);
    const details = owner === uid ? mySpots.byId[ref.id] : publicSpots.read(ref.id);
    // A record that isn't its stated owner's is ignored, as on list pages.
    return toMapSpot(ref, details && (!owner || details.ownerUid === owner) ? details : undefined);
  }).filter(Boolean)), [refs, mySpots.byId, publicSpots.version, uid]);

  const savedCount = useMemo(() => eligibleRefs(sources, NONE).length, [sources]);
  const options = useMemo(() => selectableSources(sources).map(({ id, title, caption }) => ({ id, title, caption })), [sources]);

  const loading = !heartsReady || waiting(lists.status) || waiting(kept.status) || waiting(mySpots.status)
    || followsStatus === 'loading' || publicLists.loading || publicSpots.loading;
  const failed = heartsFailed || lists.status === 'error' || kept.status === 'error' || mySpots.status === 'error'
    || followsStatus === 'error' || publicLists.failed || publicSpots.failed;

  const retry = useCallback(() => {
    failures.clear();
    setHeartsFailed(false);
    if (lists.status === 'error') lists.retry();
    if (kept.status === 'error') kept.retry();
    if (mySpots.status === 'error') mySpots.retry();
    setAttempt(count => count + 1);
    setCheckedAt(Date.now());
  }, [lists, kept, mySpots]);

  return {
    pins,                 // spots with a place, one per spot, before search and the other filters
    options,              // lists that can be picked in the filter
    selection,            // the picked lists that still exist
    savedCount,           // how many spots the default map holds, pinned or not
    spotCount: refs.length,
    status: loading && !failed ? 'loading' : 'ready',
    failed,
    retry,
    refresh,
  };
}
