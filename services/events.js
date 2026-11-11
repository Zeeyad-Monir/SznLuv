// Where the app's metrics go (services/metrics.js calls this for every event): what was seen, opened and
// followed on Explore, kept in memory and written as ONE document per stretch of use, because every write
// is billed. firestore.rules lets a user add these and nobody read them; the daily function counts and
// deletes them (functions/handlers.js). Losing a batch is fine, so nothing here retries or reports errors.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { EVENTS } from './metrics';
import { rememberOpen } from './exploreState';

const MAX_ITEMS = 60; // firestore.rules refuses more in one document
const session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const opensKey = uid => `explore.opens.${uid}`;

let uid = null;
let algo = 'none';
let buffer = [];
const seen = new Set(); // A card scrolled past ten times in one session was still seen once

const KINDS = {
  [EVENTS.impression]: 'imp',
  [EVENTS.listOpened]: 'open',
  [EVENTS.spotOpened]: 'spot',
  [EVENTS.listFollowed]: 'follow',
};

export function setEventsUser(nextUid) {
  if (nextUid === uid) return;
  buffer = [];
  seen.clear();
  uid = nextUid ?? null;
}

// Which version of the ranking produced the feed these events are about.
export const setEventsAlgo = version => { algo = String(version ?? 'none').slice(0, 20); };

// The lists this person opened lately, for the next feed request. Kept on the device only.
export async function recentOpens(forUid) {
  try { return JSON.parse(await AsyncStorage.getItem(opensKey(forUid))) ?? []; }
  catch { return []; }
}

async function noteOpen(listId) {
  const forUid = uid;
  try { await AsyncStorage.setItem(opensKey(forUid), JSON.stringify(rememberOpen(await recentOpens(forUid), listId))); }
  catch { /* A full or unavailable store only costs a hint */ }
}

// The sink for services/metrics.js. Events the recommendations don't use are ignored.
export function recordEvent(event, { listId, position, reason, source } = {}) {
  const kind = KINDS[event];
  if (!kind || !uid || typeof listId !== 'string') return;
  if (kind === 'imp') {
    if (seen.has(listId)) return;
    seen.add(listId);
  }
  if (kind === 'open') noteOpen(listId);
  const item = { t: kind, l: listId, ms: Date.now() };
  if (Number.isInteger(position)) item.p = position;
  if (reason) item.r = String(reason).slice(0, 12);
  if (source) item.s = String(source).slice(0, 12);
  buffer.push(item);
  if (buffer.length >= MAX_ITEMS) flushEvents();
}

// Called when Explore loses focus and when the app goes to the background.
export async function flushEvents() {
  if (!uid || !buffer.length) return;
  const items = buffer.splice(0, MAX_ITEMS);
  try { await addDoc(collection(db, 'events'), { uid, at: serverTimestamp(), session, algo, items }); }
  catch { /* Offline, or the rules aren't deployed yet: the batch is dropped */ }
}
