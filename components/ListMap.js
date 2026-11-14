// The map on a list or collection page. It behaves like the Map tab: tapping a pin opens a small preview
// above it (the same card, without the distance), and tapping the preview opens the spot.
// A tap on empty map closes the preview.
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { SpotMapMarker } from './map/SpotMapMarker';
import SpotMapPreview, { PREVIEW_LIFT, previewCardSize } from './map/SpotMapPreview';
import { getReduceMotion } from '../hooks/useReduceMotion';
import { nudgeIntoFrame, shiftRegion, validRegion } from '../services/mapGeometry';
import { hasCoordinates } from '../services/spotDiscovery';

export function mappable(entries) {
  return entries.map((entry, index) => ({ ...entry, number: index + 1 }))
    .filter(entry => hasCoordinates(entry.spot));
}

const closeRegion = coordinate => ({ ...coordinate, latitudeDelta: 0.03, longitudeDelta: 0.03 });
const edgePadding = { top: 60, right: 50, bottom: 50, left: 50 };
const MOVE_MS = 350;
const EDGE = 8;
const PREVIEW = previewCardSize({ distance: false });
const coordinateOf = spot => ({ latitude: spot.latitude, longitude: spot.longitude });

export default function ListMap({ points, onOpen }) {
  const map = useRef(null);
  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [size, setSize] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const selectedNow = useRef(null);
  selectedNow.current = selectedKey;
  const coordinates = points.map(({ spot }) => coordinateOf(spot));
  const coordinateKey = JSON.stringify(coordinates);
  const initialRegion = useRef(closeRegion(coordinates[0]));
  const latestRegion = useRef(initialRegion.current); // What the map shows now, for sliding it under the preview
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

  const selected = selectedKey ? points.find(entry => entry.spot.key === selectedKey) ?? null : null;
  // A spot that leaves the list (or loses its pin) while its preview is open takes the preview with it.
  useEffect(() => {
    if (selectedKey && !selected) setSelectedKey(null);
  }, [selectedKey, selected]);

  // As on the Map tab: on iOS a marker added while the map is still only appears on the next redraw, so a
  // half-point change of padding makes the map redraw whenever the pins or the preview change.
  const drawn = points.map(entry => `${entry.spot.key}:${entry.spot.key === selectedKey}`).join('|');
  const [redraws, setRedraws] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'ios') setRedraws(count => count + 1);
  }, [drawn]);

  // Slides the map just far enough that the preview isn't cut off by the map's edges.
  const keepPreviewVisible = async spot => {
    const point = await map.current?.pointForCoordinate?.(coordinateOf(spot));
    const from = latestRegion.current;
    if (!point || !from || !size || selectedNow.current !== spot.key) return;
    const frame = { top: EDGE, bottom: size.height - EDGE, left: EDGE, right: size.width - EDGE };
    const { dx, dy } = nudgeIntoFrame(point, PREVIEW, frame, PREVIEW_LIFT);
    if (dx || dy) {
      const next = shiftRegion(from, dx, dy, size);
      latestRegion.current = next;
      map.current?.animateToRegion?.(next, getReduceMotion() ? 0 : MOVE_MS);
    }
  };

  const selectPin = spot => {
    setSelectedKey(spot.key);
    selectedNow.current = spot.key;
    keepPreviewVisible(spot).catch(() => {});
  };

  const onMapPress = event => {
    if (event?.nativeEvent?.action === 'marker-press') return;
    setSelectedKey(null);
  };

  const onLayout = event => {
    const layout = event?.nativeEvent?.layout;
    if (layout) setSize({ width: layout.width, height: layout.height });
    setLaidOut(true);
  };

  const onRegionChangeComplete = next => {
    if (validRegion(next)) latestRegion.current = next;
  };

  return (
    <View style={styles.frame}>
      <MapView ref={map} style={styles.map} initialRegion={initialRegion.current} moveOnMarkerPress={false}
        mapPadding={{ top: 0, right: 0, bottom: (redraws % 2) / 2, left: 0 }}
        onMapReady={() => setReady(true)} onLayout={onLayout}
        onRegionChangeComplete={onRegionChangeComplete} onPress={onMapPress}>
        {points.map(entry => {
          const on = entry.spot.key === selectedKey;
          return (
            <SpotMapMarker key={`${entry.spot.key}:${on ? 'on' : 'off'}`} spot={entry.spot}
              number={entry.number} selected={on} onPress={selectPin} />
          );
        })}
        {selected && (
          <SpotMapPreview key={selected.spot.key} spot={selected.spot}
            onPress={() => onOpen(selected.ref)} />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 420, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  map: { flex: 1 },
});
