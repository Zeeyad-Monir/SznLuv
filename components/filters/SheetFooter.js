// The bottom of a filter or sort sheet: an optional hint, then Reset beside Apply.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import shared from './styles';

export default function SheetFooter({ hint, resetLabel = 'Reset', applyLabel = 'Apply', onReset, onApply, canApply = true }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(12, bottom) }]}>
      {!!hint && <Text style={shared.hint} accessibilityLiveRegion="polite">{hint}</Text>}
      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.reset]} onPress={onReset}>
          <Text style={shared.actionText}>{resetLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canApply }} disabled={!canApply}
          style={[styles.button, styles.apply, !canApply && styles.applyDisabled]} onPress={onApply}>
          <Text style={styles.applyText}>{applyLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 12, gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: {
    flexGrow: 1, flexBasis: '40%', minHeight: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
  },
  reset: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.optionBorder },
  apply: { backgroundColor: colors.ink },
  applyDisabled: { backgroundColor: colors.disabledInk },
  applyText: { color: colors.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
