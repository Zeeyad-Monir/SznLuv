// A spot's reviews, live, with the sort and star filter the review section offers, and what a reader can
// do: submit, upvote, and (on a spot someone made) report or delete. `source` comes from
// services/reviews.js reviewSource; null keeps everything idle (a spot that isn't shared).
// One subscription per spot: sorting and the star filter happen here, so the summary (average and star
// bars) always counts every review and changing the filter reads nothing more.
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { auth } from '../firebaseConfig';
import { DEFAULT_AVATAR_COLOUR, getProfileCached } from '../services/profiles';
import {
  averageRating, DEFAULT_SORT, filterReviews, ratingCounts, sortReviews, subscribeReviews, submitReview, upvoteReview,
} from '../services/reviews';

export default function useSpotReviews(source, { hiddenUids } = {}) {
  const { user, username } = useContext(AuthContext);
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [starFilter, setStarFilter] = useState(0);
  const key = source?.key;
  const reviewer = user ?? auth.currentUser;
  const myUid = reviewer?.uid ?? null;

  useEffect(() => {
    if (!source) { setAll([]); return undefined; }
    return subscribeReviews(source, next => {
      setAll(next);
      setError(null);
    }, failure => {
      console.error('Reviews subscription failed:', { code: failure.code, message: failure.message });
      setAll([]);
      setError('Reviews could not be loaded. Please reopen this page.');
    });
  }, [key]);

  // Reviews by someone the reader blocked are left out, like the rest of what that person shares.
  const visible = useMemo(
    () => (hiddenUids?.size ? all.filter(review => !review.uid || !hiddenUids.has(review.uid)) : all),
    [all, hiddenUids],
  );
  // One review each: the reader's own is pinned first, whatever the sort or filter.
  const mine = myUid ? visible.find(review => review.uid === myUid) ?? null : null;
  const reviews = useMemo(() => {
    const shown = filterReviews(sortReviews(visible, sort), starFilter);
    return mine ? [mine, ...shown.filter(review => review !== mine)] : shown;
  }, [visible, sort, starFilter, mine]);

  // Resolves to true once sent. The username is the one the account chose; older accounts without one
  // fall back to the start of their email, as reviews always have. The profile colour goes with it so
  // people who can't read profiles (signed out) still see the reviewer's colour.
  const submit = useCallback(async ({ comment, starRating }) => {
    if (mine) throw Object.assign(new Error('You have already reviewed this spot.'), { code: 'review/already-reviewed' });
    const profile = reviewer?.uid ? await getProfileCached(reviewer.uid).catch(() => null) : null;
    await submitReview(source, {
      uid: reviewer?.uid,
      username: username || reviewer?.displayName || reviewer?.email?.split('@')[0],
      profileColor: profile?.avatarColor || DEFAULT_AVATAR_COLOUR,
      comment: comment.trim(), starRating,
    });
    return true;
  }, [key, reviewer, username, mine]);

  const upvote = useCallback(review => upvoteReview(myUid, review), [myUid]);

  return {
    reviews, all: visible, counts: ratingCounts(visible), average: averageRating(visible),
    sort, setSort, starFilter, setStarFilter, myUid, myName: username || reviewer?.displayName || reviewer?.email?.split('@')[0] || '',
    mine, submit, upvote, signedIn: !!reviewer, error,
  };
}
