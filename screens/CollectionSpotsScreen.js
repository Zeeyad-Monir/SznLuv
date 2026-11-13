// A themed collection from Home ("Outdoors"): its spots under the category each came from, with the same
// search, filters and map as a season page. Opened with { collectionId }.
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BackgroundLottie from '../components/BackgroundLottie';
import EmptyCard from '../components/EmptyCard';
import SpotBrowser from '../components/SpotBrowser';
import { GUTTER } from '../components/theme';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { collectionById, collectionSections } from '../services/collections';

const RANKED = { rankSearch: true };
// The same green and full-screen sprigs as "All Vancouver spots" (screens/CitySpotsScreen.js).
const BACKGROUND = '#D9E0D8';
const SPRIGS = require('../assets/animations/Floating_Evergreen_Sprigs_Animation_v1.json');
// Built in a function because `styles` is defined below.
const sprigs = () => (
  <BackgroundLottie source={SPRIGS} speed={0.5} resizeMode="cover" pointerEvents="none" style={styles.sprigs} />
);

export default function CollectionSpotsScreen({ navigation, route }) {
  const collectionId = route.params?.collectionId;
  const collection = collectionById(collectionId);
  const sections = useMemo(() => collectionSections(collectionId), [collectionId]);

  // Home only opens collections that have spots, so this is for an old link to one that has since been emptied.
  if (!collection || sections.length === 0) {
    return (
      <SignedInScreen style={styles.container}>
        <View style={styles.empty}>
          <EmptyCard icon="explore" title="Nothing here yet"
            text="This collection doesn't have any spots right now." actionLabel="Back" onAction={() => navigation.goBack()} />
        </View>
      </SignedInScreen>
    );
  }
  return (
    <SpotBrowser navigation={navigation} title={collection.title} sectionKey={`collection:${collection.id}`}
      sections={sections} search={RANKED} backgroundColor={BACKGROUND}
      backdrop={sprigs()} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  sprigs: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  empty: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP },
});
