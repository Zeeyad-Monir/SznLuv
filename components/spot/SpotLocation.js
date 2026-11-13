import React, { useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import useAfterTransition from '../../hooks/useAfterTransition';
import { SettingsContext } from '../../screens/SettingsContext';
import { GOOGLE_MAPS_APIKEY } from '../../services/apiKeys';
import { hasCoordinates } from '../../services/spotDiscovery';
import { useSnackbar } from '../Snackbar';
import { honey, spot } from '../theme';

export default function SpotLocation({ name, address, latitude, longitude, previewRoute }) {
  const { isLocationEnabled } = useContext(SettingsContext);
  const snackbar = useSnackbar();
  const mapReady = useAfterTransition();
  const [origin, setOrigin] = useState(null);
  const [message, setMessage] = useState(null);
  const destination = { latitude, longitude };
  const hasPin = hasCoordinates(destination);
  const preview = previewRoute && hasPin && isLocationEnabled;

  useFocusEffect(useCallback(() => {
    setOrigin(null);
    setMessage(null);
    if (!preview) return undefined;
    let active = true;
    let tracking;
    const start = async () => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!active) return;
      if (!granted) {
        setMessage('Permission to access location was denied.');
        return;
      }
      tracking = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1600 },
        ({ coords }) => {
          if (active && hasCoordinates(coords)) setOrigin({ latitude: coords.latitude, longitude: coords.longitude });
        },
      );
      if (!active) tracking.remove();
    };
    start().catch(() => {
      if (active) setMessage('Your current location is unavailable.');
    });
    return () => {
      active = false;
      tracking?.remove();
    };
  }, [preview, latitude, longitude]));

  const copyAddress = () => Clipboard.setStringAsync(address)
    .then(() => snackbar.show({ message: 'Address copied' }))
    .catch(() => snackbar.show({ message: 'Couldn’t copy the address.' }));

  return (
    <View style={spot.section}>
      <Text style={spot.heading} accessibilityRole="header">Location</Text>
      {!!address && (
        <View style={styles.addressRow}>
          <Text style={[spot.body, styles.address]} selectable>{address}</Text>
          <TouchableOpacity style={styles.copy} onPress={copyAddress} accessibilityRole="button" accessibilityLabel="Copy address">
            <Ionicons name="copy-outline" size={18} color={honey.ink} />
          </TouchableOpacity>
        </View>
      )}
      {hasPin && (
        <View style={styles.frame}>
          {mapReady && (
            <MapView key={`${latitude},${longitude}`} style={styles.map}
              initialRegion={{ ...destination, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
              showsUserLocation={preview && !!origin}>
              <Marker coordinate={destination} title={name} />
              {preview && origin && (
                <MapViewDirections origin={origin} destination={destination} apikey={GOOGLE_MAPS_APIKEY}
                  strokeWidth={4} strokeColor="hotpink" onReady={() => setMessage(null)}
                  onError={() => setMessage('The route preview is unavailable.')} />
              )}
            </MapView>
          )}
        </View>
      )}
      {preview && !!message && <Text style={spot.body} accessibilityRole="alert">{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  address: { flex: 1 },
  copy: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    ...spot.inset,
  },
  frame: { height: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: honey.frame },
  map: { flex: 1 },
});
