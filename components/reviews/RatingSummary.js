// The top of the review section: the average in large type with its stars and how many reviews, beside a
// bar for each number of stars. Tapping a bar shows only those reviews; tapping it again shows them all.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { honey, spot } from '../theme';
import Stars from './Stars';

export const reviewCount = count => `${count} review${count === 1 ? '' : 's'}`;

export default function RatingSummary({ average, total, counts, starFilter, onPickStars }) {
  const most = Math.max(1, ...Object.values(counts));
  return (
    <View style={styles.summary}>
      <View style={styles.score} accessible accessibilityLabel={`Rated ${average} out of 5 from ${reviewCount(total)}`}>
        <Text style={styles.average}>{average}</Text>
        <Stars rating={average} size={14} />
        <Text style={styles.total}>{reviewCount(total)}</Text>
      </View>
      <View style={styles.bars}>
        {[5, 4, 3, 2, 1].map(stars => {
          const selected = starFilter === stars;
          const dimmed = !!starFilter && !selected;
          return (
            <TouchableOpacity key={stars} style={styles.barRow} onPress={() => onPickStars(selected ? 0 : stars)}
              accessibilityRole="button" accessibilityState={{ selected }}
              accessibilityLabel={`${stars} star${stars === 1 ? '' : 's'}: ${reviewCount(counts[stars])}`}
              accessibilityHint={selected ? 'Shows every review' : 'Shows only these reviews'}>
              <Text style={[styles.barLabel, selected && styles.barLabelSelected, dimmed && styles.dimmed]}>{stars}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(counts[stars] / most) * 100}%` }, dimmed && styles.dimmed]} />
              </View>
              <Text style={[styles.barCount, selected && styles.barLabelSelected, dimmed && styles.dimmed]}>{counts[stars]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 4 },
  score: { minWidth: 92, alignItems: 'center', gap: 4 },
  average: { fontSize: 44, lineHeight: 50, fontWeight: '800', color: honey.ink, letterSpacing: -1 },
  total: { ...StyleSheet.flatten(spot.meta), fontSize: 13 },
  bars: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  barLabel: { width: 10, fontSize: 13, fontWeight: '700', color: honey.meta, textAlign: 'center' },
  barLabelSelected: { color: honey.accent },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: honey.inset, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: honey.accent },
  barCount: { minWidth: 18, fontSize: 12, fontWeight: '600', color: honey.meta, textAlign: 'right' },
  dimmed: { opacity: 0.35 },
});
