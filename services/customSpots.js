// Spots people make, in Firestore. `spots/{id}` is the owner's record; nobody else can read it.
// Every change runs through the pure functions in customSpotsState.js inside a transaction. Transactions
// read everything before writing anything, and never query: lists that hold a spot are found first.
import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, runTransaction, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { spotKey } from './catalogue';
import { buildSearchTerms } from './listSearch';
import { addSpot, publicFields } from './listsState';
import {
  migrateLegacy, mySpotIdsIn, removeRefFromList, removeRefFromTop4, replaceRefInList, replaceRefInTop4, savedEntry, savedKey,
  spotIdFor, thinChanged, toPublicSpot, toRef, top4Has,
} from './customSpotsState';
import { cleanOrphans } from './spotPhotos';

const spotsCollection = () => collection(db, 'spots');
const withId = snapshot => ({ id: snapshot.id, ...snapshot.data() });

function requireUser(uid) {
  if (!uid) throw new Error('You must be logged in.');
}
const spotError = (code, message) => Object.assign(new Error(message), { code });

// A fresh ID that starts with the owner's, so the rules can tell whose spot it is without a read.
export const newSpotId = uid => spotIdFor(uid, doc(spotsCollection()).id);

export function subscribeMySpots(uid, onSpots, onError) {
  return onSnapshot(query(spotsCollection(), where('ownerUid', '==', uid)), snapshot => {
    onSpots(snapshot.docs.map(withId).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || String(a.name).localeCompare(String(b.name))));
  }, onError);
}

// Ids of my lists that hold this spot. A query, so it runs before the transaction that changes them.
async function myListsHolding(uid, id) {
  const key = `x:${id}`;
  const snapshot = await getDocs(query(collection(db, 'lists'), where('ownerUid', '==', uid)));
  return snapshot.docs.filter(entry => (entry.data().items ?? []).some(item => spotKey(item.spot) === key)).map(entry => entry.id);
}

// Makes a spot and, in the same step, puts it in a list (`listId`) and/or in Saved (`save`).
// Throws list/full (from addSpot) without saving anything when the list can't take it.
export async function createSpot(uid, fields, { id = newSpotId(uid), listId, save = true, photos = [] } = {}) {
  requireUser(uid);
  const spotRef = doc(spotsCollection(), id);
  const listRef = listId ? doc(db, 'lists', listId) : null;
  const favouritesRef = doc(db, 'favourites', uid);
  return runTransaction(db, async transaction => {
    const list = listRef ? await transaction.get(listRef) : null;
    const favourites = save ? await transaction.get(favouritesRef) : null;
    if (listRef && !list.exists()) throw spotError('list/missing', 'This list no longer exists.');
    const now = Date.now();
    const spot = { ownerUid: uid, ...fields, photos, publicListIds: [], createdAt: now, updatedAt: now };
    const ref = toRef(id, spot);
    const nextList = listRef ? addSpot(list.data(), ref) : null;
    transaction.set(spotRef, spot);
    if (nextList) transaction.set(listRef, { ...nextList, updatedAt: now });
    if (save) transaction.set(favouritesRef, { ...(favourites.exists() ? favourites.data() : {}), [savedKey(id)]: savedEntry(ref, now) });
    return { id, spot, ref };
  });
}

// Puts one of my existing spots into a list and/or Saved, as createSpot would.
export async function addExistingSpot(uid, ref, { listId, save = true }) {
  requireUser(uid);
  const listRef = listId ? doc(db, 'lists', listId) : null;
  const favouritesRef = doc(db, 'favourites', uid);
  return runTransaction(db, async transaction => {
    const list = listRef ? await transaction.get(listRef) : null;
    const favourites = save ? await transaction.get(favouritesRef) : null;
    if (listRef && !list.exists()) throw spotError('list/missing', 'This list no longer exists.');
    const now = Date.now();
    if (listRef) {
      const next = addSpot(list.data(), ref);
      if (next !== list.data()) transaction.set(listRef, { ...next, updatedAt: now });
    }
    const current = favourites?.exists() ? favourites.data() : {};
    if (save && !current[savedKey(ref.id)]?.isFavourite) transaction.set(favouritesRef, { ...current, [savedKey(ref.id)]: savedEntry(ref, now) });
  });
}

