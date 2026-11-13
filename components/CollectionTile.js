// A card in Home's "Browse collections" grid: an illustration with the collection's name across the top.
// A collection with nothing in it yet is drawn faded with a "Coming soon" label and is not a button, so
// it never opens an empty page.
import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collectionArt } from './covers';
import PressableScale from './PressableScale';
import { CARD_RADIUS, cardShadow, colors, onArt } from './theme';

// Darkest at the top, behind the name.
const TITLE_FADE = ['rgba(0, 0, 0, 0.42)', 'rgba(0, 0, 0, 0.08)', 'rgba(0, 0, 0, 0)'];
const PLAIN = '#B98A5E';

export default function CollectionTile({ collection, width, height, onPress }) {
  const art = collectionArt(collection.art);
  const soon = !collection.available;
  // The Seasonal cover gets the same faded look as the city covers (see CityCard).
  const faded = collection.art === 'seasonal' && !!art;
  const face = (
    <>
      {faded && <View pointerEvents="none" style={styles.wash} />}
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={TITLE_FADE} locations={[0, 0.55, 1]} />
      {soon && <View pointerEvents="none" style={styles.veil} />}
      <Text style={styles.title} numberOfLines={2}>{collection.title}</Text>
      {soon && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming soon</Text>
        </View>
      )}
    </>
  );
  const picture = art ? (
    <ImageBackground source={art} style={styles.fill} imageStyle={faded ? styles.fadedImage : styles.image}>{face}</ImageBackground>
  ) : <View style={styles.fill}>{face}</View>;

  if (soon) {
    return (
      <View style={[styles.card, styles.surface, faded && styles.fadedSurface, { width, minHeight: height }]} accessible accessibilityRole="text"
        accessibilityLabel={`${collection.title}, coming soon`}>
        {picture}
      </View>
    );
  }
  return (
    <PressableScale style={[styles.card, cardShadow, { width, minHeight: height }]} contentStyle={[styles.surface, faded && styles.fadedSurface]}
      onPress={onPress} accessibilityLabel={`${collection.title} collection`}>
      {picture}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS },
  // The plain colour shows only if the illustration is missing.
  surface: { borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: PLAIN },
  fill: { flexGrow: 1, justifyContent: 'space-between', padding: 14 },
  image: { borderRadius: CARD_RADIUS },
  fadedImage: { borderRadius: CARD_RADIUS, opacity: 0.9 },
  fadedSurface: { backgroundColor: colors.library },
  // Thin white layer over the image to wash out the colours a little, as on the city covers.
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  title: { fontSize: 22, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2, ...onArt },
  // A cream wash that sets the card back from the ones that open.
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 245, 228, 0.5)' },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});
