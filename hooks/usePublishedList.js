// The public copy of one of the user's own lists, for comparing with the draft.
// The last copy read or written is remembered per list, so a sheet opened from the list page has it on
// its very first frame (native sheets are sized once, from what they show when they open).
import { useCallback, useEffect, useState } from 'react';
import { getPublicList } from '../services/lists';

const remembered = new Map();
export const rememberPublished = (listId, published) => remembered.set(listId, published ?? null);

export default function usePublishedList(list) {
  const listId = list?.id;
  const isPublic = !!list?.public;
  const publishedAt = list?.publishedAt ?? null;
  const [state, setState] = useState(() => (
    !isPublic ? { published: null, loaded: true }
      : { published: remembered.get(listId) ?? null, loaded: remembered.has(listId) }
  ));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!listId || !isPublic) {
      if (listId) remembered.delete(listId);
      setState({ published: null, loaded: true });
      return undefined;
    }
    let active = true;
    getPublicList(listId)
      .then(published => {
        rememberPublished(listId, published);
        if (active) setState({ published, loaded: true });
      })
      .catch(error => {
        console.error('Public copy unavailable:', { code: error?.code });
        if (active) setState(previous => ({ ...previous, loaded: true }));
      });
    return () => { active = false; };
  }, [listId, isPublic, publishedAt, version]);

  const refresh = useCallback(() => setVersion(count => count + 1), []);
  return { ...state, refresh };
}
