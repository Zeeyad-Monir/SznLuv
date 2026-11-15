// The frame the two Saved "View all" pages share: a title and the search row that stay put, and the list
// that scrolls beneath them.
import { StyleSheet } from 'react-native';
import { GUTTER, colors } from './theme';
import { SCREEN_CONTENT_TOP_GAP } from '../navigation/topNavigationLayout';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  header: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, marginBottom: 16 },
  count: { marginTop: 16, marginBottom: 12, fontSize: 14, fontWeight: '600', color: colors.muted },
  body: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 24 },
});
