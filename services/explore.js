// The personalised Explore feed. The ranking runs in a Cloud Function (functions/, docs/EXPLORE_RECS.md);
// this sends it what the app already knows about its own user and keeps the answer for a while, so coming
// back to Explore costs nothing. If the function can't be reached the caller falls back to the newest lists.
//
// Opening Explore should not wait on the network, so the last answer is also saved on the device: after a
// restart that one is shown at once while a new ranking is fetched for the next visit, and MainTabs asks
// for the ranking as soon as the app opens (warmExploreFeed) rather than when the tab is tapped.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { recentOpens, setEventsAlgo } from './events';
import { buildSignals } from './exploreState';
import { loadFollowedListPointers, loadFollowedPeople } from './follows';
import { getBlocked } from './moderation';

const KEEP_MS = 15 * 60 * 1000;
const SAVED_MS = 24 * 60 * 60 * 1000; // A saved ranking older than this is not worth showing
const RETRY_AFTER_MS = 5 * 60 * 1000; // After a failure, don't make every visit wait on a function that is down
const TIMEOUT_MS = 6000;

let kept = null; // { uid, cityId, at, feed }
let failedAt = 0;
let epoch = 0; // Raised by forgetExploreFeed, so an answer already on its way is not kept afterwards
let stored = null; // { uid, record: Promise<{ cityId, at, feed, off } | null> }: what the device has saved
const pending = new Map(); // `${uid}:${cityId}` -> the request in flight, shared by everyone who asks

const call = httpsCallable(functions, 'getExploreFeed', { timeout: TIMEOUT_MS });
const savedKey = uid => `explore.feed.${uid}`;
const isFresh = (uid, cityId, now) => kept?.uid === uid && kept.cityId === cityId && now - kept.at < KEEP_MS;
const settle = value => Promise.resolve(typeof value === 'function' ? value() : value);

function readSaved(uid) {
  if (stored?.uid !== uid) {
    stored = {
      uid,
      record: AsyncStorage.getItem(savedKey(uid)).then(text => JSON.parse(text) ?? null).catch(() => null),
    };
  }
  return stored.record;
}

function writeSaved(uid, record) {
  stored = { uid, record: Promise.resolve(record) };
  AsyncStorage.setItem(savedKey(uid), JSON.stringify(record)).catch(() => { /* Only costs the head start */ });
}

const usable = (record, cityId, now) => (
  record && record.cityId === cityId && Array.isArray(record.feed?.lists) && now - record.at < SAVED_MS ? record : null
);

// Everything the ranking learns from is read at once, alongside `followed` and `blocked`.
async function loadSignals(uid, { followed, blocked }) {
  const [followedNow, blockedNow, favourites, people, collections, opens] = await Promise.all([
    settle(followed),
    settle(blocked),
    getDoc(doc(db, 'favourites', uid)).then(snapshot => (snapshot.exists() ? snapshot.data() : {})),
    loadFollowedPeople(uid),
    getDocs(collection(db, 'users', uid, 'savedCollections')).then(snapshot => snapshot.docs.map(saved => saved.data())),
    recentOpens(uid),
  ]);
  return buildSignals({ favourites, followed: followedNow ?? [], people, blocked: blockedNow ?? [], collections, opens });
}

async function request(uid, { followed, blocked, refresh, cityId, now }) {
  const startedIn = epoch;
  try {
    const signals = await loadSignals(uid, { followed, blocked });
    const { data } = await call({ signals, cityId, nonce: refresh ? now.toString(36) : '' });
    if (!Array.isArray(data?.lists)) throw new Error('Unexpected feed');
    const feed = { lists: data.lists, algo: data.algo ?? 'unknown' };
    if (startedIn !== epoch) return feed;
    kept = { uid, cityId, at: now, feed };
    failedAt = 0;
    writeSaved(uid, { cityId, at: now, feed, off: false });
    setEventsAlgo(feed.algo);
    return feed;
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[explore] recommendations unavailable:', error?.code ?? error?.message);
    if (startedIn !== epoch) return null;
    failedAt = now;
    const record = await readSaved(uid);
    if (startedIn === epoch && !record?.off) writeSaved(uid, { ...record, off: true });
    return null;
  }
}

// One request per person and city at a time: the warm-up and the page share it.
function requestOnce(uid, options) {
  const key = `${uid}:${options.cityId}`;
  if (!options.refresh && pending.has(key)) return pending.get(key);
  const asked = request(uid, options).finally(() => { if (pending.get(key) === asked) pending.delete(key); });
  pending.set(key, asked);
  return asked;
}

// Resolves to { lists, algo, stale? }, or null when the recommendations aren't available right now.
//  followed: [{ id, followedAt }] and blocked: [uid], which Explore reads anyway. Each may be the value, a
//            promise of it, or a function returning either (only called if a request is really made)
//  refresh:  true after a pull to refresh: ask again, and let the order change
//  cityId:   the city the person is exploring, which the ranking favours
// `stale: true` marks the ranking saved by an earlier session: it is shown as it is, and the new one that
// was asked for in its place is there on the next visit.
export async function getExploreFeed(uid, { followed = [], blocked = [], refresh = false, cityId } = {}) {
  const now = Date.now();
  const options = { followed, blocked, refresh, cityId, now };
  if (refresh) return requestOnce(uid, options);
  if (isFresh(uid, cityId, now)) return kept.feed;
  const startedIn = epoch;
  const down = now - failedAt < RETRY_AFTER_MS;
  const saved = usable(await readSaved(uid), cityId, now);
  if (startedIn !== epoch) return null;
  if (isFresh(uid, cityId, now)) return kept.feed;
  if (saved) {
    if (!down) requestOnce(uid, options);
    setEventsAlgo(saved.feed.algo);
    return { ...saved.feed, stale: true };
  }
  return down ? null : requestOnce(uid, options);
}

// The ranking if it is already here, for the page's first frame.
export const peekExploreFeed = (uid, cityId) => (isFresh(uid, cityId, Date.now()) ? kept.feed : null);

// True when the last attempt found the recommendations unreachable and there is no ranking to show
// instead, so the page can start on the newest lists without waiting for the function to fail again.
export async function exploreLikelyOff(uid, cityId) {
  const now = Date.now();
  if (isFresh(uid, cityId, now)) return false;
  const record = await readSaved(uid);
  return !!record?.off && !usable(record, cityId, now);
}

// Asks for the ranking before Explore is opened, so it is usually there by the time it is.
export function warmExploreFeed(uid, cityId) {
  if (!uid || !cityId) return Promise.resolve(null);
  return getExploreFeed(uid, {
    followed: () => loadFollowedListPointers(uid).catch(() => []),
    blocked: () => getBlocked(uid).catch(() => []),
    cityId,
  }).catch(() => null);
}

// A change of who is signed in or of city, and tests. `signedOut` is the uid that just left, whose saved
// ranking goes with them.
export function forgetExploreFeed({ signedOut } = {}) {
  kept = null;
  failedAt = 0;
  epoch += 1;
  pending.clear();
  if (signedOut) {
    stored = null;
    AsyncStorage.removeItem(savedKey(signedOut)).catch(() => {});
  }
}