// Saves an edit. `fields` is the whole form (customSpotsState.spotFields), so a cleared field goes away.
// When the name or place changes, every reference I hold is refreshed in the same step: my lists, Saved
// and my Top 4. Public lists and the public profile follow, one at a time, so one that can't be updated
// (it shows "Changes not public yet" until it is next published) never blocks the rest.
export async function updateSpot(uid, id, fields, { photos } = {}) {
  requireUser(uid);
  const holding = await myListsHolding(uid, id);
  const spotRef = doc(spotsCollection(), id);
  const userRef = doc(db, 'users', uid);
  const favouritesRef = doc(db, 'favourites', uid);
  const result = await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(spotRef);
    if (!snapshot.exists() || snapshot.data().ownerUid !== uid) throw spotError('spot/missing', 'This spot no longer exists.');
    const before = snapshot.data();
    const now = Date.now();
    const { ownerUid, publicListIds = [], createdAt, legacyId } = before;
    const after = {
      ownerUid, ...fields, photos: photos ?? before.photos ?? [], publicListIds, createdAt: createdAt ?? now,
      ...(legacyId ? { legacyId } : {}), updatedAt: now,
    };
    const thin = thinChanged(before, after);
    const lists = thin ? await Promise.all(holding.map(listId => transaction.get(doc(db, 'lists', listId)))) : [];
    const favourites = thin ? await transaction.get(favouritesRef) : null;
    const user = await transaction.get(userRef);
    const ref = toRef(id, after);

    transaction.set(spotRef, after);
    if (publicListIds.length) transaction.set(doc(db, 'publicSpots', id), toPublicSpot(after, user.data()?.username, now));
    if (thin) {
      lists.filter(list => list.exists() && list.data().ownerUid === uid)
        .forEach(list => transaction.set(list.ref, { ...replaceRefInList(list.data(), ref), updatedAt: now }));
      const saved = favourites.exists() ? favourites.data() : {};
      if (saved[savedKey(id)]) transaction.set(favouritesRef, { ...saved, [savedKey(id)]: { ...saved[savedKey(id)], name: after.name } });
      const top4 = user.data()?.top4;
      if (top4Has(top4, spotKey(ref))) transaction.update(userRef, { top4: replaceRefInTop4(top4, ref) });
    }
    return { before, after, ref, thin };
  });
  if (result.thin) await refreshPublicReferences(uid, result.ref, result.after.publicListIds);
  return result;
}

// The public copies of my lists, and my public Top 4, that show this spot's name and place.
async function refreshPublicReferences(uid, ref, publicListIds) {
  const key = spotKey(ref);
  for (const listId of publicListIds) {
    try {
      await runTransaction(db, async transaction => {
        const publicRef = doc(db, 'publicLists', listId);
        const current = await transaction.get(publicRef);
        if (!current.exists() || current.data().ownerUid !== uid) return;
        const data = current.data();
        if (!data.items.some(item => spotKey(item.spot) === key)) return;
        const next = replaceRefInList(data, ref);
        transaction.update(publicRef, {
          items: next.items,
          searchTerms: buildSearchTerms({ ...publicFields(next), ownerUsername: data.ownerUsername }),
          updatedAt: Date.now(),
        });
      });
    } catch (error) {
      console.error('Public list not refreshed:', { code: error?.code });
    }
  }
  try {
    const profileRef = doc(db, 'profiles', uid);
    const profile = await getDoc(profileRef);
    if (profile.exists() && top4Has(profile.data().top4, key)) await updateDoc(profileRef, { top4: replaceRefInTop4(profile.data().top4, ref) });
  } catch (error) {
    console.error('Public Top 4 not refreshed:', { code: error?.code });
  }
}

// ---------------------------------------------------------------- Old references -> records

