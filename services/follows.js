// Following a list or a person. Each follow is a private pointer under the follower's own user document,
// so nobody can see who follows what, and the owner of a list never writes to a follower's data.
import { collection, deleteDoc, doc, getDoc, getDocs, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const followedLists = uid => collection(db, 'users', uid, 'followedLists');
const followedPeople = uid => collection(db, 'users', uid, 'followedPeople');
const byNewest = (a, b) => (b.followedAt ?? 0) - (a.followedAt ?? 0);

// ---------------------------------------------------------------- Lists

// Each follow moves the list's public followerCount by one in the same transaction, which is what
// ranks "From the community". firestore.rules only accepts the pointer and the count together.
const publicListRef = listId => doc(db, 'publicLists', listId);
const followerCount = list => Math.max(0, Number(list?.followerCount) || 0);

export async function followList(uid, list) {
  const pointerRef = doc(followedLists(uid), list.id), listRef = publicListRef(list.id);
  // A pointer left from before the list was withdrawn and published again can't be counted; clear it first.
  const old = await getDoc(pointerRef);
  if (old.exists() && old.data().publishedAt !== list.publishedAt) await deleteDoc(pointerRef);
  return runTransaction(db, async transaction => {
    const pointerSnapshot = await transaction.get(pointerRef);
    const listSnapshot = await transaction.get(listRef);
    if (!listSnapshot.exists()) throw Object.assign(new Error('This list is no longer shared.'), { code: 'list/missing' });
    if (pointerSnapshot.exists()) return { id: list.id, ...pointerSnapshot.data() }; // Already following
    const current = listSnapshot.data(), now = Date.now();
    const pointer = {
      ownerUid: current.ownerUid, ownerUsername: current.ownerUsername, title: current.title, cover: current.cover,
      publishedAt: current.publishedAt, followedAt: now, lastOpenedAt: now,
    };
    transaction.set(pointerRef, pointer);
    transaction.update(listRef, { followerCount: followerCount(current) + 1 });
    return { id: list.id, ...pointer };
  });
}

export async function unfollowList(uid, listId) {
  const pointerRef = doc(followedLists(uid), listId), listRef = publicListRef(listId);
  await runTransaction(db, async transaction => {
    const pointerSnapshot = await transaction.get(pointerRef);
    const listSnapshot = await transaction.get(listRef);
    if (!pointerSnapshot.exists()) return;
    const current = listSnapshot.exists() ? listSnapshot.data() : null;
    // Only a follow of the list as it is now was counted. Follows from before counts existed may find it at 0.
    if (current && current.publishedAt === pointerSnapshot.data().publishedAt && followerCount(current) > 0) {
      transaction.update(listRef, { followerCount: followerCount(current) - 1 });
    }
    transaction.delete(pointerRef);
  });
}

export async function isFollowingList(uid, listId) {
  return (await getDoc(doc(followedLists(uid), listId))).exists();
}

// Clears the "Updated" mark. A missing pointer (not following) is not an error.
export async function markListOpened(uid, listId) {
  try { await updateDoc(doc(followedLists(uid), listId), { lastOpenedAt: Date.now() }); }
  catch (error) { if (error.code !== 'not-found') throw error; }
}

// A pointer is stale when its list is gone, or was withdrawn and published again since the follow.
export const isStalePointer = (pointer, list) => !list || list.publishedAt !== pointer.publishedAt;
export const hasUpdate = (pointer, list) => (list.updatedAt ?? 0) > (pointer.lastOpenedAt ?? 0);

// Followed lists that are still shared, newest follow first, plus the titles that were just dropped
// because their list was made private or deleted. A read that fails keeps the pointer: only a
// definite "not there" removes a follow.
export async function loadFollowedLists(uid, readPublicList) {
  const pointers = (await getDocs(followedLists(uid))).docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
  const live = [], removed = [];
  await Promise.all(pointers.map(async pointer => {
    let list;
    try { list = await readPublicList(pointer.id); }
    catch { live.push({ pointer, list: null, updated: false }); return; }
    if (isStalePointer(pointer, list)) {
      removed.push(pointer.title);
      await deleteDoc(doc(followedLists(uid), pointer.id)).catch(() => {});
      return;
    }
    live.push({ pointer, list, updated: hasUpdate(pointer, list) });
  }));
  return { lists: live.sort((a, b) => byNewest(a.pointer, b.pointer)), removed };
}

// ---------------------------------------------------------------- People

export async function followPerson(uid, person) {
  if (person.uid === uid) throw new Error('You can’t follow yourself.');
  const pointer = { username: person.username, avatarColor: person.avatarColor ?? null, followedAt: Date.now() };
  await setDoc(doc(followedPeople(uid), person.uid), pointer);
  return { uid: person.uid, ...pointer };
}

export const unfollowPerson = (uid, otherUid) => deleteDoc(doc(followedPeople(uid), otherUid));

export async function isFollowingPerson(uid, otherUid) {
  return (await getDoc(doc(followedPeople(uid), otherUid))).exists();
}

export async function loadFollowedPeople(uid) {
  const snapshot = await getDocs(followedPeople(uid));
  return snapshot.docs.map(person => ({ uid: person.id, ...person.data() })).sort(byNewest);
}
