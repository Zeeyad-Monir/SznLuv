// Reviews: one system for SznLuv's spots and for spots people make and share.
// - SznLuv's spots: reviews/{id}, tied to the spot by `placeID`.
// - A spot someone made: publicSpots/{spotId}/reviews/{id}. They belong to the spot, not to any list,
//   so a spot in several public lists has one set. The rules let others read them only while the spot
//   has a public copy; making it private keeps them, unseen.
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, runTransaction, where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const SORT_OPTIONS = [
  { label: 'Most recent', value: 'mostRecent' },
  { label: 'Most helpful', value: 'mostPopular' },
  { label: 'Highest rated', value: 'highestRated' },
  { label: 'Lowest rated', value: 'lowestRated' },
];
export const DEFAULT_SORT = 'mostRecent';
// 0 is every review; otherwise only reviews with exactly that many stars.
export const STAR_FILTERS = [0, 5, 4, 3, 2, 1];

// Where a spot's reviews live. `{ placeID }` for one of SznLuv's, `{ spotId }` for one someone made.
export function reviewSource({ placeID, spotId }) {
  if (spotId) return { key: `x:${spotId}`, path: ['publicSpots', spotId, 'reviews'], filter: [], placeID: `x:${spotId}`, spotId };
  return { key: `c:${placeID}`, path: ['reviews'], filter: [where('placeID', '==', placeID)], placeID };
}

const reviewsOf = source => collection(db, ...source.path);
const reviewPath = (source, id) => [...source.path, id].join('/');

// Every review of the spot, live. Sorting and the star filter happen on the device (sortReviews,
// filterReviews), so changing them reads nothing more and the summary always sees every review.
export function subscribeReviews(source, onReviews, onError) {
  return onSnapshot(query(reviewsOf(source), ...source.filter), snapshot => {
    onReviews(snapshot.docs.map(entry => ({ id: entry.id, path: reviewPath(source, entry.id), ...entry.data() })));
  }, onError);
}

// A review's time in milliseconds, whether it is a Firestore Timestamp, a Date or a number.
export function reviewTime(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  const time = new Date(timestamp).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const stars = review => Number(review.starRating) || 0;
const newestFirst = (a, b) => reviewTime(b.timestamp) - reviewTime(a.timestamp);
const SORTS = {
  mostRecent: newestFirst,
  mostPopular: (a, b) => (b.thumbsUpCount || 0) - (a.thumbsUpCount || 0) || newestFirst(a, b),
  highestRated: (a, b) => stars(b) - stars(a) || newestFirst(a, b),
  lowestRated: (a, b) => stars(a) - stars(b) || newestFirst(a, b),
};

export const sortReviews = (reviews, sort = DEFAULT_SORT) => [...reviews].sort(SORTS[sort] || newestFirst);
export const filterReviews = (reviews, starFilter = 0) => (starFilter ? reviews.filter(review => stars(review) === starFilter) : reviews);

// How many reviews gave each number of stars: { 5: n, 4: n, 3: n, 2: n, 1: n }.
export function ratingCounts(reviews) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const review of reviews) {
    const rating = Math.round(stars(review));
    if (counts[rating] !== undefined) counts[rating] += 1;
  }
  return counts;
}

// "Just now", "5m ago", "3h ago", "4d ago", "2w ago", then the date ("Mar 4", or "Mar 4, 2024" in another year).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function relativeTime(timestamp, now = Date.now()) {
  const time = reviewTime(timestamp);
  if (!time) return '';
  const minutes = Math.floor(Math.max(0, now - time) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 56) return `${Math.floor(days / 7)}w ago`;
  const date = new Date(time);
  const label = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === new Date(now).getFullYear() ? label : `${label}, ${date.getFullYear()}`;
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

// The average of the reviews that carry a rating of 1 to 5; some early reviews have none and aren't counted.
export function averageRating(reviews) {
  const ratings = reviews.map(stars).filter(rating => rating >= 1 && rating <= 5);
  if (!ratings.length) return 0;
  return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
}
