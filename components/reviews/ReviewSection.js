// The review section of a spot page: average, a form to add one, sort and star filter, and the reviews.
// Shared by SznLuv's spot pages (screens/SpotDetailScreen.js, in their original look) and pages for spots
// people make and share (screens/CustomSpotScreen.js, tone="theme"). Data comes from hooks/useSpotReviews.js.
import React, { useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FILTER_OPTIONS, SORT_OPTIONS } from '../../services/reviews';
import { colors as theme } from '../theme';

const PROFILE_COLOURS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

// `canReview`: false for the spot's own creator, who reads reviews but doesn't write one.
// `onReviewMenu(review)`: adds a "More options" button to each review (report, delete).
export default function ReviewSection({
  reviews, tone = 'classic', title = 'Reviews of this Date!', canReview = true, cannotReviewText,
  emptyText = 'No reviews yet. Be the first to review!', onReviewMenu, style,
}) {
  const themed = tone === 'theme';
  const [comment, setComment] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLOURS[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (sending) return;
    if (!comment.trim()) { Alert.alert('Error', 'Comment cannot be empty.'); return; }
    if (starRating === 0) { Alert.alert('Error', 'Please select a star rating.'); return; }
    if (!reviews.signedIn) { Alert.alert('Error', 'You must be logged in to submit a review.'); return; }
    setSending(true);
    try {
      await reviews.submit({ comment, starRating, profileColor: selectedColor });
      setComment('');
      setStarRating(0);
      setSelectedColor(PROFILE_COLOURS[0]);
      Alert.alert('Success', 'Review submitted!');
    } catch (error) {
      console.error('Review submission failed:', { code: error.code, message: error.message });
      Alert.alert('Error', 'Could not submit the review.');
    } finally {
      setSending(false);
    }
  };

  const thumbsUp = async review => {
    try {
      await reviews.upvote(review);
      Alert.alert('Success', 'You upvoted the review!');
    } catch (error) {
      console.error('Thumbs-Up Error:', { code: error.code });
      Alert.alert('Could not upvote', error.code === 'review/already-voted' ? error.message : 'Failed to upvote the review. Please try again.');
    }
  };

  return (
    <View style={[styles.section, themed && themedStyles.section, style]}>
      <View style={styles.averageRatingContainer}>
        <Text style={[styles.averageRatingText, themed && themedStyles.average]}>User Ratings: {reviews.average}/5 ★</Text>
      </View>

      <View>
        <Text style={styles.reviewHeader} accessibilityRole="header">{title}</Text>
        {!canReview ? (
          <Text style={styles.loginPrompt}>{cannotReviewText}</Text>
        ) : reviews.signedIn ? (
          <View style={styles.reviewInputArea}>
            <View style={styles.starRatingContainer}>
              {[1, 2, 3, 4, 5].map(rating => (
                <TouchableOpacity key={rating} onPress={() => setStarRating(rating)}
                  accessibilityRole="button" accessibilityLabel={`${rating} star${rating === 1 ? '' : 's'}`}
                  accessibilityState={{ selected: rating <= starRating }}>
                  <Text style={[styles.star, { color: rating <= starRating ? '#FFD700' : '#ccc' }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.reviewInput} placeholder="Write your review here..." value={comment}
              onChangeText={setComment} multiline maxLength={2000} accessibilityLabel="Your review" />
            <View style={styles.colorPickerContainer}>
              <FlatList data={PROFILE_COLOURS} horizontal keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => setSelectedColor(item)}>
                    <View style={[styles.colorCircle, { backgroundColor: item }, selectedColor === item && styles.selectedColorCircle]} />
                  </TouchableOpacity>
                )} />
            </View>
            <TouchableOpacity style={[styles.submitButton, themed && themedStyles.submit]} onPress={submit}
              accessibilityRole="button" disabled={sending}>
              <Text style={[styles.submitButtonText, themed && themedStyles.submitText]}>Submit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.loginPrompt}>Please log in to submit a review.</Text>
        )}
      </View>

      <Text style={styles.filterTitle}>Filter Reviews</Text>
      <View style={styles.filterRow}>
        <Dropdown label={SORT_OPTIONS.find(option => option.value === reviews.sort)?.label || 'Sort By'}
          open={isSortOpen} onToggle={() => setIsSortOpen(open => !open)} options={SORT_OPTIONS}
          onChoose={value => { reviews.setSort(value); setIsSortOpen(false); }} />
        <Dropdown label={FILTER_OPTIONS.find(option => parseInt(option.value, 10) === reviews.minStars)?.label || 'Filter'}
          open={isFilterOpen} onToggle={() => setIsFilterOpen(open => !open)} options={FILTER_OPTIONS}
          onChoose={value => { reviews.setMinStars(parseInt(value, 10)); setIsFilterOpen(false); }} />
      </View>

      <View style={styles.separator} />

      {!!reviews.error && <Text accessibilityRole="alert">{reviews.error}</Text>}
      {reviews.reviews.length > 0 ? reviews.reviews.map(item => (
        <View key={item.id} style={styles.reviewItem}>
          <View style={[styles.profilePic, { backgroundColor: item.profileColor || '#ccc' }]}>
            <Text style={styles.profilePicText}>{(item.username || 'User').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.reviewContent}>
            <View style={styles.reviewHeaderContainer}>
              <Text style={styles.reviewUsername}>{item.username}</Text>
              <View style={styles.reviewTools}>
                {!!onReviewMenu && (
                  <TouchableOpacity style={styles.menuButton} hitSlop={8} onPress={() => onReviewMenu(item)}
                    accessibilityRole="button" accessibilityLabel={`More options for ${item.username || 'this'}’s review`}>
                    <Ionicons name="ellipsis-horizontal" size={18} color="#555" />
                  </TouchableOpacity>
                )}
                <View style={styles.thumbsUpButtonContainer}>
                  <TouchableOpacity onPress={() => thumbsUp(item)} accessibilityRole="button" accessibilityLabel={`Upvote ${item.username || 'this'}’s review`}>
                    <Image source={require('../../assets/thumbsUp.png')} style={styles.thumbsUpIcon} />
                  </TouchableOpacity>
                  <Text style={styles.thumbsUpCount}>{item.thumbsUpCount || 0}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.reviewStars}>{'★'.repeat(item.starRating).padEnd(5, '☆')}</Text>
            <Text style={styles.reviewText}>{item.comment}</Text>
            <Text style={styles.reviewTimestamp}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      )) : (
        <Text style={styles.noReviewsText}>{emptyText}</Text>
      )}
    </View>
  );
}

