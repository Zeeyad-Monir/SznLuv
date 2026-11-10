// A spot's photos, one page each, swiped sideways, with dots under them. One photo shows on its own.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import StoragePhoto from '../StoragePhoto';
import { colors } from '../theme';

export default function PhotoGallery({ photos, name, height = 240, gutter = 20 }) {
  const { width: screen } = useWindowDimensions();
  const width = screen - gutter * 2;
  const [page, setPage] = useState(0);
  if (!photos?.length) return null;
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles.frame, { width, height }]}
        onMomentumScrollEnd={({ nativeEvent }) => setPage(Math.round(nativeEvent.contentOffset.x / width))}>
        {photos.map((photo, index) => (
          <StoragePhoto key={photo.id ?? photo.path} path={photo.path} style={{ width, height }}
            accessibilityLabel={`${name}, photo ${index + 1} of ${photos.length}`} />
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={styles.dots} accessible={false} importantForAccessibility="no-hide-descendants">
          {photos.map((photo, index) => <View key={photo.id ?? photo.path} style={[styles.dot, index === page && styles.dotOn]} />)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#EFE6D8' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D6CCBE' },
  dotOn: { backgroundColor: colors.ink },
});
