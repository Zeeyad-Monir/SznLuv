// The small things that float over the map: a one-line pill under the search bar, the card shown when there
// is nothing to pin, and the round button that brings the map back to where you are.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, controls } from '../theme';

// Shared by everything that floats: the tab bar's warm shadow, a little lighter.
export const floating = {
  shadowColor: '#62472D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4,
};

// "No saved spots in this area · Show saved spots". `busy` swaps the action for a spinner.
export function MapPill({ message, actionLabel, onAction, busy = false, alert = false }) {
  return (
    <View style={[styles.pill, floating]} accessibilityRole={alert ? 'alert' : undefined}>
      {busy && <ActivityIndicator size="small" color={colors.ink} />}
      <Text style={styles.pillText} accessibilityLiveRegion="polite">{message}</Text>
      {!!actionLabel && (
        <TouchableOpacity style={styles.pillAction} accessibilityRole="button" onPress={onAction}>
          <Text style={styles.pillActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// `actions`: [{ label, onPress, primary }]. One primary action is a full button; the rest are text links.
export function MapCard({ icon, title, text, actions = [] }) {
  const links = actions.filter(action => !action.primary);
  return (
    <View style={[styles.card, floating]}>
      {!!icon && <Icon name={icon} size={26} color={colors.muted} accessible={false} importantForAccessibility="no" />}
      <Text style={styles.cardTitle} accessibilityRole="header">{title}</Text>
      {!!text && <Text style={styles.cardText}>{text}</Text>}
      {links.length > 0 && (
        <View style={styles.links}>
          {links.map(({ label, onPress }) => (
            <TouchableOpacity key={label} style={styles.link} accessibilityRole="button" onPress={onPress}>
              <Text style={styles.linkText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {actions.filter(action => action.primary).map(({ label, onPress }) => (
        <TouchableOpacity key={label} style={[controls.primary, styles.cardButton]} accessibilityRole="button" onPress={onPress}>
          <Text style={controls.primaryText}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Recentres on the user. With location off it offers to turn it on instead, and says so to a screen reader.
export function MapLocationButton({ locationOn, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.round, floating, style]} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={locationOn ? 'Centre the map on my location' : 'Turn on location'}>
      <Ionicons name={locationOn ? 'locate' : 'locate-outline'} size={24} color={locationOn ? colors.ink : colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center', maxWidth: '100%', minHeight: 44, paddingLeft: 16, paddingRight: 6, borderRadius: 22,
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  pillText: { flexShrink: 1, paddingRight: 10, fontSize: 14, fontWeight: '600', color: colors.summary },
  pillAction: { minHeight: 44, marginLeft: -10, paddingHorizontal: 10, justifyContent: 'center' },
  pillActionText: { fontSize: 14, fontWeight: '800', color: colors.ink, textDecorationLine: 'underline' },
  card: {
    alignItems: 'center', gap: 8, padding: 22, borderRadius: 18,
    backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  cardTitle: { fontSize: 19, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  cardText: { fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  cardButton: { marginTop: 8, alignSelf: 'stretch' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  link: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.summary, textDecorationLine: 'underline' },
  round: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
});
