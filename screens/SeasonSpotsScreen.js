// A season's spots: the shared spot browser in that season's colours, under its falling animation.
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import BackgroundLottie from '../components/BackgroundLottie';
import SpotBrowser from '../components/SpotBrowser';
import { fallCategories } from '../services/spots';
import { springCategories, summerCategories, winterCategories } from '../services/seasonSpots';

const seasons = {
  Fall: {
    categories: fallCategories, backgroundColor: '#F5AD70', ink: '#F5F5DC',
    animation: require('../assets/fallingLeaves.json'), speed: 0.6, scale: 1.65, opacity: 0.3, fill: true,
    search: { rankSearch: true },
  },
  Winter: {
    categories: winterCategories, backgroundColor: '#B9CCEC', ink: '#FFFFFF',
    animation: require('../assets/snowFalling.json'), speed: 0.3, scale: 1.65, opacity: 0.6,
    search: { rankSearch: true },
  },
  Spring: {
    categories: springCategories, backgroundColor: '#FFB6C1', ink: '#FFFFFF',
    animation: require('../assets/flowerFalling2.json'), speed: 0.8, scale: 2.8, opacity: 0.3,
  },
  Summer: {
    categories: summerCategories, backgroundColor: '#F8DD74', ink: '#FFF8F0',
    animation: require('../assets/summerFalling.json'), speed: 0.3, scale: 1.8, opacity: 0.6,
  },
};

// Every card here is in this season, so the card names only the town.
const townOnly = spot => spot.locality ?? '';

export default function SeasonSpotsScreen({ navigation, season }) {
  const { categories, backgroundColor, ink, animation, speed, scale, opacity, search, fill } = seasons[season];
  const { width, height } = useWindowDimensions();
  return (
    <SpotBrowser navigation={navigation} title={`${season} Dates`} sectionKey={season.toLowerCase()}
      sections={categories} search={search} backgroundColor={backgroundColor} ink={ink} spotMeta={townOnly}
      backdrop={fill ? (
        // Spans the whole screen, top to bottom, so the leaves start falling from the very top edge.
        <BackgroundLottie source={animation} speed={speed} resizeMode="cover" pointerEvents="none"
          style={{ ...StyleSheet.absoluteFillObject, opacity }} />
      ) : (
        <BackgroundLottie source={animation} speed={speed} style={{
          position: 'absolute', width: width * 1.2, height: height * 1.5, top: -height * 0.2, left: -width * 0.25,
          transform: [{ scale }], opacity,
        }} />
      )} />
  );
}
