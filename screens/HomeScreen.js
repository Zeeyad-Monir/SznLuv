// Home: the first page of the signed-in app, and where exploring a city starts.
//
// Top to bottom: the page's one large line, a featured collection, the collections to browse, and a way
// into every spot in the city. All of it is read from services/collections.js for the chosen city, so a
// new collection or city shows up here without this file changing. The city itself is shown, and changed,
// in the header above (components/NavBar.js).
import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import CollectionTile from '../components/CollectionTile';
import EmptyCard from '../components/EmptyCard';
import FeaturedCollectionCard from '../components/FeaturedCollectionCard';
import PressableScale from '../components/PressableScale';
import { CARD_RADIUS, GRID_GAP, GUTTER, colors, text, tileWidth } from '../components/theme';
import { useCity } from '../contexts/CityContext';
import useEntrance from '../hooks/useEntrance';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { citySpotSections, featuredForCity, homeCollections } from '../services/collections';
import { canNavigate } from '../services/venueNavigation';

// Card heights follow the screen's width, so the illustrations keep their shape on every phone.
const FEATURED_SHAPE = 0.5;
const TILE_SHAPE = 0.62;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { city } = useCity();
  const { width } = useWindowDimensions();
  const scrollStyle = useFloatingScrollStyle(styles.content);
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // Re-tapping this section scrolls back to the top
  const entrance = useEntrance(4);

  const featured = useMemo(() => featuredForCity(city.id), [city.id]);
  const collections = useMemo(() => homeCollections(city.id), [city.id]);
  const hasSpots = useMemo(() => citySpotSections(city.id).length > 0, [city.id]);
  const tile = tileWidth(width);

  // Two quick taps on different cards must not push two pages
  const open = ({ screen, params }) => {
    if (!canNavigate(navigation)) return;
    if (params) navigation.navigate(screen, params);
    else navigation.navigate(screen);
  };

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={scrollStyle}>
        <Animated.View style={entrance[0]}>
          <Text style={text.heroTitle} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            What sounds good?
          </Text>
        </Animated.View>

        {featured && (
          <Animated.View style={[styles.featured, entrance[1]]}>
            <FeaturedCollectionCard featured={featured} height={Math.round((width - 2 * GUTTER) * FEATURED_SHAPE)}
              onPress={() => open(featured.target)} />
          </Animated.View>
        )}

        {hasSpots ? (
          <>
            <Animated.View style={entrance[2]}>
              <Text style={[text.tileTitle, styles.heading]} accessibilityRole="header">Browse collections</Text>
              <View style={styles.grid}>
                {collections.map(collection => (
                  <CollectionTile key={collection.key} collection={collection} width={tile}
                    height={Math.round(tile * TILE_SHAPE)} onPress={() => open(collection.target)} />
                ))}
              </View>
            </Animated.View>

            <Animated.View style={entrance[3]}>
              <PressableScale style={styles.allSpots} contentStyle={styles.allSpotsSurface}
                onPress={() => open({ screen: 'CitySpots' })} accessibilityLabel={`All ${city.name} spots`}>
                <Ionicons name="map-outline" size={22} color={colors.summary} />
                <Text style={styles.allSpotsText}>All {city.name} spots</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.summary} />
              </PressableScale>
            </Animated.View>
          </>
        ) : (
          // A city SznLuv has opened but not filled yet: say so, and offer the way to a city that has spots.
          <Animated.View style={[styles.empty, entrance[2]]}>
            <EmptyCard icon="explore" title={`Nothing in ${city.name} yet`}
              text="We're still adding spots here. You can explore another city in the meantime."
              actionLabel="Choose another city" onAction={() => open({ screen: 'CitySelection' })} />
          </Animated.View>
        )}
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: GUTTER, paddingTop: SCREEN_CONTENT_TOP_GAP, paddingBottom: 20 },
  featured: { marginTop: 14 },
  heading: { marginTop: 26, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  empty: { marginTop: 24 },
  allSpots: { marginTop: GRID_GAP + 4 },
  allSpotsSurface: {
    minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: CARD_RADIUS, backgroundColor: colors.segmentTrack,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  allSpotsText: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '700', color: colors.summary },
});
