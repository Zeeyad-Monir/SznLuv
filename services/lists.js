// Lists in Firestore. `lists/{id}` is the owner's working copy; `publicLists/{id}` is what visitors see.
// Every change runs through the pure functions in listsState.js inside a transaction.
//
// A spot the owner made becomes visible to others only through a public list: whenever a list's public
// copy changes, each of the owner's spots in it (or that just left it) has its `publicListIds` updated in
// the same transaction, and its public copy (publicSpots/{id}) written while that list set isn't empty
// and deleted once it is. Reviews and photos are readable by others only while that public copy exists.
import {
  collection, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction,
  setDoc, startAfter, where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createList, migrateCollections, revertToPublic, toPublicSnapshot } from './listsState';
import { mySpotIdsIn, toPublicSpot } from './customSpotsState';
import { parseQuery } from './listSearch';

const drafts = () => collection(db, 'lists');
const published = () => collection(db, 'publicLists');
const withId = snapshot => ({ id: snapshot.id, ...snapshot.data() });
const byNewest = field => (a, b) => (b[field] ?? 0) - (a[field] ?? 0);

function requireUser(uid) {
  if (!uid) throw new Error('You must be logged in.');
}

// The owner's own spots among a list's items: the ones whose sharing follows this list.
const mySpotIds = mySpotIdsIn;

// Reads the spots a change of public copy touches. Call before any write in the transaction.
const readSpots = (transaction, ids) => Promise.all(ids.map(id => transaction.get(doc(db, 'spots', id))));

// `listed`: the spot IDs this list will show publicly from now on (none when it stops being public).
// `username` is given when publishing, which also refreshes each public copy; when a list stops being
// public, a spot still shared by another list keeps its public copy as it is.
function shareSpots(transaction, listId, spots, listed, username, now) {
  spots.forEach(spot => {
    if (!spot.exists()) return; // Deleted since it was added: the list shows its name only
    const data = spot.data();
    const lists = new Set(data.publicListIds ?? []);
    if (listed.includes(spot.id)) lists.add(listId); else lists.delete(listId);
    const publicListIds = [...lists].sort();
    if (JSON.stringify(publicListIds) !== JSON.stringify([...(data.publicListIds ?? [])].sort())) {
      transaction.update(spot.ref, { publicListIds });
    }
    const publicRef = doc(db, 'publicSpots', spot.id);
    if (!publicListIds.length) transaction.delete(publicRef);
    else if (username) transaction.set(publicRef, toPublicSpot({ ...data, publicListIds }, username, now));
  });
}

// ---------------------------------------------------------------- The owner's lists

export async function createNewList(uid, details) {
  requireUser(uid);
  const ref = doc(drafts());
  const list = createList({ ownerUid: uid, ...details, now: Date.now() });
  await setDoc(ref, list);
  return { id: ref.id, ...list };
}

// Live, oldest first, so a new list lands at the end of the grid.
export function subscribeMyLists(uid, onLists, onError) {
  return onSnapshot(query(drafts(), where('ownerUid', '==', uid)), snapshot => {
    onLists(snapshot.docs.map(withId).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)));
  }, onError);
}

export function subscribeList(listId, onList, onError) {
  return onSnapshot(doc(drafts(), listId), snapshot => onList(snapshot.exists() ? withId(snapshot) : null), onError);
}

// Recomputes against the latest document on every transaction retry, like services/favourites.js.
export async function mutateList(listId, change) {
  const ref = doc(drafts(), listId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw Object.assign(new Error('This list no longer exists.'), { code: 'list/missing' });
    const current = snapshot.data();
    const next = change(current);
    if (next !== current) transaction.set(ref, { ...next, updatedAt: Date.now() });
    return { id: listId, ...next };
  });
}

// Also stops sharing the owner's spots that were public only through this list.
export async function deleteList(listId) {
  const draftRef = doc(drafts(), listId), publicRef = doc(published(), listId);
  return runTransaction(db, async transaction => {
    const draft = await transaction.get(draftRef);
    const current = await transaction.get(publicRef);
    const uid = draft.exists() ? draft.data().ownerUid : current.data()?.ownerUid;
    const spots = current.exists() ? await readSpots(transaction, mySpotIds(current.data().items, uid)) : [];
    shareSpots(transaction, listId, spots, [], null, Date.now());
    transaction.delete(publicRef);
    transaction.delete(draftRef);
  });
}

// ---------------------------------------------------------------- Publishing

