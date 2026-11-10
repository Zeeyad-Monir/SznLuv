// Reporting and blocking. Reports go to a write-only collection read from the Firebase console.
// Blocking is private to the blocker: their client hides the other person's lists and profile.
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const REPORT_REASONS = ['Spam', 'Inappropriate', 'Private information', 'Other'];

export async function report(uid, { targetType, targetId, ownerUid, reason }) {
  if (!REPORT_REASONS.includes(reason)) throw new Error('Choose a reason.');
  await addDoc(collection(db, 'reports'), { reporterUid: uid, targetType, targetId, ownerUid, reason, createdAt: Date.now() });
}

export async function getBlocked(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  const blocked = snapshot.exists() ? snapshot.data().blocked : null;
  return Array.isArray(blocked) ? blocked : [];
}

// Also stops following them and any of their lists, so nothing of theirs is left in the library.
export async function blockUser(uid, otherUid) {
  await setDoc(doc(db, 'users', uid), { blocked: arrayUnion(otherUid) }, { merge: true });
  const theirLists = await getDocs(query(collection(db, 'users', uid, 'followedLists'), where('ownerUid', '==', otherUid)));
  await Promise.all([
    deleteDoc(doc(db, 'users', uid, 'followedPeople', otherUid)),
    ...theirLists.docs.map(pointer => deleteDoc(pointer.ref)),
  ]);
}

export const unblockUser = (uid, otherUid) => setDoc(doc(db, 'users', uid), { blocked: arrayRemove(otherUid) }, { merge: true });
