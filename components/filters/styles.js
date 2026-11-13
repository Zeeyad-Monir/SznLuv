// The small pieces every filter sheet shares: hints, inline text actions, errors and the sheet body.
import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export default StyleSheet.create({
  body: { flex: 1 },
  bodyContent: { paddingBottom: 16 },
  hint: { fontSize: 14, lineHeight: 20, color: colors.muted },
  error: { fontSize: 14, lineHeight: 20, color: colors.error },
  emphasis: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.optionText },
  actionText: { fontSize: 15, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  underlined: { textDecorationLine: 'underline' },
  muted: { color: '#756F68' },
  inlineAction: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingVertical: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, color: colors.inputText,
    borderWidth: 1, borderColor: colors.optionBorder, borderRadius: 22, backgroundColor: colors.field,
  },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, color: colors.heading, fontSize: 16, fontWeight: '600' },
});
