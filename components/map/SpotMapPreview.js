// The small card that floats above the chosen pin: the spot's name, how far it is, and a nudge to open it.
// It is drawn as a marker of its own, so it stays fixed to the pin while the map is dragged or zoomed.
//
// A marker is placed by its centre on iOS, so the card's height has to be known before it is drawn rather than
// measured afterwards. It is worked out from what the card holds: one or two lines of name, and the distance
// line when there is one.
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { colors } from '../theme';

const WIDTH = 236;
const PADDING = 10;
const NAME_LINE = 20;
const DISTANCE_LINE = 18;
const HINT_LINE = 17;
const GAP = 2;
const TIP = 7; // How far the pointer hangs below the card
// How far above the pin's centre the pointer stops: clear of the selected pin.
export const PREVIEW_LIFT = 14;
// About how many letters of a name fit on one line of the card. Longer names get the second line.
const ONE_LINE = 19;

const nameLines = name => (String(name).length > ONE_LINE ? 2 : 1);
const cardHeight = (name, distance) => 2 * PADDING + 2 + nameLines(name) * NAME_LINE
  + (distance ? GAP + DISTANCE_LINE : 0) + GAP + HINT_LINE;
// The most room the card ever takes, for keeping it on screen (services/mapGeometry.js nudgeIntoFrame).
export const PREVIEW_CARD = { width: WIDTH, height: cardHeight('x'.repeat(ONE_LINE + 1), true) + TIP };

const bottomCentre = { x: 0.5, y: 1 };

export default function SpotMapPreview({ spot, distance, onPress }) {
  const lines = nameLines(spot.name);
  const height = cardHeight(spot.name, distance);
  const label = [spot.name, distance].filter(Boolean).join(', ');
  return (
    <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} zIndex={10}
      // Android anchors a marker by its bottom edge; iOS centres it, so it is lifted by half its height.
      anchor={bottomCentre} centerOffset={{ x: 0, y: -((height + TIP) / 2 + PREVIEW_LIFT) }}
      onPress={event => { event?.stopPropagation?.(); onPress(spot); }}
      testID="map-preview" accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens this spot’s page">
      <View style={[styles.wrap, { height: height + TIP + (Platform.OS === 'android' ? PREVIEW_LIFT : 0) }]}>
        <View style={[styles.tip, { top: height - TIP }]} />
        <View style={[styles.card, { height }]}>
          <View style={styles.words}>
            <Text style={styles.name} numberOfLines={lines} ellipsizeMode="tail" allowFontScaling={false}>{spot.name}</Text>
            {!!distance && <Text style={styles.distance} numberOfLines={1} allowFontScaling={false}>{distance}</Text>}
            <Text style={styles.hint} numberOfLines={1} allowFontScaling={false}>Tap for more details</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { width: WIDTH },
  card: {
    width: WIDTH, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: PADDING, paddingLeft: 14, paddingRight: 10, borderRadius: 16,
    backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: colors.surfaceBorder,
    shadowColor: '#62472D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 9, elevation: 5,
  },
  words: { flex: 1, gap: GAP },
  name: { fontSize: 16, lineHeight: NAME_LINE, fontWeight: '700', color: colors.ink },
  distance: { fontSize: 14, lineHeight: DISTANCE_LINE, fontWeight: '600', color: colors.summary },
  hint: { fontSize: 13, lineHeight: HINT_LINE, fontWeight: '500', color: colors.muted },
  // A square turned on its corner, tucked under the card, makes the pointer.
  tip: {
    position: 'absolute', left: WIDTH / 2 - TIP, width: 2 * TIP, height: 2 * TIP, borderBottomRightRadius: 3,
    transform: [{ rotate: '45deg' }], backgroundColor: '#FFFCF7', borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.surfaceBorder,
  },
});