// Makes a private list public, or pushes the draft's changes to an already public one.
export async function publishList(uid, username, listId) {
  requireUser(uid);
  const draftRef = doc(drafts(), listId), publicRef = doc(published(), listId), profileRef = doc(db, 'profiles', uid);
  return runTransaction(db, async transaction => {
    const draft = await transaction.get(draftRef);
    if (!draft.exists()) throw Object.assign(new Error('This list no longer exists.'), { code: 'list/missing' });
    const current = await transaction.get(publicRef);
    // My spots now in the list are shared through it; ones taken out since the last publish no longer are.
    const listed = mySpotIds(draft.data().items, uid);
    const before = current.exists() ? mySpotIds(current.data().items, uid) : [];
    const spots = await readSpots(transaction, [...new Set([...listed, ...before])]);
    const now = Date.now();
    const snapshot = toPublicSnapshot(draft.data(), {
      ownerUsername: username, now, publishedAt: current.exists() ? current.data().publishedAt : now,
    });
    // Republishing keeps the follower count; a list published fresh starts at 0.
    const followerCount = current.exists() ? current.data().followerCount ?? 0 : 0;
    transaction.set(publicRef, { ...snapshot, followerCount });
    transaction.set(draftRef, { ...draft.data(), public: true, publishedAt: snapshot.publishedAt, updatedAt: now });
    // The first thing a user makes public is also what makes them findable.
    transaction.set(profileRef, { username }, { merge: true });
    shareSpots(transaction, listId, spots, listed, username, now);
    return { id: listId, ...snapshot, followerCount };
  });
}

// The link stops working and the list leaves profiles; followers' pointers are pruned on their side.
// Spots of mine shared only through this list stop being shared, with their photos and reviews.
export async function unpublishList(listId) {
  const draftRef = doc(drafts(), listId), publicRef = doc(published(), listId);
  return runTransaction(db, async transaction => {
    const draft = await transaction.get(draftRef);
    const current = await transaction.get(publicRef);
    const uid = draft.exists() ? draft.data().ownerUid : current.data()?.ownerUid;
    const spots = current.exists() ? await readSpots(transaction, mySpotIds(current.data().items, uid)) : [];
    transaction.delete(publicRef);
    if (draft.exists()) transaction.set(draftRef, { ...draft.data(), public: false, publishedAt: null, updatedAt: Date.now() });
    shareSpots(transaction, listId, spots, [], null, Date.now());
  });
}

export async function revertListToPublic(listId) {
  const draftRef = doc(drafts(), listId);
  return runTransaction(db, async transaction => {
    const draft = await transaction.get(draftRef);
    const current = await transaction.get(doc(published(), listId));
    if (!draft.exists() || !current.exists()) return;
    transaction.set(draftRef, { ...revertToPublic(draft.data(), current.data()), updatedAt: Date.now() });
  });
}

// ---------------------------------------------------------------- What visitors read

// null means "not available": private, deleted, or never existed. The caller shows the same neutral page for all three.
export async function getPublicList(listId) {
  const snapshot = await getDoc(doc(published(), listId));
  return snapshot.exists() ? withId(snapshot) : null;
}

export async function getPublicListsBy(ownerUid) {
  const snapshot = await getDocs(query(published(), where('ownerUid', '==', ownerUid)));
  return snapshot.docs.map(withId).sort(byNewest('publishedAt'));
}

// One page of the newest public lists. Pass the last list of the previous page to continue.
export async function getNewestPublicLists({ count = 20, after } = {}) {
  const constraints = [orderBy('publishedAt', 'desc')];
  if (after) constraints.push(startAfter(after.publishedAt));
  const snapshot = await getDocs(query(published(), ...constraints, limit(count)));
  return snapshot.docs.map(withId);
}

// Live candidates for "From the community": the most followed lists plus the newest ones, so lists
// published before counts existed (no followerCount field, which orderBy skips) still have a chance.
// services/listSearch.js mostFollowed picks and orders the final few.
export function subscribeCommunityCandidates(count, onLists, onError) {
  const results = { followed: [], newest: [] };
  const emit = () => {
    const byId = new Map();
    [...results.followed, ...results.newest].forEach(list => byId.set(list.id, list));
    onLists([...byId.values()]);
  };
  const listen = (key, ordering) => onSnapshot(query(published(), orderBy(ordering, 'desc'), limit(count)), snapshot => {
    results[key] = snapshot.docs.map(withId);
    emit();
  }, onError);
  const stops = [listen('followed', 'followerCount'), listen('newest', 'publishedAt')];
  return () => stops.forEach(stop => stop());
}

// Candidates for a search; services/listSearch.js rankLists does the real matching.
export async function searchPublicLists(text) {
  const parsed = parseQuery(text);
  if (!parsed) return [];
  const terms = [...new Set([parsed.term, parsed.prefixTerm])];
  const snapshot = await getDocs(query(published(), where('searchTerms', 'array-contains-any', terms), limit(30)));
  return snapshot.docs.map(withId);
}

// ---------------------------------------------------------------- Collections -> lists

// One atomic step: every old collection becomes a private list and the old field is removed.
// Safe to call on every library load; it does nothing once `listsMigratedAt` is set.
export async function migrateLegacyCollections(uid) {
  requireUser(uid);
  const favouritesRef = doc(db, 'favourites', uid);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(favouritesRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const result = migrateCollections(data, { uid, now: Date.now() });
    if (!result) return 0;
    result.lists.forEach(({ id, data: list }) => transaction.set(doc(drafts(), id), list));
    if (snapshot.exists()) transaction.update(favouritesRef, { collections: deleteField(), listsMigratedAt: result.favourites.listsMigratedAt });
    else transaction.set(favouritesRef, result.favourites);
    return result.lists.length;
  });
}
