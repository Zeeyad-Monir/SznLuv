import { launchImageLibraryAsync } from 'expo-image-picker';
import { collection, doc, getDocFromServer } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { uploadJpeg } from './imageUpload';
import { avatarPhotoPath, saveProfileDetails } from './profiles';

const MAX_BYTES = 1024 * 1024;
const LONG_EDGE = 512;

export async function chooseProfilePhoto() {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1,
  });
  return result.canceled ? null : result.assets?.[0] ?? null;
}

async function removePhoto(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    if (error?.code !== 'storage/object-not-found') console.warn('Profile photo cleanup failed:', { code: error?.code });
  }
}

// undefined keeps the saved photo, null removes it, and an asset replaces it.
export async function saveProfileEdit(uid, username, details, photo) {
  if (photo === undefined) return saveProfileDetails(uid, username, details);

  const avatarPhotoId = photo ? doc(collection(db, 'profiles')).id : null;
  const stagedPath = avatarPhotoPath(uid, avatarPhotoId);
  if (photo && !stagedPath) throw new Error('Invalid profile photo path.');

  if (stagedPath) {
    try {
      await uploadJpeg(stagedPath, photo, { longEdge: LONG_EDGE, maxBytes: MAX_BYTES, cacheControl: 'private, no-store' });
    } catch (error) {
      void removePhoto(stagedPath);
      throw error;
    }
  }

  let previous;
  try {
    previous = await saveProfileDetails(uid, username, { ...details, avatarPhotoId });
  } catch (error) {
    if (stagedPath) {
      // A lost response can hide a successful write. Check the server before deleting the staged photo.
      void getDocFromServer(doc(db, 'profiles', uid)).then(current => {
        if (current.data()?.avatarPhotoId !== avatarPhotoId) return removePhoto(stagedPath);
      }).catch(() => {});
    }
    throw error;
  }

  // The transaction returns the actual previous ID, even if another device edited the profile.
  if (previous !== avatarPhotoId) void removePhoto(avatarPhotoPath(uid, previous));
}
