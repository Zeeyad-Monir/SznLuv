// One choice in a filter or sort sheet: a pill that fills with ink when it is chosen.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

export default function FilterOption({ label, selected, onPress }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={[styles.option, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 44, maxWidth: '100%', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 22, borderWidth: 1, borderColor: colors.optionBorder, backgroundColor: colors.field,
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  label: { color: colors.optionText, fontSize: 14, fontWeight: '600' },
  selectedLabel: { color: colors.white },
});
