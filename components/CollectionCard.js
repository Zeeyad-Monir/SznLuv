// A collection the app makes (a season today): its art, title and how many ideas it holds.
// Tapping the card opens the collection; the heart in the corner keeps it in My lists. The heart sits
// beside the card's touchable rather than inside it, so tapping the heart never opens the collection.
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HeartButton from './HeartButton';
import { colors } from './theme';

export default function CollectionCard({ title, count, art, saved, onPress, onToggleSave, accessibilityLabel }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.touchable} onPress={onPress} accessible accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}>
        <ImageBackground source={art} style={styles.image} imageStyle={styles.imageInner}>
          <View style={styles.words}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{count} Active Ideas</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
      <HeartButton style={styles.heart} saved={saved} onPress={onToggleSave} size={24} hitSlop={6} idleColor={colors.muted}
        label={saved ? `Remove ${title} collection from My lists` : `Save ${title} collection to My lists`} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', height: 160, marginBottom: 24 },
  touchable: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  image: { flex: 1, justifyContent: 'flex-start' },
  imageInner: { borderRadius: 12, opacity: 1 },
  words: { paddingHorizontal: 20, paddingTop: 20, paddingRight: 64 },
  title: { fontSize: 35, fontWeight: 'bold', color: colors.white },
  subtitle: { marginTop: 2, fontSize: 14, fontWeight: 'bold', color: colors.white },
  // 40pt badge plus a 6pt reach on every side: a 52pt target that can't be mistaken for the card.
  heart: {
    position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
