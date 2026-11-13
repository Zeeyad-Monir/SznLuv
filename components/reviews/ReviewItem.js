// One review: the reviewer's own avatar (their profile photo, or their initial on their colour), name, stars
// and when, the review cut to a few lines with Read more, and a quiet Helpful button.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../Avatar';
import ReadMoreText from '../spot/ReadMoreText';
import { AVATAR_COLOURS, DEFAULT_AVATAR_COLOUR } from '../../services/profiles';
import { relativeTime } from '../../services/reviews';
import { honey, spot } from '../theme';
import Stars from './Stars';

// The reviewer's profile colour. Without a profile, a review keeps the colour it was posted with; the
// earliest reviews (no account attached, colours from the old picker) get a steady one from the name.
function colourOf(profile, review) {
  if (profile?.avatarColor) return profile.avatarColor;
  if (AVATAR_COLOURS.includes(review.profileColor)) return review.profileColor;
  if (review.uid) return DEFAULT_AVATAR_COLOUR;
  const name = review.username || '';
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

export default function ReviewItem({ review, profile, mine, first, voted, canVote, onHelpful, onMenu }) {
  const name = review.username || 'Someone';
  const helpful = review.thumbsUpCount || 0;
  const when = relativeTime(review.timestamp);
  const rating = Number(review.starRating) || 0;
  const rated = rating >= 1 && rating <= 5;
  return (
    <View style={[styles.item, !first && styles.divider]}>
      <View style={styles.header}>
        <Avatar uid={review.uid} username={name} color={colourOf(profile, review)} photoId={profile?.avatarPhotoId} size={40} />
        <View style={styles.who}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {mine && <View style={styles.you}><Text style={styles.youText}>You</Text></View>}
          </View>
          <View style={styles.metaRow} accessible
            accessibilityLabel={[rated ? `${rating} out of 5 stars` : null, when].filter(Boolean).join(', ')}>
            {rated && <Stars rating={rating} size={13} />}
            {!!when && <Text style={styles.when}>{when}</Text>}
          </View>
        </View>
        {!!onMenu && (
          <TouchableOpacity style={styles.menu} hitSlop={4} onPress={onMenu}
            accessibilityRole="button" accessibilityLabel={`More options for ${review.username || 'this'}’s review`}>
            <Ionicons name="ellipsis-horizontal" size={18} color={honey.meta} />
          </TouchableOpacity>
        )}
      </View>
      <ReadMoreText key={review.id} lines={4} style={spot.body}>{review.comment}</ReadMoreText>
      {canVote && !mine ? (
        <TouchableOpacity style={[styles.helpful, voted && styles.helpfulOn]} onPress={onHelpful} disabled={voted}
          accessibilityRole="button" accessibilityState={{ selected: voted, disabled: voted }}
          accessibilityLabel={`Helpful, ${helpful} ${helpful === 1 ? 'person' : 'people'}`}
          accessibilityHint={voted ? undefined : `Marks ${name}’s review as helpful`}>
          <Ionicons name={voted ? 'thumbs-up' : 'thumbs-up-outline'} size={15} color={voted ? honey.accent : honey.meta} />
          <Text style={[styles.helpfulText, voted && styles.helpfulTextOn]}>{helpful ? `Helpful · ${helpful}` : 'Helpful'}</Text>
        </TouchableOpacity>
      ) : helpful > 0 && (
        <Text style={styles.helpfulCount}>{`${helpful} found this helpful`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 14, gap: 8 },
  divider: { borderTopWidth: 1, borderTopColor: honey.cardBorder },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  who: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: honey.ink },
  you: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: honey.inset, borderWidth: 1, borderColor: honey.insetBorder },
  youText: { fontSize: 11, fontWeight: '700', color: honey.accent },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  when: { fontSize: 13, fontWeight: '500', color: honey.meta },
  menu: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  helpful: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34,
    paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: honey.cardBorder,
  },
  helpfulOn: { backgroundColor: honey.inset, borderColor: honey.insetBorder },
  helpfulText: { fontSize: 13, fontWeight: '600', color: honey.meta },
  helpfulTextOn: { color: honey.accent },
  helpfulCount: { fontSize: 13, fontWeight: '500', color: honey.meta },
});
