// A section of the Saved page: its name, how many things are in it, and "View all" to open the full page.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from './theme';

export default function SavedSectionHeader({ title, subtitle, viewAllCount, onViewAll, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.words}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {viewAllCount > 0 && (
        <TouchableOpacity style={styles.pill} onPress={onViewAll} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button" accessibilityLabel={`View all ${viewAllCount} ${title.toLowerCase()}`}>
          <Text style={styles.pillText}>View all ({viewAllCount})</Text>
          <Icon name="arrow-forward" size={16} color={colors.ink} accessible={false} importantForAccessibility="no" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 17 },
  words: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, color: colors.ink },
  subtitle: { marginTop: 2, fontSize: 14, fontWeight: '500', color: colors.muted },
  pill: {
    minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: colors.field, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.fieldBorder,
  },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.ink },
});
