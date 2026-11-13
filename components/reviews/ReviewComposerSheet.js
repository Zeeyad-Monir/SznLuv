// Writing a review: the app's bottom sheet with large stars, a word for each rating, the review itself and Post.
// It closes once the review is saved; the review then shows at the top of the section as yours.
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../Avatar';
import DiscoveryBottomSheet from '../DiscoveryBottomSheet';
import { colors, controls, honey } from '../theme';
import { starLabel } from './RateRow';

export const COMMENT_LIMIT = 2000;
const WORDS = ['Tap a star to rate', 'Not for us', 'It was okay', 'Good', 'Great', 'Loved it'];

export default function ReviewComposerSheet({ initialRating = 0, uid, username, profile, onSubmit, onDismiss }) {
  const { bottom } = useSafeAreaInsets();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const ready = rating > 0 && !!comment.trim() && !sending;

  const rate = stars => {
    if (Platform.OS === 'ios') selectionAsync().catch(() => {});
    setRating(stars);
  };

  const post = async dismiss => {
    if (!ready) return;
    setSending(true);
    try {
      await onSubmit({ comment, starRating: rating });
      dismiss();
    } catch (error) {
      console.error('Review submission failed:', { code: error.code, message: error.message });
      Alert.alert('Couldn’t post your review', error.code === 'review/already-reviewed' ? error.message : 'Please check your connection and try again.');
      setSending(false);
    }
  };

  return (
    <DiscoveryBottomSheet title="Your review" closeLabel="Close review" testID="review-composer" onDismiss={onDismiss}>
      {dismiss => (
        <>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            <View style={styles.author}>
              <Avatar uid={uid} username={username} color={profile?.avatarColor} photoId={profile?.avatarPhotoId} size={36} />
              <View style={styles.authorText}>
                <Text style={styles.authorName} numberOfLines={1}>{username}</Text>
                <Text style={styles.authorMeta}>Posting publicly</Text>
              </View>
            </View>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(stars => (
                <TouchableOpacity key={stars} style={styles.star} onPress={() => rate(stars)}
                  accessibilityRole="button" accessibilityLabel={starLabel(stars)} accessibilityState={{ selected: stars <= rating }}>
                  <Ionicons name={stars <= rating ? 'star' : 'star-outline'} size={38} color={stars <= rating ? honey.star : honey.starIdle} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.word, !rating && styles.wordIdle]} accessibilityLiveRegion="polite">{WORDS[rating]}</Text>
            <TextInput style={styles.input} value={comment} onChangeText={setComment} multiline maxLength={COMMENT_LIMIT}
              placeholder="What was it like? Share tips for anyone going next." placeholderTextColor={colors.placeholder}
              accessibilityLabel="Your review" textAlignVertical="top" />
            {comment.length > COMMENT_LIMIT - 200 && (
              <Text style={styles.counter}>{`${comment.length}/${COMMENT_LIMIT}`}</Text>
            )}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(12, bottom) }]}>
            <TouchableOpacity style={[controls.primary, styles.post, !ready && styles.postDisabled]} onPress={() => post(dismiss)}
              disabled={!ready} accessibilityRole="button" accessibilityState={{ disabled: !ready, busy: sending }}>
              <Text style={[controls.primaryText, styles.postText]}>{sending ? 'Posting…' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </DiscoveryBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  bodyContent: { paddingBottom: 16 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorText: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '700', color: honey.ink },
  authorMeta: { fontSize: 13, fontWeight: '500', color: honey.meta },
  stars: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  star: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  word: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: honey.accent, marginTop: 4, marginBottom: 18 },
  wordIdle: { color: honey.meta, fontWeight: '500' },
  input: {
    minHeight: 140, borderRadius: 14, padding: 14, paddingTop: 14, fontSize: 16, lineHeight: 22, color: honey.ink,
    backgroundColor: honey.inset, borderWidth: 1, borderColor: honey.insetBorder,
  },
  counter: { alignSelf: 'flex-end', marginTop: 6, fontSize: 12, fontWeight: '600', color: honey.meta },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 12 },
  post: { backgroundColor: honey.accent, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  postDisabled: { opacity: 0.45 },
  postText: { color: honey.onAccent },
});
