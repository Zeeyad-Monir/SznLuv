// "All Vancouver spots": every spot SznLuv lists in the chosen city, one section per season, with the same
// search, filters and map as a season page.
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BackgroundLottie from '../components/BackgroundLottie';
import EmptyCard from '../components/EmptyCard';
import SpotBrowser from '../components/SpotBrowser';
import { GUTTER } from '../components/theme';
import { useCity } from '../contexts/CityContext';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { citySpotSections } from '../services/collections';

const RANKED = { rankSearch: true };
const BACKGROUND = '#D9E0D8';
const SPRIGS = require('../assets/animations/Floating_Evergreen_Sprigs_Animation_v1.json');

// The sprigs fill the whole screen behind the page, over the green. "cover" crops the square animation to fit.
// Built in a function because `styles` is defined below.
const sprigs = () => (
  <BackgroundLottie source={SPRIGS} speed={0.5} resizeMode="cover" pointerEvents="none" style={styles.sprigs} />
);
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
      sections={sections} search={RANKED} spotMeta={townOnly} backgroundColor={BACKGROUND}
      backdrop={sprigs()} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  sprigs: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  empty: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP },
});
