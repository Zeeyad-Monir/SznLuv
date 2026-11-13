// Home's large card: one collection picked out, as an illustration with its title and a line beneath.
// The whole card is one button; the arrow only shows that it opens something.
import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collectionArt } from './covers';
import PressableScale from './PressableScale';
import { CARD_RADIUS, artFade, cardShadow, colors, onArt } from './theme';

const PLAIN = '#B98A5E';

export default function FeaturedCollectionCard({ featured, height, onPress }) {
  const art = collectionArt(featured.art);
  const words = (
    <>
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={artFade.colors} locations={artFade.locations} />
      <View style={styles.row}>
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={2}>{featured.title}</Text>
          {!!featured.subtitle && <Text style={styles.subtitle} numberOfLines={2}>{featured.subtitle}</Text>}
        </View>
        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={22} color={colors.white} />
        </View>
      </View>
    </>
  );
  return (
    <PressableScale style={[styles.card, { minHeight: height }]} contentStyle={styles.surface} onPress={onPress}
      accessibilityLabel={`Featured: ${featured.title}. ${featured.subtitle ?? ''}`.trim()}>
      {art ? (
        <ImageBackground source={art} style={styles.fill} imageStyle={styles.image}>{words}</ImageBackground>
      ) : <View style={styles.fill}>{words}</View>}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS, ...cardShadow },
  // The plain colour shows only if the illustration is missing.
  surface: { borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: PLAIN },
  fill: { flexGrow: 1, justifyContent: 'flex-end' },
  image: { borderRadius: CARD_RADIUS },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 18, paddingTop: 72 },
  words: { flex: 1 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: '700', letterSpacing: -0.3, ...onArt },
  subtitle: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: '600', ...onArt },
  arrow: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.28)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255, 255, 255, 0.6)',
  },
});