function Dropdown({ label, open, onToggle, options, onChoose }) {
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={styles.dropdownHeaderText}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#555" />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownOptions}>
          {options.map(option => (
            <TouchableOpacity key={option.value} style={styles.dropdownOption} onPress={() => onChoose(option.value)}>
              <Text style={styles.dropdownOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// The original look of SznLuv's spot pages.
const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FAF4E4', padding: 15, borderRadius: 10, marginHorizontal: 15, marginTop: 20, marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  reviewHeader: { fontSize: 18, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 10 },
  reviewInputArea: { marginBottom: 15 },
  reviewInput: {
    backgroundColor: '#fff', padding: 10, borderRadius: 5, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ccc',
  },
  submitButton: { backgroundColor: '#F4A460', padding: 10, borderRadius: 5, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#FAF4E4', fontWeight: 'bold', fontSize: 16 },
  loginPrompt: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 15 },
  reviewItem: {
    backgroundColor: '#fff', borderRadius: 10, padding: 8, marginBottom: 12, width: '100%', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 1,
  },
  reviewContent: { flex: 1 },
  reviewHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  reviewTools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuButton: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  thumbsUpButtonContainer: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  thumbsUpIcon: { width: 15, height: 15, marginBottom: 2, marginTop: 5, marginRight: 5, opacity: 0.5 },
  thumbsUpCount: { fontSize: 12, marginRight: 5, color: '#333', opacity: 0.7 },
  reviewUsername: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  reviewStars: { fontSize: 16, color: '#FFD700', marginBottom: 10, marginTop: -10 },
  reviewText: { fontSize: 14, color: '#333', marginBottom: 3 },
  reviewTimestamp: { fontSize: 10, color: '#999', textAlign: 'right', marginTop: 8 },
  separator: { height: 1, backgroundColor: '#ccc', marginVertical: 10, marginBottom: 20 },
  noReviewsText: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 10 },
  colorPickerContainer: { flexDirection: 'row', marginTop: 10, marginBottom: 10, justifyContent: 'center' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 5, borderWidth: 1, borderColor: '#ccc', marginTop: 8 },
  selectedColorCircle: { borderWidth: 2, borderColor: '#000' },
  profilePicText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profilePic: { width: 40, height: 40, borderRadius: 20, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  starRatingContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 10 },
  star: { fontSize: 30, marginHorizontal: 5 },
  averageRatingContainer: { marginBottom: 25, alignItems: 'center' },
  averageRatingText: { fontSize: 18, fontWeight: 'bold', color: '#F4A460' },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginVertical: 10, alignItems: 'center' },
  dropdownContainer: {
    flex: 1, marginHorizontal: 5, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff',
    overflow: 'hidden', elevation: 2, marginBottom: 10,
  },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  dropdownHeaderText: { fontSize: 16, color: '#333' },
  dropdownOptions: { backgroundColor: '#fff' },
  dropdownOption: { paddingVertical: 10, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  dropdownOptionText: { fontSize: 16, color: '#555' },
  filterTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginTop: 20, marginBottom: 15 },
});

// The newer pages' cream and ink.
const themedStyles = StyleSheet.create({
  section: { backgroundColor: theme.card, marginHorizontal: 0, borderRadius: 14 },
  average: { color: theme.ink },
  submit: { backgroundColor: theme.ink, borderRadius: 12, minHeight: 48, justifyContent: 'center' },
  submitText: { color: theme.white },
});
