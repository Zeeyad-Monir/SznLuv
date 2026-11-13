// Shared look for the lists, profile and Explore screens. Values are the ones the app already uses.
const { StyleSheet } = require('react-native');

const colors = {
  ink: '#333333',
  page: '#FFF5E4',
  library: '#F5E7D8',
  profile: '#FAF3E0',
  card: '#FFF8DC',
  field: '#FFF9F1',
  fieldBorder: '#00000020',
  label: '#C2B697',
  muted: '#62584E',
  summary: '#30261D',
  hairline: '#DED8D1',
  darkRow: '#2C2C2C',
  danger: '#D24B3A',
  error: '#982D24',
  snackbar: '#323232',
  snackbarAction: '#FFD39B',
  heart: '#FF0000',
  heartIdle: '#A9A9A9',
  segmentTrack: '#FAECD9',
  segmentHighlight: 'rgba(255, 252, 247, 0.83)',
  segmentRim: 'rgba(157, 118, 77, 0.26)',
  // The switch on the library page: segmentTrack 10% darker, as segmentTrack is lighter than `library`.
  librarySegmentTrack: '#E1D4C3',
  white: '#FFFFFF',
  // Spot pages: white cards on the cream page, so sections stand apart instead of blending in.
  surface: '#FFFFFF',
  surfaceBorder: '#EADCC8',
  surfaceInset: '#FFF7EC',
  spotInk: '#2B2420',
  spotBody: '#3A3028',
  spotMeta: '#6B5E52',
};

const GUTTER = 20;
const GRID_GAP = 16;
// Two columns at every phone width.
const tileWidth = screenWidth => Math.floor((screenWidth - 2 * GUTTER - GRID_GAP) / 2);

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
};

// The dark fade under white words on an illustration: clear at the top, darkest behind the words at the bottom.
const artFade = { colors: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.6)'], locations: [0, 0.45, 1] };
// White words on an illustration, with a soft shadow so they hold on its light parts.
const onArt = {
  color: colors.white, textShadowColor: 'rgba(0, 0, 0, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
};
// Corners of the illustrated cards on Home, Explore and the city picker.
const CARD_RADIUS = 16;

const text = StyleSheet.create({
  // The one large line a page opens with ("What sounds good?").
  heroTitle: { fontSize: 37, lineHeight: 43, fontWeight: '800', letterSpacing: -0.6, color: colors.ink },
  pageTitle: { fontSize: 48, fontWeight: '700', color: colors.ink },
  worldTitle: { fontSize: 34, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  sectionLabel: { fontSize: 18, fontWeight: '700', color: colors.label },
  cardName: { fontSize: 22, fontWeight: '700', color: '#000' },
  tileTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, color: colors.summary, lineHeight: 21 },
  meta: { fontSize: 13, fontWeight: '600', color: colors.muted },
  summary: { fontSize: 14, fontWeight: '600', color: colors.summary },
});

const controls = StyleSheet.create({
  primary: {
    minHeight: 48, borderRadius: 12, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink,
  },
  primaryDisabled: { backgroundColor: '#6F6963' },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondary: {
    minHeight: 48, borderRadius: 12, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  field: {
    minHeight: 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: '#262321',
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
});

// One section card on a spot page (About, Location, Weather, Reviews), the same for every kind of spot.
const spot = StyleSheet.create({
  section: {
    marginTop: 16, padding: 16, gap: 10, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    shadowColor: '#5A3E22', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  heading: { fontSize: 18, fontWeight: '700', color: colors.spotInk },
  body: { fontSize: 15, lineHeight: 22, color: colors.spotBody },
  label: { fontSize: 14, fontWeight: '700', color: colors.spotInk },
  meta: { fontSize: 14, fontWeight: '500', color: colors.spotMeta },
});

module.exports = { colors, GUTTER, GRID_GAP, CARD_RADIUS, tileWidth, cardShadow, artFade, onArt, text, controls, spot };
