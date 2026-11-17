// Loads the app's bundled pictures into expo-image's cache at launch, so each is already there when its
// screen first draws. The files are small (scripts/optimize-images.cjs), and once cached this is near instant.
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import { Image } from 'expo-image';
import { CITY_ART, IMAGE_ART, SEASON_ART } from '../components/covers';
import spotThumbs from '../screens/spotThumbs';

// The opening screen waits this long at most. It is a limit, not a delay: the wait ends the moment every
// picture is in. A development build fetches each one from the computer, which is where the time goes.
const MAX_WAIT_MS = 6000;

// The same address expo-image resolves a require() to, so a preloaded picture is found in its cache.
const addresses = modules => [...new Set(modules)].map(module => resolveAssetSource(module)?.uri).filter(Boolean);

/**
 * Resolves once every picture has loaded or failed, or when `limit` is up, whichever is first. Never rejects.
 * Each picture is asked for on its own: asked for together, one failure reports the whole set finished
 * while the rest are still loading. One that fails simply loads when it is drawn.
 */
export function loadPictures(uris, limit = MAX_WAIT_MS) {
  const each = uris.map(uri => Promise.resolve().then(() => Image.prefetch(uri, 'memory-disk')).catch(() => false));
  return Promise.race([
    Promise.all(each),
    new Promise(resolve => { setTimeout(resolve, limit); }),
  ]).then(() => {});
}

let settled;

/** Starts preloading once, and resolves when the pictures are cached or the wait is up, whichever is first. */
export function preloadArt() {
  settled ??= loadPictures(addresses([
    ...Object.values(SEASON_ART), ...Object.values(CITY_ART), ...Object.values(IMAGE_ART), ...Object.values(spotThumbs),
  ]));
  return settled;
}
