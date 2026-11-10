// Photos of spots people make: picked from the library, shrunk, and stored at
// spotPhotos/{ownerUid}/{spotId}/{photoId}.jpg. A spot's record keeps only each photo's path; pages load
// them through photoUrl (firebaseConfig.js) with the viewer's sign-in, so storage.rules decides every time.
import { launchImageLibraryAsync } from 'expo-image-picker';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { deleteObject, listAll, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { SPOT_LIMITS } from './customSpotsState';

const LONG_EDGE = 1600; // Sharp on any phone, a few hundred KB as JPEG
const QUALITY = 0.8;
const MAX_BYTES = 5 * 1024 * 1024; // Also enforced by storage.rules

const photoError = (code, message) => Object.assign(new Error(message), { code });
const newPhotoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const folder = (uid, spotId) => `spotPhotos/${uid}/${spotId}`;

// Up to `room` photos from the library, in the order picked. [] when cancelled.
export async function pickPhotos(room) {
  if (room <= 0) return [];
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: room > 1,
    selectionLimit: room,
    orderedSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).slice(0, room);
}

// A JPEG no longer than LONG_EDGE on its long side. Small photos are only re-encoded.
async function shrink({ uri, width = 0, height = 0 }) {
  const long = Math.max(width, height);
  const actions = long > LONG_EDGE ? [{ resize: width >= height ? { width: LONG_EDGE } : { height: LONG_EDGE } }] : [];
  const result = await manipulateAsync(uri, actions, { compress: QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}

// React Native's fetch can't always turn a local file into a Blob; XMLHttpRequest can.
function readBlob(uri) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response);
    request.onerror = () => reject(photoError('photo/unreadable', 'Couldn’t read that photo.'));
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send(null);
  });
}

// Shrinks and uploads one picked photo. `onProgress(fraction)` follows the upload.
// Resolves to { id, path }, what a spot record keeps.
export async function uploadPhoto(uid, spotId, asset, { onProgress } = {}) {
  const id = newPhotoId();
  const path = `${folder(uid, spotId)}/${id}.jpg`;
  const blob = await readBlob(await shrink(asset));
  if (blob.size > MAX_BYTES) {
    blob.close?.();
    throw photoError('photo/too-large', 'That photo is too large, even after shrinking it.');
  }
  try {
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref(storage, path), blob, { contentType: 'image/jpeg' });
      task.on('state_changed',
        snapshot => onProgress?.(snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0),
        reject,
        resolve);
    });
  } finally {
    blob.close?.();
  }
  return { id, path };
}

export const deletePhoto = path => deleteObject(ref(storage, path));

// Removes files in a spot's folder that its record doesn't list: uploads from an edit that was
// abandoned, photos taken off the spot, or every photo of a spot that was deleted (keep = []).
// Best effort: a file left behind costs a little storage and is invisible to everyone else.
export async function cleanOrphans(uid, spotId, keep = []) {
  try {
    const kept = new Set(keep.map(photo => photo.path ?? photo));
    const { items } = await listAll(ref(storage, folder(uid, spotId)));
    await Promise.all(items.filter(item => !kept.has(item.fullPath)).map(item => deleteObject(item).catch(() => {})));
  } catch (error) {
    console.error('Photo clean-up skipped:', { code: error?.code });
  }
}

export const PHOTO_LIMIT = SPOT_LIMITS.photos;
