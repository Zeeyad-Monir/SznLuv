// "All Vancouver spots": every spot SznLuv lists in the chosen city, one section per season, with the same
// search, filters and map as a season page.
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import EmptyCard from '../components/EmptyCard';
import SpotBrowser from '../components/SpotBrowser';
import { GUTTER, colors } from '../components/theme';
import { useCity } from '../contexts/CityContext';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { citySpotSections } from '../services/collections';

const RANKED = { rankSearch: true };
// Each section is a season, so the card names only the town.
const townOnly = spot => spot.locality ?? '';

export default function CitySpotsScreen({ navigation }) {
  const { city } = useCity();
  const sections = useMemo(() => citySpotSections(city.id), [city.id]);

  if (sections.length === 0) {
    return (
      <SignedInScreen style={styles.container}>
        <View style={styles.empty}>
          <EmptyCard icon="explore" title={`No spots in ${city.name} yet`}
            text="We're still adding places here. Check back soon." actionLabel="Back" onAction={() => navigation.goBack()} />
        </View>
      </SignedInScreen>
    );
  }
  return (
    <SpotBrowser navigation={navigation} title={`${city.name} spots`} sectionKey={`city:${city.id}`}
      sections={sections} search={RANKED} spotMeta={townOnly} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  empty: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP },
});
