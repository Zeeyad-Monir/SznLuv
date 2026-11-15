// "Add Your Own Spot" on the Saved pages: a soft card over the pink-and-green hills illustration, which sits
// to the right so the words stay on its pale sky. The picture is at half strength so it reads as a soft
// backdrop, not a photo; the arrow has its own light disc where it crosses the trees.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Art from './Art';
import PressableScale from './PressableScale';
import { ADD_SPOT_ART } from './covers';
import { cardShadow, colors } from './theme';

export default function AddOwnSpotBanner({ onPress, style }) {
  return (
    <PressableScale style={[styles.card, style]} contentStyle={styles.surface} onPress={onPress}
      accessibilityLabel="Add Your Own Spot" accessibilityHint="Pin a place that isn't on SznLuv yet">
      <Art source={ADD_SPOT_ART} style={styles.art} contentPosition="right bottom" />
      <View style={styles.row}>
        <Icon name="add-location-alt" size={24} color={colors.ink} accessible={false} importantForAccessibility="no" />
        <Text style={styles.label} numberOfLines={1}>Add Your Own Spot</Text>
        <View style={styles.arrow}>
          <Icon name="arrow-forward" size={20} color={colors.ink} accessible={false} importantForAccessibility="no" />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // A solid fill under the shadow lets iOS draw it cheaply.
  card: { borderRadius: 18, backgroundColor: colors.card, ...cardShadow },
  surface: { minHeight: 68, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card, justifyContent: 'center' },
  art: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 12, paddingVertical: 12 },
  label: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink },
  arrow: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 252, 246, 0.85)',
  },
});