// Brings own-spot references from before spots had records over to records of their own. `lists` is
// what the caller last read; the transaction reads them again. Safe to run any number of times: IDs are
// derived from the old ones, so a second run finds nothing left to do. Resolves to how many spots it made.
export async function migrateLegacySpots(uid, lists) {
  requireUser(uid);
  const userRef = doc(db, 'users', uid);
  const favouritesRef = doc(db, 'favourites', uid);
  const user = await getDoc(userRef);
  const preview = migrateLegacy({ uid, lists: lists.map(list => ({ id: list.id, data: list })), top4: user.data()?.top4, now: 0 });
  if (!preview) return 0;

  const outcome = await runTransaction(db, async transaction => {
    const listSnapshots = await Promise.all(preview.lists.map(({ id }) => transaction.get(doc(db, 'lists', id))));
    const userNow = await transaction.get(userRef);
    const favourites = await transaction.get(favouritesRef);
    const now = Date.now();
    const plan = migrateLegacy({
      uid,
      lists: listSnapshots.filter(list => list.exists() && list.data().ownerUid === uid).map(list => ({ id: list.id, data: list.data() })),
      top4: userNow.data()?.top4,
      now,
    });
    if (!plan) return null;
    const spotSnapshots = await Promise.all(plan.spots.map(({ id }) => transaction.get(doc(spotsCollection(), id))));
    const created = plan.spots.filter((_, index) => !spotSnapshots[index].exists());

    created.forEach(({ id, data }) => transaction.set(doc(spotsCollection(), id), data));
    plan.lists.forEach(({ id, data }) => transaction.set(doc(db, 'lists', id), { ...data, updatedAt: now }));
    if (plan.top4) transaction.update(userRef, { top4: plan.top4 });
    // A spot someone made is theirs to keep in Saved; one they later removed from Saved isn't brought back.
    if (created.length) {
      const saved = favourites.exists() ? favourites.data() : {};
      const added = Object.fromEntries(created.filter(({ id }) => !saved[savedKey(id)])
        .map(({ id, data }) => [savedKey(id), savedEntry(toRef(id, data), now)]));
      transaction.set(favouritesRef, { ...saved, ...added });
    }
    return { plan, created: created.length, publicLists: plan.lists.filter(({ data }) => data.public).map(({ id }) => id) };
  });
  if (!outcome) return 0;

  // What visitors see: the public copies and the public Top 4, each on its own so one failure can't block the rest.
  for (const listId of outcome.publicLists) {
    try {
      await runTransaction(db, async transaction => {
        const publicRef = doc(db, 'publicLists', listId);
        const current = await transaction.get(publicRef);
        if (!current.exists() || current.data().ownerUid !== uid) return;
        const items = current.data().items.map(item => ({ ...item, spot: outcome.plan.swap(item.spot) }));
        if (JSON.stringify(items) !== JSON.stringify(current.data().items)) transaction.update(publicRef, { items });
      });
    } catch (error) {
      console.error('Public list not migrated:', { code: error?.code });
    }
  }
  try {
    const profileRef = doc(db, 'profiles', uid);
    const profile = await getDoc(profileRef);
    const top4 = profile.exists() ? profile.data().top4 : null;
    if (top4) {
      const swapped = Object.fromEntries(Object.entries(top4).map(([cityId, picks]) => [cityId, (picks ?? []).map(outcome.plan.swap)]));
      if (JSON.stringify(swapped) !== JSON.stringify(top4)) await updateDoc(profileRef, { top4: swapped });
    }
  } catch (error) {
    console.error('Public Top 4 not migrated:', { code: error?.code });
  }
  return outcome.created;
}

// ---------------------------------------------------------------- Someone else's spot

// What a visitor can read of a spot: its public copy, or null when it isn't shared (or is gone).
// Kept for the session so lists and Saved don't read the same spot twice; a spot page asks afresh.
const publicCopies = new Map();
export async function getPublicSpot(id, { fresh = false } = {}) {
  if (!fresh && publicCopies.has(id)) return publicCopies.get(id);
  const snapshot = await getDoc(doc(db, 'publicSpots', id));
  const value = snapshot.exists() ? { id, ...snapshot.data() } : null;
  publicCopies.set(id, value);
  return value;
}
export const cachedPublicSpot = id => publicCopies.get(id);

// ---------------------------------------------------------------- Keeping shared copies right

// Puts each of my spots' sharing back in line with my public lists as they are now: a spot in a public
// list gets its public copy, one in none loses it. Covers lists made public or private by an older
// version of the app, and spots brought over from before they had records. Resolves to how many it fixed.
// Reads my lists and spots afresh, so it can run straight after old spots are brought over.
export async function reconcilePublicSpots(uid, username) {
  if (!uid || !username) return 0;
  let copies, spots;
  try {
    const [lists, mine] = await Promise.all([
      getDocs(query(collection(db, 'lists'), where('ownerUid', '==', uid))),
      getDocs(query(spotsCollection(), where('ownerUid', '==', uid))),
    ]);
    spots = mine.docs.map(withId);
    const publicOnes = lists.docs.filter(list => list.data().public);
    copies = await Promise.all(publicOnes.map(list => getDoc(doc(db, 'publicLists', list.id))));
  } catch (error) {
    console.error('Shared spots not checked:', { code: error?.code });
    return 0; // Without every list, a spot could look unshared when it isn't: change nothing
  }
  const wanted = new Map();
  copies.filter(copy => copy.exists() && copy.data().ownerUid === uid).forEach(copy => {
    mySpotIdsIn(copy.data().items, uid).forEach(id => wanted.set(id, [...(wanted.get(id) ?? []), copy.id]));
  });
  const mirrors = await getDocs(query(collection(db, 'publicSpots'), where('ownerUid', '==', uid)));
  const mirrored = new Set(mirrors.docs.map(entry => entry.id));
  let fixed = 0;
  for (const spot of spots) {
    const want = [...(wanted.get(spot.id) ?? [])].sort();
    const have = [...(spot.publicListIds ?? [])].sort();
    if (JSON.stringify(want) === JSON.stringify(have) && want.length > 0 === mirrored.has(spot.id)) continue;
    await runTransaction(db, async transaction => {
      const spotRef = doc(spotsCollection(), spot.id);
      const current = await transaction.get(spotRef);
      if (!current.exists()) return;
      transaction.update(spotRef, { publicListIds: want });
      const publicRef = doc(db, 'publicSpots', spot.id);
      if (want.length) transaction.set(publicRef, toPublicSpot({ ...current.data(), publicListIds: want }, username, Date.now()));
      else transaction.delete(publicRef);
    });
    fixed += 1;
  }
  const known = new Set(spots.map(spot => spot.id));
  for (const id of mirrored) {
    if (known.has(id)) continue; // A public copy whose spot was deleted
    await deleteDoc(doc(db, 'publicSpots', id));
    fixed += 1;
  }
  return fixed;
}

