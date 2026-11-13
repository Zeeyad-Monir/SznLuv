// Public profiles for a handful of people at once, e.g. everyone who reviewed a spot, so each shows their
// own photo or colour. Each person is read once per app session (services/profiles.js getProfileCached).
// Profiles can only be read signed in; signed out, everyone falls back to what the caller already has.
import { useEffect, useState } from 'react';
import { getProfileCached } from '../services/profiles';

export default function useProfiles(uids, { enabled = true } = {}) {
  const [profiles, setProfiles] = useState({});
  const key = enabled ? [...new Set(uids.filter(Boolean))].sort().join(',') : '';

  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    for (const uid of key.split(',')) {
      getProfileCached(uid).then(profile => {
        if (live) setProfiles(previous => (previous[uid] === profile ? previous : { ...previous, [uid]: profile }));
      }, () => {});
    }
    return () => { live = false; };
  }, [key]);

  return profiles;
}
