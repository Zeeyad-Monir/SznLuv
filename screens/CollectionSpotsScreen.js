// A themed collection from Home ("Outdoors"): its spots under the category each came from, with the same
// search, filters and map as a season page. Opened with { collectionId }.
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import EmptyCard from '../components/EmptyCard';
import SpotBrowser from '../components/SpotBrowser';
import { GUTTER, colors } from '../components/theme';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { collectionById, collectionSections } from '../services/collections';

const RANKED = { rankSearch: true };

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
      sections={sections} search={RANKED} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  empty: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP },
});
