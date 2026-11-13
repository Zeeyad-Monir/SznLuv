// A city on the city picker: its illustration with the name over it, and a tick once it is the one chosen.
// One of a set of radio buttons: tapping it only selects, and the picker's button confirms.
import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CITY_ART } from './covers';
import PressableScale from './PressableScale';
import { CARD_RADIUS, colors } from './theme';

export default function CityCard({ city, selected, current, disabled, onPress }) {
  const art = CITY_ART[city.id];
  const words = (
    <>
      {/* Thin white layer over the image to wash out the colours a little */}
      {!!art && <View style={styles.wash} pointerEvents="none" />}
      <Text style={[styles.name, !art && styles.nameOnPlain]} numberOfLines={2}>{city.name}</Text>
      {current && (
        <View style={styles.current}>
          <Text style={styles.currentText}>Current city</Text>
        </View>
      )}
    </>
  );
  return (
    <PressableScale style={styles.card} contentStyle={styles.surface} onPress={onPress} disabled={disabled}
      accessibilityRole="radio" accessibilityState={{ selected, checked: selected, disabled: !!disabled }}
      accessibilityLabel={current ? `${city.name}, your current city` : city.name}>
      {art ? (
        <ImageBackground source={art} style={styles.fill} imageStyle={styles.image}>{words}</ImageBackground>
      ) : <View style={styles.fill}>{words}</View>}
      <View pointerEvents="none" style={[styles.ring, selected && styles.ringSelected]} />
      <View pointerEvents="none" style={[styles.tick, selected && styles.tickSelected]}>
        {selected && <Ionicons name="checkmark" size={20} color={colors.white} />}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 160 },
  surface: { borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: colors.library },
  fill: { flexGrow: 1, minHeight: 160, padding: 20 },
  image: { borderRadius: CARD_RADIUS, opacity: 0.9 },
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  // Room on the right for the tick.
  name: {
    paddingRight: 44, fontSize: 35, fontWeight: 'bold', color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  nameOnPlain: { color: colors.ink, textShadowColor: 'transparent' },
  current: {
    position: 'absolute', left: 16, bottom: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  currentText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  ring: { ...StyleSheet.absoluteFillObject, borderRadius: CARD_RADIUS, borderWidth: 3, borderColor: 'transparent' },
  ringSelected: { borderColor: colors.ink },
  tick: {
    position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)', borderWidth: 2, borderColor: colors.white,
  },
  tickSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
});
