import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { hasCoordinates } from '../services/spotDiscovery';
import { colors, text } from './theme';

export function mappable(entries) {
  return entries.map((entry, index) => ({ ...entry, number: index + 1 }))
    .filter(entry => hasCoordinates(entry.spot));
}

const closeRegion = coordinate => ({ ...coordinate, latitudeDelta: 0.03, longitudeDelta: 0.03 });
const edgePadding = { top: 60, right: 50, bottom: 50, left: 50 };

export default function ListMap({ points, onOpen }) {
  const map = useRef(null);
  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const coordinates = points.map(({ spot }) => ({ latitude: spot.latitude, longitude: spot.longitude }));
  const coordinateKey = JSON.stringify(coordinates);
  const initialRegion = useRef(closeRegion(coordinates[0]));
  useEffect(() => {
    if (!ready || !laidOut) return;
    const locations = JSON.parse(coordinateKey);
    const first = locations[0];
    if (locations.every(point => point.latitude === first.latitude && point.longitude === first.longitude)) {
      map.current?.animateToRegion(closeRegion(first), 0);
    } else {
      map.current?.fitToCoordinates(locations, { edgePadding, animated: false });
    }
  }, [coordinateKey, ready, laidOut]);

  return (
    <>
      <View style={styles.frame}>
        <MapView ref={map} style={styles.map} initialRegion={initialRegion.current}
          onMapReady={() => setReady(true)} onLayout={() => setLaidOut(true)}>
          {points.map((entry, index) => (
            <Marker key={entry.spot.key} coordinate={coordinates[index]} title={entry.spot.name}
              onPress={() => onOpen(entry.ref)} onCalloutPress={() => onOpen(entry.ref)}>
              <View style={styles.pin}>
                <Text style={styles.number} allowFontScaling={false}>{entry.number}</Text>
              </View>
            </Marker>
          ))}
        </MapView>
      </View>
      {points.map(entry => (
        <TouchableOpacity key={entry.spot.key} style={styles.link} onPress={() => onOpen(entry.ref)}
          accessibilityRole="button" accessibilityLabel={`Map spot ${entry.number}, ${entry.spot.name}`}>
          <Text style={text.summary}>{entry.number}. {entry.spot.name}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  frame: { height: 420, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  map: { flex: 1 },
  pin: {
    minWidth: 30, height: 30, paddingHorizontal: 4, borderRadius: 15, borderWidth: 2,
    borderColor: colors.white, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  number: { color: colors.white, fontSize: 13, fontWeight: '800' },
  link: { minHeight: 44, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 12 },
});
