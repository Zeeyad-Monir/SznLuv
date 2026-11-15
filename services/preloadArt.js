// Loads the app's bundled pictures into expo-image's cache at launch, so each is already there when its
// screen first draws. The files are small (scripts/optimize-images.cjs), and once cached this is near instant.
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import { Image } from 'expo-image';
import { CITY_ART, IMAGE_ART, SEASON_ART } from '../components/covers';
import spotThumbs from '../screens/spotThumbs';

// The startup spinner waits this long at most. Anything still loading then carries on behind the app.
const MAX_WAIT_MS = 2000;

// The same address expo-image resolves a require() to, so a preloaded picture is found in its cache.
const addresses = modules => [...new Set(modules)].map(module => resolveAssetSource(module)?.uri).filter(Boolean);

// Never rejects: a picture that fails to preload simply loads when it is drawn.
const preload = modules => Image.prefetch(addresses(modules), 'memory-disk').catch(() => false);

let settled;

/** Starts preloading once, and resolves when the pictures are cached or the wait is up, whichever is first. */
export function preloadArt() {
  if (!settled) {
    const covers = preload([...Object.values(SEASON_ART), ...Object.values(CITY_ART), ...Object.values(IMAGE_ART)]);
    const thumbs = preload(Object.values(spotThumbs));
    settled = Promise.race([
      Promise.all([covers, thumbs]),
      new Promise(resolve => { setTimeout(resolve, MAX_WAIT_MS); }),
    ]).then(() => {});
  }
  return settled;
}
