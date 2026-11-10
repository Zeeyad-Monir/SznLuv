// Reviews: one system for SznLuv's spots and for spots people make and share.
// - SznLuv's spots: reviews/{id}, tied to the spot by `placeID`.
// - A spot someone made: publicSpots/{spotId}/reviews/{id}. They belong to the spot, not to any list,
//   so a spot in several public lists has one set. The rules let others read them only while the spot
//   has a public copy; making it private keeps them, unseen.
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const SORT_OPTIONS = [
  { label: 'Most Recent', value: 'mostRecent' },
  { label: 'Most Popular', value: 'mostPopular' },
  { label: 'Highest Rated', value: 'highestRated' },
  { label: 'Lowest Rated', value: 'lowestRated' },
];
export const FILTER_OPTIONS = [
  { label: 'All Reviews', value: '0' },
  { label: '5 Stars', value: '5' },
  { label: '4 Stars', value: '4' },
  { label: '3 Stars', value: '3' },
  { label: '2 Stars', value: '2' },
  { label: '1 Star', value: '1' },
];

// Where a spot's reviews live. `{ placeID }` for one of SznLuv's, `{ spotId }` for one someone made.
export function reviewSource({ placeID, spotId }) {
  if (spotId) return { key: `x:${spotId}`, path: ['publicSpots', spotId, 'reviews'], filter: [], placeID: `x:${spotId}`, spotId };
  return { key: `c:${placeID}`, path: ['reviews'], filter: [where('placeID', '==', placeID)], placeID };
}

const reviewsOf = source => collection(db, ...source.path);
const reviewPath = (source, id) => [...source.path, id].join('/');

export function subscribeReviews(source, { sort = 'mostRecent', minStars = 0 } = {}, onReviews, onError) {
  const constraints = [...source.filter];
  if (minStars > 0) constraints.push(where('starRating', '>=', minStars));
  if (sort === 'mostPopular') constraints.push(orderBy('thumbsUpCount', 'desc'));
  else if (sort === 'highestRated') constraints.push(orderBy('starRating', 'desc'));
  else if (sort === 'lowestRated') constraints.push(orderBy('starRating', 'asc'));
  else constraints.push(orderBy('timestamp', 'desc'));
  return onSnapshot(query(reviewsOf(source), ...constraints), snapshot => {
    onReviews(snapshot.docs.map(entry => ({ id: entry.id, path: reviewPath(source, entry.id), ...entry.data() })));
  }, onError);
}

// The reviewer's uid and username go with every new review, so it can be deleted, reported, or hidden
// from someone who blocked them.
export function submitReview(source, { uid, username, profileColor, comment, starRating }) {
  if (!uid) throw new Error('You must be logged in to submit a review.');
  return addDoc(reviewsOf(source), {
    uid, username, profileColor: profileColor ?? null, comment, starRating, timestamp: new Date(), placeID: source.placeID, thumbsUpCount: 0,
  });
}

// `review` is a review from subscribeReviews, or (older callers) the id of one in reviews/.
export async function upvoteReview(uid, review) {
  if (!uid) throw new Error('You must be logged in to upvote reviews.');
  const path = typeof review === 'string' ? `reviews/${review}` : review.path;
  const reviewId = path.split('/').pop();
  return runTransaction(db, async transaction => {
    const reviewRef = doc(db, path);
    const voteRef = doc(db, 'users', uid, 'votes', reviewId);
    const current = await transaction.get(reviewRef);
    const vote = await transaction.get(voteRef);
    if (!current.exists()) throw new Error('This review no longer exists.');
    if (vote.exists()) throw Object.assign(new Error('You have already upvoted this review.'), { code: 'review/already-voted' });
    transaction.update(reviewRef, { thumbsUpCount: (current.data().thumbsUpCount || 0) + 1 });
    transaction.set(voteRef, { reviewId });
  });
}

// By its author, or by the owner of the spot it is on.
export const deleteReview = review => deleteDoc(doc(db, review.path));

// Whether a spot someone made has any review at all, shared or not (its owner can always ask).
export async function spotHasReviews(spotId) {
  const snapshot = await getDocs(query(collection(db, 'publicSpots', spotId, 'reviews'), limit(1)));
  return !snapshot.empty;
}

export function averageRating(reviews) {
  if (!reviews.length) return 0;
  return (reviews.reduce((sum, review) => {
    const rating = review.starRating ? Number(review.starRating) : 0;
    return sum + (Number.isNaN(rating) ? 0 : rating);
  }, 0) / reviews.length).toFixed(1);
}
