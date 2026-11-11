import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebaseConfig';

const photoError = (code, message) => Object.assign(new Error(message), { code });

// React Native's fetch can't always turn a local file into a Blob; XMLHttpRequest can.
function readBlob(uri) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const unreadable = () => reject(photoError('photo/unreadable', 'Couldn’t read that photo.'));
    request.onload = () => request.response?.size > 0 ? resolve(request.response) : unreadable();
    request.onerror = unreadable;
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send(null);
  });
}

export async function uploadJpeg(path, { uri, width = 0, height = 0 }, { longEdge, maxBytes, onProgress, cacheControl }) {
  const actions = Math.max(width, height) > longEdge
    ? [{ resize: width >= height ? { width: longEdge } : { height: longEdge } }]
    : [];
  const resized = await manipulateAsync(uri, actions, { compress: 0.8, format: SaveFormat.JPEG });
  const blob = await readBlob(resized.uri);
  try {
    if (blob.size > maxBytes) throw photoError('photo/too-large', 'That photo is too large, even after shrinking it.');
    await new Promise((resolve, reject) => {
      const metadata = { contentType: 'image/jpeg', ...(cacheControl ? { cacheControl } : {}) };
      const task = uploadBytesResumable(ref(storage, path), blob, metadata);
      task.on('state_changed',
        snapshot => onProgress?.(snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0),
        reject,
        resolve);
    });
  } finally {
    blob.close?.();
  }
}
