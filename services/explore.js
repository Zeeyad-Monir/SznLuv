// The personalised Explore feed. The ranking runs in a Cloud Function (functions/, docs/EXPLORE_RECS.md);
// this sends it what the app already knows about its own user and keeps the answer for a while, so coming
// back to Explore costs nothing. If the function can't be reached the caller falls back to the newest lists.
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { recentOpens, setEventsAlgo } from './events';
import { buildSignals } from './exploreState';
import { loadFollowedPeople } from './follows';

const KEEP_MS = 15 * 60 * 1000;
const RETRY_AFTER_MS = 5 * 60 * 1000; // After a failure, don't make every visit wait on a function that is down
const TIMEOUT_MS = 6000;

let kept = null; // { uid, at, feed }
let failedAt = 0;

const call = httpsCallable(functions, 'getExploreFeed', { timeout: TIMEOUT_MS });

async function loadSignals(uid, { followed, blocked }) {
  const [favourites, people, collections, opens] = await Promise.all([
    getDoc(doc(db, 'favourites', uid)).then(snapshot => (snapshot.exists() ? snapshot.data() : {})),
    loadFollowedPeople(uid),
    getDocs(collection(db, 'users', uid, 'savedCollections')).then(snapshot => snapshot.docs.map(saved => saved.data())),
    recentOpens(uid),
  ]);
  return buildSignals({ favourites, followed, people, blocked, collections, opens });
}

// Resolves to { lists, algo }, or null when the recommendations aren't available right now.
//  followed: [{ id, followedAt }] and blocked: [uid], which Explore has loaded anyway
//  refresh:  true after a pull to refresh: ask again, and let the order change
//  cityId:   the city the person is exploring, which the ranking favours
export async function getExploreFeed(uid, { followed = [], blocked = [], refresh = false, cityId } = {}) {
  const now = Date.now();
  if (!refresh && kept?.uid === uid && kept.cityId === cityId && now - kept.at < KEEP_MS) return kept.feed;
  if (!refresh && now - failedAt < RETRY_AFTER_MS) return null;
  try {
    const signals = await loadSignals(uid, { followed, blocked });
    const { data } = await call({ signals, cityId, nonce: refresh ? now.toString(36) : '' });
    if (!Array.isArray(data?.lists)) throw new Error('Unexpected feed');
    const feed = { lists: data.lists, algo: data.algo ?? 'unknown' };
    kept = { uid, cityId, at: now, feed };
    failedAt = 0;
    setEventsAlgo(feed.algo);
    return feed;
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[explore] recommendations unavailable:', error?.code ?? error?.message);
    failedAt = now;
    return null;
  }
}

// Sign-out, a change of city, and tests.
export function forgetExploreFeed() {
  kept = null;
  failedAt = 0;
}