// ---------------------------------------------------------------- Deleting

// What deleting would change, for the confirmation: my lists that hold it, and which public ones would
// be left empty (and so made private).
export function deletionEffects(id, lists) {
  const key = `x:${id}`;
  const holding = lists.filter(list => list.items.some(item => spotKey(item.spot) === key));
  return { holding, emptied: holding.filter(list => list.public && list.items.length === 1) };
}

// The deliberate way to make a spot go away: from every list of mine (a public list left empty becomes
// private), from Saved and Top 4, its public copy, its reviews and its photos. Lists other people saved
// it to keep its name, with nothing else to show.
export async function deleteSpot(uid, id) {
  requireUser(uid);
  const key = `x:${id}`;
  const spotRef = doc(spotsCollection(), id);
  const existing = await getDoc(spotRef);
  if (!existing.exists()) return;
  const { publicListIds = [] } = existing.data();

  try {
    const reviews = await getDocs(collection(db, 'publicSpots', id, 'reviews'));
    await Promise.all(reviews.docs.map(review => deleteDoc(review.ref)));
  } catch (error) {
    console.error('Reviews not removed:', { code: error?.code });
  }

  for (const listId of publicListIds) {
    try {
      await runTransaction(db, async transaction => {
        const publicRef = doc(db, 'publicLists', listId);
        const draftRef = doc(db, 'lists', listId);
        const current = await transaction.get(publicRef);
        const draft = await transaction.get(draftRef);
        if (!current.exists() || current.data().ownerUid !== uid) return;
        const next = removeRefFromList(current.data(), key);
        if (next.items.length === current.data().items.length) return;
        const now = Date.now();
        if (!next.items.length) {
          transaction.delete(publicRef);
          if (draft.exists()) transaction.set(draftRef, { ...removeRefFromList(draft.data(), key), public: false, publishedAt: null, updatedAt: now });
          return;
        }
        transaction.update(publicRef, {
          items: next.items,
          spotCount: next.items.length,
          searchTerms: buildSearchTerms({ ...publicFields(next), ownerUsername: current.data().ownerUsername }),
          updatedAt: now,
        });
      });
    } catch (error) {
      console.error('Public list not updated:', { code: error?.code });
    }
  }

  const holding = await myListsHolding(uid, id);
  const userRef = doc(db, 'users', uid);
  const favouritesRef = doc(db, 'favourites', uid);
  await runTransaction(db, async transaction => {
    const lists = await Promise.all(holding.map(listId => transaction.get(doc(db, 'lists', listId))));
    const favourites = await transaction.get(favouritesRef);
    const user = await transaction.get(userRef);
    const now = Date.now();
    lists.filter(list => list.exists() && list.data().ownerUid === uid)
      .forEach(list => transaction.set(list.ref, { ...removeRefFromList(list.data(), key), updatedAt: now }));
    const saved = favourites.exists() ? favourites.data() : {};
    if (saved[savedKey(id)]) {
      const { [savedKey(id)]: _removed, ...rest } = saved;
      transaction.set(favouritesRef, rest);
    }
    const top4 = user.data()?.top4;
    if (top4Has(top4, key)) transaction.update(userRef, { top4: removeRefFromTop4(top4, key) });
    transaction.delete(spotRef);
  });

  try {
    const profileRef = doc(db, 'profiles', uid);
    const profile = await getDoc(profileRef);
    if (profile.exists() && top4Has(profile.data().top4, key)) await updateDoc(profileRef, { top4: removeRefFromTop4(profile.data().top4, key) });
  } catch (error) {
    console.error('Public Top 4 not updated:', { code: error?.code });
  }
  await deleteDoc(doc(db, 'publicSpots', id)).catch(error => console.error('Public copy not removed:', { code: error?.code }));
  publicCopies.delete(id);
  await cleanOrphans(uid, id, []);
}
