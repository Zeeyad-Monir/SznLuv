// Pins on the Map tab: one dot per saved spot, and a counted bubble where several sit too close to tell apart.
// Each sits in a 44pt target so it is easy to tap, and none of them redraws while the map moves.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '../theme';

const centre = { x: 0.5, y: 0.5 };
// A marker press also reaches the map as a press; stopping it here keeps the preview from closing again.
const pressed = (event, run) => { event?.stopPropagation?.(); run(); };

export function SpotMapMarker({ spot, selected, onPress }) {
  return (
    <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} anchor={centre}
      tracksViewChanges={false} zIndex={selected ? 3 : 1} onPress={event => pressed(event, () => onPress(spot))}
      testID={`map-pin:${spot.key}`} accessibilityRole="button" accessibilityState={{ selected }}
      accessibilityLabel={`${spot.name}. Saved spot`} accessibilityHint="Shows a preview">
      <View style={styles.target}>
        <View style={[styles.pin, selected && styles.pinSelected]} />
      </View>
    </Marker>
  );
}

export function ClusterMarker({ cluster, onPress }) {
  const wide = cluster.count > 99;
  return (
    <Marker coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }} anchor={centre}
      tracksViewChanges={false} zIndex={2} onPress={event => pressed(event, () => onPress(cluster))}
      testID={`map-cluster:${cluster.count}`} accessibilityRole="button"
      accessibilityLabel={`${cluster.count} saved spots here`} accessibilityHint="Zooms in to show them">
      <View style={styles.target}>
        <View style={[styles.cluster, wide && styles.clusterWide]}>
          <Text style={styles.count} allowFontScaling={false}>{wide ? '99+' : cluster.count}</Text>
        </View>
      </View>
    </Marker>
  );
}

const rim = {
  borderColor: colors.white,
  shadowColor: '#3A2A1C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3,
};

const styles = StyleSheet.create({
  target: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, backgroundColor: colors.danger, ...rim },
  // The chosen pin grows and takes the app's ink outline, so it reads as selected without a new colour.
  pinSelected: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: colors.ink },
  cluster: {
    minWidth: 34, height: 34, paddingHorizontal: 6, borderRadius: 17, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger, ...rim,
  },
  clusterWide: { minWidth: 42 },
  count: { color: colors.white, fontSize: 14, fontWeight: '800' },
});
