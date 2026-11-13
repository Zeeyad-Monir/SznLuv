// Where the user is, for the Map tab: the blue dot, "x km away" and the recenter button.
// Location is used only while it is on in Settings and the phone allows it. The first time the map opens the
// phone's own permission question is asked once; saying yes also turns the app's setting on, exactly as
// choosing "Current location" in the filters does. Saying no leaves the map working without it.
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import * as Location from 'expo-location';
import { SettingsContext } from '../screens/SettingsContext';
import { hasCoordinates } from '../services/spotDiscovery';
import { followPosition } from '../services/followPosition';

const allowed = permission => !!permission && (permission.granted ?? permission.status === 'granted');
const neverAsked = permission => !!permission && !allowed(permission)
  && permission.status === 'undetermined' && permission.canAskAgain !== false;

// `watching`: follow the position (only while the tab is in front).
// Returns { status: 'checking' | 'on' | 'off', coords, enable() }. `coords` is null until the first fix.
export default function useMapLocation(watching = true) {
  const { isLocationEnabled, setIsLocationEnabled } = useContext(SettingsContext);
  const [permission, setPermission] = useState(null);
  const [coords, setCoords] = useState(null);
  const asked = useRef(false);

  useEffect(() => {
    let active = true;
    const check = async firstTime => {
      let next = await Location.getForegroundPermissionsAsync();
      if (firstTime && !asked.current && neverAsked(next)) {
        asked.current = true;
        next = await Location.requestForegroundPermissionsAsync();
        if (active && allowed(next)) setIsLocationEnabled(true);
      }
      if (active) setPermission(next);
    };
    check(true).catch(() => { if (active) setPermission({ granted: false }); });
    // Permission can be changed in the phone's settings while the app is in the background.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') check(false).catch(() => {});
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [setIsLocationEnabled]);

  const on = isLocationEnabled && allowed(permission);

  useEffect(() => {
    if (!on) { setCoords(null); return undefined; }
    if (!watching) return undefined;
    let active = true;
    const accept = position => {
      if (active && hasCoordinates(position?.coords)) {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
    };
    // Restarted by itself if iOS quietly ends it, so the blue dot and "x km away" keep up.
    const tracking = followPosition({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 50 }, accept);
    return () => {
      active = false;
      tracking.remove();
    };
  }, [on, watching]);

  // Turns location on from the map: asks the phone if it still can, otherwise opens its settings.
  const enable = useCallback(async () => {
    try {
      let next = await Location.getForegroundPermissionsAsync();
      if (!allowed(next) && next.canAskAgain !== false) next = await Location.requestForegroundPermissionsAsync();
      setPermission(next);
      if (allowed(next)) setIsLocationEnabled(true);
      else await Linking.openSettings();
    } catch {
      // Nothing to add: the map carries on without location.
    }
  }, [setIsLocationEnabled]);

  return { status: permission === null ? 'checking' : on ? 'on' : 'off', coords: on ? coords : null, enable };
}
