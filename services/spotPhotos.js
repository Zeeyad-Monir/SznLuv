// Photos of spots people make: picked from the library, shrunk, and stored at
// spotPhotos/{ownerUid}/{spotId}/{photoId}.jpg. A spot's record keeps only each photo's path; pages load
// them through photoUrl (firebaseConfig.js) with the viewer's sign-in, so storage.rules decides every time.
import { launchImageLibraryAsync } from 'expo-image-picker';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { SPOT_LIMITS } from './customSpotsState';
import { uploadJpeg } from './imageUpload';

const LONG_EDGE = 1600; // Sharp on any phone, a few hundred KB as JPEG
const MAX_BYTES = 5 * 1024 * 1024; // Also enforced by storage.rules

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

// Shrinks and uploads one picked photo. `onProgress(fraction)` follows the upload.
// Resolves to { id, path }, what a spot record keeps.
export async function uploadPhoto(uid, spotId, asset, { onProgress } = {}) {
  const id = newPhotoId();
  const path = `${folder(uid, spotId)}/${id}.jpg`;
  await uploadJpeg(path, asset, { longEdge: LONG_EDGE, maxBytes: MAX_BYTES, onProgress });
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
