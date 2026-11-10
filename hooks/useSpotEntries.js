import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { isCustomSpot, resolveSpot, spotKey } from '../services/catalogue';
import { isLegacyRef, ownerOfSpotId, spotIdFor, toRef } from '../services/customSpotsState';
import usePublicDocuments from './usePublicDocuments';

// A draft may use the viewer's private records. A published list always uses public copies.
export default function useSpotEntries(refs, { privateSpots, ownedDraft = false } = {}) {
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const isPrivate = ref => !!privateSpots && !!uid && (
    (ref.owner ?? ownerOfSpotId(ref.id)) === uid || (ownedDraft && isLegacyRef(ref))
  );
  const ids = refs.filter(ref => isCustomSpot(ref) && !isPrivate(ref)).map(ref => ref.id);
  const { read, retry } = usePublicDocuments('publicSpots', ids);

  const entries = refs.map(ref => {
    if (!isCustomSpot(ref)) return { ref, spot: resolveSpot(ref), status: 'ready' };

    const mine = isPrivate(ref);
    const legacy = mine && ownedDraft && isLegacyRef(ref);
    const id = legacy ? spotIdFor(uid, ref.id) : ref.id;
    const expectedOwner = ref.owner ?? ownerOfSpotId(ref.id);
    const result = mine
      ? { status: privateSpots.status, value: privateSpots.byId[id] }
      : read(id);
    const details = result.value?.ownerUid === (mine ? uid : expectedOwner) ? result.value : null;
    const owner = mine ? uid : expectedOwner;
    const nameOnly = { k: 'x', id, ...(owner ? { owner } : {}), name: ref.name };
    const status = details ? 'ready'
      : result.status === 'error' ? 'error'
        : ['idle', 'loading'].includes(result.status) ? 'loading' : 'unavailable';
    const shown = details ? toRef(id, details) : legacy ? ref : nameOnly;
    const spot = resolveSpot(shown);
    return {
      ref: details ? shown : nameOnly,
      spot: { ...spot, key: spotKey(ref), meta: details?.category || spot.meta },
      details, mine, status: legacy ? 'ready' : status,
    };
  });

  return {
    entries,
    retry: () => {
      retry();
      if (privateSpots?.status === 'error') privateSpots.retry();
    },
  };
}
