import { deleteUser } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, register, logout } from '../firebaseConfig';
import { registerWithProfile } from './registrationFlow';

export function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

export function validUsername(value) {
  return value.length >= 3 && value.length <= 40 && /^[a-z0-9_.-]+$/.test(value);
}

export async function saveProfile(user, username) {
  if (!validUsername(username)) throw new Error('Invalid username');
  await runTransaction(db, async (transaction) => {
    const usernameRef = doc(db, 'usernames', username);
    const profileRef = doc(db, 'users', user.uid);
    const usernameSnap = await transaction.get(usernameRef);
    const profileSnap = await transaction.get(profileRef);
    if (usernameSnap.exists() && usernameSnap.data().uid !== user.uid) {
      throw Object.assign(new Error('Username already taken'), { code: 'signup/username-taken' });
    }
    // A recovery retry must not overwrite an already completed profile.
    if (profileSnap.exists() && profileSnap.data().username) {
      if (profileSnap.data().username !== username) throw new Error('This account already has a username. Please sign out and log in.');
      return;
    }
    // Only the uid: this document can be fetched by anyone signed in, so it holds nothing private.
    transaction.set(usernameRef, { uid: user.uid });
    transaction.set(profileRef, {
      username, email: user.email, createdAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function createAccountWithProfile(credentials) {
  return registerWithProfile({
    createAccount: async (email, password) => (await register(email, password)).user,
    saveProfile,
    deleteAccount: deleteUser,
    signOut: logout,
  }, credentials);
}
