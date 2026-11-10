// A list's spots on a map, numbered in list order. Shown instead of the cards when "Map" is chosen.
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { hasCoordinates } from '../services/spotDiscovery';

// The spots that can be drawn: [{ spot, item, number }], numbered by their place in the list.
export function mappable(spots) {
  return spots.map((entry, index) => ({ ...entry, number: index + 1 })).filter(entry => hasCoordinates(entry.spot));
}

export default function ListMap({ spots, onOpen }) {
  const map = useRef(null);
  const points = mappable(spots);
  const fit = () => map.current?.fitToCoordinates(
    points.map(({ spot }) => ({ latitude: spot.latitude, longitude: spot.longitude })),
    { edgePadding: { top: 60, right: 50, bottom: 50, left: 50 }, animated: false },
  );
  return (
    <View style={styles.frame}>
      <MapView ref={map} style={styles.map} onMapReady={fit} onLayout={fit}
        initialRegion={{ latitude: points[0].spot.latitude, longitude: points[0].spot.longitude, latitudeDelta: 0.4, longitudeDelta: 0.4 }}>
        {points.map(entry => (
          <Marker key={entry.spot.key}
            coordinate={{ latitude: entry.spot.latitude, longitude: entry.spot.longitude }}
            title={`${entry.number}. ${entry.spot.name}`} description={entry.item.note || entry.spot.meta}
            onCalloutPress={() => onOpen(entry)} />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 420, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  map: { flex: 1 },
});
