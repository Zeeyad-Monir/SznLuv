// "2.4 km away", when location is on in Settings and the phone has granted it. Asked once per page.
import { useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { SettingsContext } from '../screens/SettingsContext';
import { distanceKm, hasCoordinates } from '../services/spotDiscovery';

export const describeDistance = km => (km < 1 ? `${Math.max(50, Math.round(km * 20) * 50)} m away` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`);

export default function useDistanceTo(latitude, longitude) {
  const { isLocationEnabled } = useContext(SettingsContext);
  const [label, setLabel] = useState(null);
  useEffect(() => {
    const target = { latitude, longitude };
    if (!isLocationEnabled || !hasCoordinates(target)) { setLabel(null); return undefined; }
    let live = true;
    (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return;
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (live) setLabel(describeDistance(distanceKm(here.coords, target)));
    })().catch(() => {});
    return () => { live = false; };
  }, [isLocationEnabled, latitude, longitude]);
  return label;
}
