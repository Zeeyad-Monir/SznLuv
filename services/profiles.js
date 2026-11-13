// Public profiles (`profiles/{uid}`) and the private Top 4 draft kept on `users/{uid}`.
// A profile document only exists once its owner has made something public or edited their profile.
import { collection, deleteField, doc, getDoc, getDocs, limit, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { publicTop4 } from './top4State';
import { usernamePrefix } from './listSearch';

export const AVATAR_COLOURS = ['#D24B3A', '#FFC1E3', '#A7C8FF', '#A8E6CF', '#FFF9C4', '#FF8B94', '#D3BFFF', '#FF8657'];
export const DEFAULT_AVATAR_COLOUR = AVATAR_COLOURS[0];
export const BIO_LIMIT = 80;
export const avatarPhotoPath = (uid, id) => uid && /^[a-zA-Z0-9]{20}$/.test(id ?? '')
  ? `profilePhotos/${uid}/${id}.jpg`
  : null;

const profiles = () => collection(db, 'profiles');
const withUid = snapshot => ({ uid: snapshot.id, ...snapshot.data() });

export async function getProfile(uid) {
  const snapshot = await getDoc(doc(profiles(), uid));
  return snapshot.exists() ? withUid(snapshot) : null;
}

// The same lookup, read once per app session per person: for showing many people's avatars at once (reviews).
// Saving a profile forgets the cached copy so the owner's new photo or colour shows straight away.
const profileCache = new Map();
export function getProfileCached(uid) {
  if (!profileCache.has(uid)) {
    profileCache.set(uid, getProfile(uid).catch(error => {
      profileCache.delete(uid);
      throw error;
    }));
  }
  return profileCache.get(uid);
}
export const forgetProfile = uid => profileCache.delete(uid);

export async function findProfileByUsername(username) {
  const snapshot = await getDocs(query(profiles(), where('username', '==', username.toLowerCase()), limit(1)));
  return snapshot.empty ? null : withUid(snapshot.docs[0]);
}

// Usernames that start with what was typed. Usernames are stored lowercase, so a range query is enough.
export async function searchProfiles(text, count = 10) {
  const prefix = usernamePrefix(text);
  if (!prefix) return [];
  const snapshot = await getDocs(query(profiles(),
    where('username', '>=', prefix), where('username', '<=', `${prefix}`), limit(count)));
  return snapshot.docs.map(withUid);
}

export async function saveProfileDetails(uid, username, { bio = '', avatarColor = DEFAULT_AVATAR_COLOUR, avatarPhotoId }) {
  const clean = bio.trim();
  if (clean.length > BIO_LIMIT) throw new Error(`Bios can be up to ${BIO_LIMIT} characters.`);
  const profileRef = doc(profiles(), uid);
  const details = { username, bio: clean, avatarColor };
  try {
    if (avatarPhotoId === undefined) return await setDoc(profileRef, details, { merge: true });
    return await runTransaction(db, async transaction => {
      const before = await transaction.get(profileRef);
      transaction.set(profileRef, { ...details, avatarPhotoId: avatarPhotoId ?? deleteField() }, { merge: true });
      return before.data()?.avatarPhotoId;
    });
  } finally {
    forgetProfile(uid);
  }
}

// The owner's own picks, public or not.
export async function getMyTop4(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data().top4 ?? {} : {};
}

// Applies a change from top4State.js to the private draft and mirrors only the public part to the profile.
export async function mutateTop4(uid, username, change) {
  const userRef = doc(db, 'users', uid), profileRef = doc(profiles(), uid);
  return runTransaction(db, async transaction => {
    const user = await transaction.get(userRef);
    const profile = await transaction.get(profileRef);
    const next = change(user.exists() ? user.data().top4 ?? {} : {});
    const shown = publicTop4(next);
    transaction.set(userRef, { top4: next }, { merge: true });
    // Nothing public and no profile yet: stay undiscoverable.
    if (profile.exists() || Object.keys(shown).length) {
      transaction.set(profileRef, { ...(profile.exists() ? profile.data() : {}), username, top4: shown });
    }
    return next;
  });
}
