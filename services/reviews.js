import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export async function upvoteReview(uid, reviewId) {
  if (!uid) throw new Error('You must be logged in to upvote reviews.');
  return runTransaction(db, async transaction => {
    const reviewRef = doc(db, 'reviews', reviewId);
    const voteRef = doc(db, 'users', uid, 'votes', reviewId);
    const review = await transaction.get(reviewRef);
    const vote = await transaction.get(voteRef);
    if (!review.exists()) throw new Error('This review no longer exists.');
    if (vote.exists()) throw Object.assign(new Error('You have already upvoted this review.'), { code: 'review/already-voted' });
    transaction.update(reviewRef, { thumbsUpCount: (review.data().thumbsUpCount || 0) + 1 });
    transaction.set(voteRef, { reviewId });
  });
}
