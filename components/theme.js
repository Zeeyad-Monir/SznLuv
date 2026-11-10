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
  white: '#FFFFFF',
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

const text = StyleSheet.create({
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

module.exports = { colors, GUTTER, GRID_GAP, tileWidth, cardShadow, text, controls };
