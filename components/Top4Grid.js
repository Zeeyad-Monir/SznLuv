// Top 4: a person's favourite spots in a city, as a two-by-two grid of named tiles.
// The owner also sees open slots to fill; a visitor sees only the picks that exist.
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from './PressableScale';
import StoragePhoto from './StoragePhoto';
import spotImages from '../screens/spotImages';
import { resolveSpot } from '../services/catalogue';
import { MAX_PICKS } from '../services/top4State';
import { GRID_GAP, artFade, colors, liftShadow, onArt } from './theme';

// A tile shows the place's cover photo when it has one; otherwise it takes the colour of its spot's season,
// and a place someone added themselves is cream.
const SEASON_TINT = { Fall: '#FFA571', Winter: '#BBCDEC', Spring: '#FFC1E3', Summer: '#F8DD74' };
const RADIUS = 15;
// The light catching the top-left corner, so a tile reads as glazed rather than flat.
const GLAZE = ['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0)'];
// Over a photo the glaze is fainter, so it adds a sheen without washing the picture out.
const PHOTO_GLAZE = ['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0)'];

// The place's own cover: the bundled photo of a catalogue spot, or the first photo of a place you added
// (only on your own profile, where your spots are already loaded). Null keeps the season colour.
function coverFor(spot, ref, ownSpots) {
  if (!spot.own) return Object.hasOwn(spotImages, spot.name) ? { source: spotImages[spot.name] } : null;
  const path = ownSpots?.[ref.id]?.photos?.[0]?.path;
  return path ? { path } : null;
}

export default function Top4Grid({ picks, size, editable = false, onPressPick, onAdd, ownSpots }) {
  const empty = editable ? Math.max(0, MAX_PICKS - picks.length) : 0;
  // With nothing picked yet, the open slots are shorter so the profile isn't four large blanks.
  const emptyHeight = picks.length ? size : Math.round(size * 0.55);
  const press = (ref, index) => {
    if (Platform.OS === 'ios') selectionAsync().catch(() => {});
    onPressPick(ref, index);
  };
  return (
    <View style={styles.grid}>
      {picks.map((ref, index) => {
        const spot = resolveSpot(ref);
        const tint = SEASON_TINT[spot.season] ?? colors.card;
        const cover = coverFor(spot, ref, ownSpots);
        // Sized to the tile, as the spot card's thumbnail is: without a size a bundled image takes its own pixel size
        // and shows only its top-left corner. With one, "cover" fills the square and crops evenly around the centre.
        const frame = [styles.photo, { width: size, height: size }];
        const photo = cover && (cover.source
          ? <Image source={cover.source} style={frame} resizeMode="cover" accessible={false} />
          : <StoragePhoto path={cover.path} style={frame} fallback={<View />} />);
        return (
          <PressableScale key={spot.key} onPress={() => press(ref, index)}
            style={[styles.tile, { width: size, height: size }]}
            contentStyle={[styles.face, { backgroundColor: tint }]}
            accessibilityLabel={`Number ${index + 1}: ${spot.name}${spot.meta ? `, ${spot.meta}` : ''}`}>
            {photo}
            {!!photo && <LinearGradient pointerEvents="none" colors={artFade.colors} locations={artFade.locations} style={StyleSheet.absoluteFill} />}
            <LinearGradient pointerEvents="none" colors={photo ? PHOTO_GLAZE : GLAZE} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rim]} />
            <Text style={[styles.rank, photo && styles.rankOnArt]} accessible={false}>{index + 1}</Text>
            {spot.own && <Ionicons name="location-sharp" size={18} color={photo ? colors.white : colors.ink} style={styles.pin} />}
            <Text style={[styles.name, photo && onArt]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>{spot.name}</Text>
            {!!spot.meta && <Text style={[styles.meta, photo && onArt]} numberOfLines={1}>{spot.locality || spot.meta}</Text>}
          </PressableScale>
        );
      })}
      {Array.from({ length: empty }, (_, index) => (
        <TouchableOpacity key={`empty-${index}`} style={[styles.empty, { width: size, height: emptyHeight }]} activeOpacity={0.7}
          onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a pick">
          <Text style={[styles.ghost, !picks.length && styles.ghostShort]} accessible={false}>{picks.length + index + 1}</Text>
          <Ionicons name="add" size={30} color={colors.ink} />
          <Text style={styles.emptyText}>Add pick</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: GRID_GAP },
  tile: { borderRadius: RADIUS, marginBottom: 16, ...liftShadow },
  face: { borderRadius: RADIUS, padding: 14, justifyContent: 'flex-end', overflow: 'hidden' },
  photo: { position: 'absolute', top: 0, left: 0 },
  rim: { borderRadius: RADIUS, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.55)' },
  rank: { position: 'absolute', top: -6, right: 10, fontSize: 86, fontWeight: '800', color: 'rgba(255, 255, 255, 0.5)' },
  // On a photo the numeral keeps its soft white but gains a shadow so it holds on light pictures.
  rankOnArt: { color: 'rgba(255, 255, 255, 0.62)', textShadowColor: 'rgba(0, 0, 0, 0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  pin: { position: 'absolute', top: 12, left: 12 },
  name: { fontSize: 17, fontWeight: '700', color: colors.ink },
  meta: { marginTop: 2, fontSize: 13, fontWeight: '600', color: colors.summary },
  empty: {
    borderRadius: RADIUS, marginBottom: 16, alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden',
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9A88F', backgroundColor: 'rgba(255, 249, 241, 0.6)',
  },
  // The number the slot will hold, faint, in the same large type as a filled tile's rank.
  ghost: { position: 'absolute', top: -6, right: 10, fontSize: 86, fontWeight: '800', color: 'rgba(185, 168, 143, 0.2)' },
  ghostShort: { top: -8, fontSize: 60 },
  emptyText: { fontSize: 15, fontWeight: '700', color: colors.ink },
});
