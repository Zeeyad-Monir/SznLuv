// Lists in Firestore. `lists/{id}` is the owner's working copy; `publicLists/{id}` is what visitors see.
// Every change runs through the pure functions in listsState.js inside a transaction.
import {
  collection, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction,
  setDoc, startAfter, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createList, migrateCollections, revertToPublic, toPublicSnapshot } from './listsState';
import { parseQuery } from './listSearch';

const drafts = () => collection(db, 'lists');
const published = () => collection(db, 'publicLists');
const withId = snapshot => ({ id: snapshot.id, ...snapshot.data() });
const byNewest = field => (a, b) => (b[field] ?? 0) - (a[field] ?? 0);

function requireUser(uid) {
  if (!uid) throw new Error('You must be logged in.');
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

export async function deleteList(listId) {
  const batch = writeBatch(db);
  batch.delete(doc(published(), listId));
  batch.delete(doc(drafts(), listId));
  await batch.commit();
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
    const now = Date.now();
    const snapshot = toPublicSnapshot(draft.data(), {
      ownerUsername: username, now, publishedAt: current.exists() ? current.data().publishedAt : now,
    });
    transaction.set(publicRef, snapshot);
    transaction.set(draftRef, { ...draft.data(), public: true, publishedAt: snapshot.publishedAt, updatedAt: now });
    // The first thing a user makes public is also what makes them findable.
    transaction.set(profileRef, { username }, { merge: true });
    return { id: listId, ...snapshot };
  });
}

// The link stops working and the list leaves profiles; followers' pointers are pruned on their side.
export async function unpublishList(listId) {
  const draftRef = doc(drafts(), listId);
  return runTransaction(db, async transaction => {
    const draft = await transaction.get(draftRef);
    transaction.delete(doc(published(), listId));
    if (draft.exists()) transaction.set(draftRef, { ...draft.data(), public: false, publishedAt: null, updatedAt: Date.now() });
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
