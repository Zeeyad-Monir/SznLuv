import * as Location from 'expo-location';
import { hasCoordinates } from './spotDiscovery';

const LOOKUP_TIMEOUT_MS = 12000;
const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

export const customLocationAvailable = !!GEOAPIFY_KEY?.trim();

function locationError(message, action = null) {
  return Object.assign(new Error(message), { action });
}

async function withTimeout(promise, signal, message, onTimeout = () => {}) {
  let timer;
  let cancelWait;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      cancelWait = () => reject(locationError(message));
      if (signal.aborted) cancelWait();
      else signal.addEventListener('abort', cancelWait);
      timer = setTimeout(() => {
        reject(locationError(message));
        onTimeout();
      }, LOOKUP_TIMEOUT_MS);
    })]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancelWait);
  }
}

export async function getCurrentOrigin(signal) {
  const enabled = await Location.hasServicesEnabledAsync();
  if (signal.aborted) return null;
  if (!enabled) {
    throw locationError('Turn on location services on your device, then try again.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (signal.aborted) return null;
  if (permission.status !== 'granted') {
    throw locationError(
      'Location permission was denied. Allow it in device settings or use a custom location.',
      permission.canAskAgain === false ? 'settings' : null,
    );
  }

  const timeoutMessage = 'Getting your location took too long. Try again or use a custom location.';
  const fix = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => {
    throw locationError('Your location could not be found. Try again or use a custom location.');
  });
  const { coords } = await withTimeout(fix, signal, timeoutMessage);
  if (signal.aborted) return null;
  if (!hasCoordinates(coords)) throw locationError('Your location could not be found. Try again or use a custom location.');
  return { source: 'current', label: 'Current location', latitude: coords.latitude, longitude: coords.longitude };
}

export async function findCustomOrigins(query, signal) {
  if (!customLocationAvailable) throw locationError('Custom location lookup is currently unavailable.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel);
  if (signal.aborted) cancel();
  try {
    const url = 'https://api.geoapify.com/v1/geocode/search'
      + `?text=${encodeURIComponent(query.trim())}&format=json&limit=5&lang=en`
      + `&bias=proximity:-123.1207,49.2827&apiKey=${encodeURIComponent(GEOAPIFY_KEY.trim())}`;
    const data = await withTimeout((async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        const message = response.status === 401 || response.status === 403
          ? 'Custom location lookup is currently unavailable.'
          : 'Custom location lookup failed. Check your connection and try again.';
        throw locationError(message);
      }
      return response.json();
    })(), signal, 'Location lookup took too long. Try again.', cancel);
    if (!Array.isArray(data?.results)) throw locationError('Custom location lookup returned an invalid response. Try again.');
    const seen = new Set();
    const matches = [];
    for (const result of data.results) {
      const point = {
        source: 'custom',
        label: typeof result?.formatted === 'string' ? result.formatted.trim() : '',
        latitude: result?.lat,
        longitude: result?.lon,
      };
      if (!point.label || !hasCoordinates(point)) continue;
      const key = JSON.stringify([point.label, point.latitude, point.longitude]);
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ ...point, key });
      if (matches.length === 5) break;
    }
    return matches;
  } catch (error) {
    if (error?.action !== undefined) throw error;
    throw locationError('Custom location lookup failed. Check your connection and try again.');
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
