// The cream "nothing here yet" card, in the same shape as the season screens' empty search state.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, controls } from './theme';

export default function EmptyCard({ icon, title, text, actionLabel, onAction, style }) {
  return (
    <View style={[styles.card, style]}>
      {!!icon && <Icon name={icon} size={26} color={colors.muted} accessible={false} importantForAccessibility="no" />}
      {!!title && <Text style={styles.title} accessibilityRole="header">{title}</Text>}
      {!!text && <Text style={styles.text}>{text}</Text>}
      {!!actionLabel && (
        <TouchableOpacity style={[controls.primary, styles.action]} accessibilityRole="button" onPress={onAction}>
          <Text style={controls.primaryText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 14, backgroundColor: colors.field },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  action: { marginTop: 8, alignSelf: 'stretch' },
});
