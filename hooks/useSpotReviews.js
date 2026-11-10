// A spot's reviews, live, with the sort and star filter the review section offers, and what a reader can
// do: submit, upvote, and (on a spot someone made) report or delete. `source` comes from
// services/reviews.js reviewSource; null keeps everything idle (a spot that isn't shared).
import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { auth } from '../firebaseConfig';
import { averageRating, subscribeReviews, submitReview, upvoteReview } from '../services/reviews';

export default function useSpotReviews(source, { hiddenUids } = {}) {
  const { user, username } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('mostRecent');
  const [minStars, setMinStars] = useState(0);
  const key = source?.key;

  useEffect(() => {
    if (!source) { setReviews([]); return undefined; }
    return subscribeReviews(source, { sort, minStars }, next => {
      setReviews(next);
      setError(null);
    }, failure => {
      console.error('Reviews subscription failed:', { code: failure.code, message: failure.message });
      setReviews([]);
      setError('Reviews could not be loaded. Please try another filter or reopen this page.');
    });
  }, [key, sort, minStars]);

  // Reviews by someone the reader blocked are left out, like the rest of what that person shares.
  const shown = hiddenUids?.size ? reviews.filter(review => !review.uid || !hiddenUids.has(review.uid)) : reviews;

  // Resolves to true once sent. The username is the one the account chose; older accounts without one
  // fall back to the start of their email, as reviews always have.
  const submit = useCallback(async ({ comment, starRating, profileColor }) => {
    const reviewer = user ?? auth.currentUser;
    await submitReview(source, {
      uid: reviewer?.uid,
      username: username || reviewer?.displayName || reviewer?.email?.split('@')[0],
      profileColor, comment, starRating,
    });
    return true;
  }, [key, user, username]);

  const upvote = useCallback(review => upvoteReview((user ?? auth.currentUser)?.uid, review), [user]);

  return { reviews: shown, error, sort, setSort, minStars, setMinStars, average: averageRating(shown), submit, upvote, signedIn: !!(user ?? auth.currentUser) };
}
