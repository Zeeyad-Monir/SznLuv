// The review section of a spot page: the average and star bars, "Rate this spot", a filter button that opens
// the sort and filter sheet, and the reviews. Data comes from hooks/useSpotReviews.js.
// Each person has one review per spot; once they've written it, it shows first, marked "You".
// Reviews come five at a time, with "Show more" beneath them.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { focusAccessibility } from '../DiscoveryBottomSheet';
import { FilterButton } from '../filters/SearchControls';
import useProfiles from '../../hooks/useProfiles';
import { DEFAULT_SORT, SORT_OPTIONS } from '../../services/reviews';
import { honey, spot } from '../theme';
import RateRow from './RateRow';
import RatingSummary from './RatingSummary';
import ReviewComposerSheet from './ReviewComposerSheet';
import ReviewFilterSheet, { starFilterLabel } from './ReviewFilterSheet';
import ReviewItem from './ReviewItem';

// `canReview`: false for the spot's own creator, who reads reviews but doesn't write one.
// `onReviewMenu(review)`: adds a "More options" button to each review (report, delete).
export const REVIEWS_PER_PAGE = 5;

export default function ReviewSection({
  reviews, title = 'Reviews', canReview = true, cannotReviewText,
  emptyText = 'No reviews yet. Be the first to review!', onReviewMenu, style,
}) {
  const { all, mine, myUid, signedIn, sort, starFilter } = reviews;
  const total = all.length;
  // The summary counts ratings; a few early reviews have none, so they show in the list but not the bars.
  const rated = Object.values(reviews.counts).reduce((sum, count) => sum + count, 0);
  const [composerRating, setComposerRating] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [voted, setVoted] = useState(() => new Set());
  const [shownCount, setShownCount] = useState(REVIEWS_PER_PAGE);
  // A new sort or filter starts again from the first five.
  useEffect(() => setShownCount(REVIEWS_PER_PAGE), [sort, starFilter]);
  const filterButton = useRef(null);
  const focusFrame = useRef(null);
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);

  const profiles = useProfiles([myUid, ...all.map(review => review.uid)], { enabled: signedIn });
  const myProfile = myUid ? profiles[myUid] : null;
  const myName = reviews.myName || myProfile?.username || 'You';
  const filtered = sort !== DEFAULT_SORT || starFilter !== 0;

  const closeFilters = useCallback(() => {
    setFilterOpen(false);
    focusFrame.current = requestAnimationFrame(() => focusAccessibility(filterButton.current));
  }, []);
  const closeComposer = useCallback(() => setComposerRating(null), []);
  const clearFilters = () => { reviews.setSort(DEFAULT_SORT); reviews.setStarFilter(0); };

  // Helpful can be given once; the button stays lit, and a vote made earlier (on another visit) just lights it.
  const markHelpful = async review => {
    setVoted(previous => new Set(previous).add(review.id));
    try {
      await reviews.upvote(review);
    } catch (error) {
      if (error.code === 'review/already-voted') return;
      setVoted(previous => { const next = new Set(previous); next.delete(review.id); return next; });
      console.error('Helpful vote failed:', { code: error.code });
      Alert.alert('Couldn’t mark as helpful', 'Please try again.');
    }
  };

  const listed = reviews.reviews;
  const visible = listed.slice(0, shownCount);
  const remaining = listed.length - visible.length;

  const activeSummary = [starFilter ? starFilterLabel(starFilter) : null,
    sort !== DEFAULT_SORT ? SORT_OPTIONS.find(option => option.value === sort)?.label : null].filter(Boolean).join(' · ');

  return (
    <View style={[spot.section, styles.section, style]}>
      <View style={styles.header}>
        <Text style={spot.heading} accessibilityRole="header">{title}</Text>
        {total > 1 && (
          <FilterButton ref={filterButton} size={36} active={filtered} expanded={filterOpen}
            label="Sort and filter reviews" activeLabel="Sort and filter reviews, filters on"
            style={styles.filterButton} onPress={() => setFilterOpen(true)} />
        )}
      </View>

      {rated > 0 && (
        <RatingSummary average={reviews.average} total={rated} counts={reviews.counts}
          starFilter={starFilter} onPickStars={reviews.setStarFilter} />
      )}

      {!canReview ? (
        <Text style={styles.note}>{cannotReviewText}</Text>
      ) : !signedIn ? (
        <Text style={styles.note}>Log in to leave a review.</Text>
      ) : !mine && (
        <RateRow uid={myUid} username={myName} profile={myProfile} onRate={setComposerRating} />
      )}

      {filtered && (
        <TouchableOpacity style={styles.activeChip} onPress={clearFilters}
          accessibilityRole="button" accessibilityLabel={`Showing ${activeSummary}. Clear`}>
          <Text style={styles.activeChipText}>{activeSummary}</Text>
          <Ionicons name="close" size={14} color={honey.accent} />
        </TouchableOpacity>
      )}

      {!!reviews.error && <Text style={styles.note} accessibilityRole="alert">{reviews.error}</Text>}
      {listed.length > 0 ? (
        <View>
          {visible.map((review, index) => (
            <ReviewItem key={review.id} review={review} profile={review.uid ? profiles[review.uid] : null}
              mine={review === mine} first={index === 0} voted={voted.has(review.id)} canVote={signedIn}
              onHelpful={() => markHelpful(review)} onMenu={onReviewMenu ? () => onReviewMenu(review) : undefined} />
          ))}
          {remaining > 0 && (
            <TouchableOpacity style={styles.more} onPress={() => setShownCount(count => count + REVIEWS_PER_PAGE)}
              accessibilityRole="button" accessibilityLabel={`Show more reviews, ${remaining} more`}>
              <Text style={styles.moreText}>Show more reviews</Text>
              <Text style={styles.moreCount}>{`${visible.length} of ${listed.length}`}</Text>
              <Ionicons name="chevron-down" size={16} color={honey.accent} />
            </TouchableOpacity>
          )}
        </View>
      ) : total > 0 ? (
        <Text style={styles.note}>{`No ${starFilter}-star reviews yet.`}</Text>
      ) : (
        <Text style={styles.note}>{emptyText}</Text>
      )}

      {composerRating !== null && (
        <ReviewComposerSheet initialRating={composerRating} uid={myUid} username={myName}
          profile={myProfile} onSubmit={reviews.submit} onDismiss={closeComposer} />
      )}
      {filterOpen && (
        <ReviewFilterSheet sort={sort} starFilter={starFilter} counts={reviews.counts} onDismiss={closeFilters}
          onApply={next => { reviews.setSort(next.sort); reviews.setStarFilter(next.starFilter); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  filterButton: { backgroundColor: honey.inset, borderColor: honey.insetBorder },
  note: { ...StyleSheet.flatten(spot.meta), lineHeight: 20 },
  activeChip: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32,
    paddingHorizontal: 12, borderRadius: 16, backgroundColor: honey.inset, borderWidth: 1, borderColor: honey.insetBorder,
  },
  activeChipText: { fontSize: 13, fontWeight: '600', color: honey.accent },
  more: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, marginTop: 6,
    borderRadius: 23, backgroundColor: honey.inset, borderWidth: 1, borderColor: honey.insetBorder,
  },
  moreText: { fontSize: 15, fontWeight: '700', color: honey.accent },
  moreCount: { fontSize: 13, fontWeight: '500', color: honey.meta },
});
