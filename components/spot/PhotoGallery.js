// A spot's photos, one page each, swiped sideways, with dots under them. One photo shows on its own.
import React, { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import StoragePhoto, { PhotoPlaceholder } from '../StoragePhoto';
import { colors } from '../theme';

export default function PhotoGallery({ photos = [], name, height = 240, gutter = 20 }) {
  const { width: screen } = useWindowDimensions();
  const width = screen - gutter * 2;
  const [page, setPage] = useState(0);
  if (!photos.length) {
    return (
      <View style={[styles.frame, styles.empty, { height }]}>
        <PhotoPlaceholder style={styles.placeholder} />
        <Text style={styles.emptyText}>Photo coming soon</Text>
      </View>
    );
  }
  const credit = photos[page]?.credit;
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles.frame, { width, height }]}
        onMomentumScrollEnd={({ nativeEvent }) => setPage(Math.round(nativeEvent.contentOffset.x / width))}>
        {photos.map((photo, index) => {
          const label = `${name}, photo ${index + 1} of ${photos.length}`;
          return photo.source ? (
            <Image key={photo.id} source={photo.source} style={{ width, height }} resizeMode="cover" accessibilityLabel={label} />
          ) : (
            <StoragePhoto key={photo.path} path={photo.path} style={{ width, height }} accessibilityLabel={label} />
          );
        })}
      </ScrollView>
      {credit && (
        <Text style={styles.credit}>
          {credit.licenseUrl ? 'Photo by ' : 'Photo from '}
          <Text style={styles.creditLink} accessibilityRole="link" onPress={() => Linking.openURL(credit.sourceUrl)}>{credit.author}</Text>
          {credit.licenseUrl && (
            <>{' · '}<Text style={styles.creditLink} accessibilityRole="link" onPress={() => Linking.openURL(credit.licenseUrl)}>{credit.license}</Text></>
          )}
          {credit.changes && ` · ${credit.changes}`}
        </Text>
      )}
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
  empty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  placeholder: { width: 36, height: 36 },
  emptyText: { color: colors.muted, fontSize: 15 },
  credit: { color: colors.spotMeta, fontSize: 12, marginTop: 6 },
  creditLink: { textDecorationLine: 'underline' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D6CCBE' },
  dotOn: { backgroundColor: colors.ink },
});
