// The small card that floats above the chosen pin: the spot's name, how far it is, and an arrow to open it.
// It is drawn as a marker of its own, so it stays fixed to the pin while the map is dragged or zoomed.
// The Map tab and the map on a list or collection both use it; the list's map shows no distance.
//
// A marker is placed by its centre on iOS, so the card's height has to be known before it is drawn rather than
// measured afterwards. It is worked out from what the card holds: one or two lines of name, and the distance
// line when there is one.
//
// The name never takes more than two lines, and is never drawn smaller than SPOT_NAME_MIN_SIZE (which is its
// normal size here): one too long for two lines ends in "…"; the spot's own page, a tap away, has it in full.
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { SPOT_NAME_MIN_SIZE, colors } from '../theme';

const WIDTH = 236;
const PADDING = 10;
const NAME_LINE = 20;
const DISTANCE_LINE = 18;
const GAP = 2;
const TIP = 7; // How far the pointer hangs below the card
// How far above the pin's centre the pointer stops: clear of the selected pin.
export const PREVIEW_LIFT = 14;
// About how many letters of a name fit on one line of the card at the normal size.
const ONE_LINE = 19;
export const NAME_MAX_LINES = 2; // The name never runs past this many lines
const NAME_SIZE = SPOT_NAME_MIN_SIZE;

// How many lines a name wraps to with `perLine` letters a line: whole words move down, and a word longer
// than a line is broken across lines.
const linesFor = (name, perLine) => {
  let lines = 1;
  let used = 0;
  for (const word of String(name).split(/\s+/).filter(Boolean)) {
    const needed = used ? used + 1 + word.length : word.length;
    if (needed <= perLine) { used = needed; continue; }
    if (used) lines += 1;
    lines += Math.ceil(word.length / perLine) - 1;
    used = word.length % perLine || perLine;
  }
  return lines;
};

// How the name is drawn: its number of lines. Past the last line it ends in "…".
export const nameFit = name => ({ lines: Math.min(NAME_MAX_LINES, linesFor(name, ONE_LINE)) });
const nameHeight = ({ lines }) => lines * NAME_LINE;
const cardHeight = (name, distance) => 2 * PADDING + 2 + nameHeight(nameFit(name))
  + (distance ? GAP + DISTANCE_LINE : 0);
// The most room the card ever takes, for keeping it on screen (services/mapGeometry.js nudgeIntoFrame).
export const previewCardSize = ({ distance = true } = {}) => (
  // Two lines is the tallest a name gets: one that needs more ends in "…".
  { width: WIDTH, height: cardHeight(`${'x'.repeat(ONE_LINE)} x`, distance) + TIP });
export const PREVIEW_CARD = previewCardSize();

const bottomCentre = { x: 0.5, y: 1 };

export default function SpotMapPreview({ spot, distance, onPress }) {
  const fit = nameFit(spot.name);
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
            <Text style={styles.name} numberOfLines={fit.lines} ellipsizeMode="tail" allowFontScaling={false}>{spot.name}</Text>
            {!!distance && <Text style={styles.distance} numberOfLines={1} allowFontScaling={false}>{distance}</Text>}
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
  name: { fontSize: NAME_SIZE, lineHeight: NAME_LINE, fontWeight: '700', color: colors.ink },
  distance: { fontSize: 14, lineHeight: DISTANCE_LINE, fontWeight: '600', color: colors.summary },
  // A square turned on its corner, tucked under the card, makes the pointer.
  tip: {
    position: 'absolute', left: WIDTH / 2 - TIP, width: 2 * TIP, height: 2 * TIP, borderBottomRightRadius: 3,
    transform: [{ rotate: '45deg' }], backgroundColor: '#FFFCF7', borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.surfaceBorder,
  },
});
