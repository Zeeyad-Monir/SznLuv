// Public copies of spots other people made, for showing them in Saved: where they are and a photo.
// null for one that isn't shared any more; missing while it loads. Read once per session per spot.
import { useEffect, useState } from 'react';
import { cachedPublicSpot, getPublicSpot } from '../services/customSpots';

export default function usePublicSpots(ids) {
  const key = [...ids].sort().join(',');
  const [copies, setCopies] = useState({});
  useEffect(() => {
    let live = true;
    ids.forEach(id => {
      const cached = cachedPublicSpot(id);
      if (cached !== undefined) { setCopies(previous => ({ ...previous, [id]: cached })); return; }
      getPublicSpot(id)
        .then(copy => { if (live) setCopies(previous => ({ ...previous, [id]: copy })); })
        .catch(() => { if (live) setCopies(previous => ({ ...previous, [id]: null })); });
    });
    return () => { live = false; };
  }, [key]);
  return copies;
}
