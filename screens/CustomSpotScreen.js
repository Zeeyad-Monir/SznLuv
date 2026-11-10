// The page for a spot someone added themselves: its name, where it is, a map, directions.
// Opened with { spot } (an own-spot reference) and optionally { addedBy } (a username).
import React from 'react';
import { Animated, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSnackbar } from '../components/Snackbar';
import { colors, controls, text } from '../components/theme';
import useAfterTransition from '../hooks/useAfterTransition';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { describeWhere, resolveSpot } from '../services/catalogue';
import { directionsUrl } from '../services/directions';

export default function CustomSpotScreen({ navigation, route }) {
  const { spot: ref, addedBy } = route.params;
  const spot = resolveSpot(ref);
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const mapReady = useAfterTransition();
  const entrance = useEntrance(2);
  const hasPin = spot.latitude !== undefined;
  const url = directionsUrl({ latitude: spot.latitude, longitude: spot.longitude, address: ref.address }, Platform.OS);

  const openDirections = () => Linking.openURL(url).catch(() => snackbar.show({ message: 'Couldn’t open Maps.' }));

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView contentContainerStyle={floatingScrollStyle}>
        <Animated.View style={entrance[0]}>
          <Text style={styles.title} accessibilityRole="header">{spot.name}</Text>
          <Text style={[text.summary, styles.where]}>{describeWhere(ref) || 'No location given'}</Text>
          {!!addedBy && <Text style={[text.meta, styles.addedBy]}>Added by {addedBy}</Text>}
        </Animated.View>

        <Animated.View style={entrance[1]}>
          {hasPin && (
            <View style={styles.mapFrame}>
              {mapReady && (
                <MapView style={styles.fill} initialRegion={{
                  latitude: spot.latitude, longitude: spot.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03,
                }}>
                  <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} title={spot.name} />
                </MapView>
              )}
            </View>
          )}
          <View style={styles.actions}>
            {!!url && (
              <TouchableOpacity style={[controls.primary, styles.action]} accessibilityRole="button" onPress={openDirections}>
                <Ionicons name="navigate" size={18} color={colors.white} />
                <Text style={controls.primaryText}>Directions</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[controls.secondary, styles.action]} accessibilityRole="button"
              onPress={() => navigation.navigate('AddToList', { spot: ref })}>
              <Ionicons name="add" size={20} color={colors.ink} />
              <Text style={controls.secondaryText}>Add to list</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: '700', color: colors.ink },
  where: { marginTop: 8 },
  addedBy: { marginTop: 4 },
  mapFrame: { height: 240, marginTop: 20, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  action: { flex: 1, flexDirection: 'row', gap: 6 },
});
