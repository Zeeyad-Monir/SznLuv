// A section of a filter sheet: a heading, an optional control beside it, then its content.
// Every sheet uses it, so sections are spaced and divided the same way everywhere.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function FilterSection({ title, accessory, children, onLayout, first }) {
  return (
    <View style={[styles.section, first && styles.first]} onLayout={onLayout}>
      {(!!title || !!accessory) && (
        <View style={styles.header}>
          {!!title && <Text accessibilityRole="header" style={styles.title}>{title}</Text>}
          {accessory}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
  },
  first: { borderTopWidth: 0, paddingTop: 4 },
  header: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.heading, fontSize: 17, fontWeight: '700' },
});
