import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import { openVenue } from '../services/venueNavigation';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import useEntrance from '../hooks/useEntrance';
import useSpotDiscovery from '../hooks/useSpotDiscovery';
import SpotDiscoveryControls, { SpotEmptyState } from '../components/SpotDiscoveryControls';
import { fallCategories } from '../services/spots';
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../contexts/AuthContext';
import BackgroundLottie from '../components/BackgroundLottie';
import fallingLeaves from '../assets/fallingLeaves.json';

const searchConfig = { rankSearch: true };

export default function FallDatesScreen({ navigation }) {
  const floatingScrollStyle = useFloatingScrollStyle(styles.contentContainer);
  const { user } = useContext(AuthContext);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Sections and spots come from services/spots.js so the list, venue pages, favourites and wheel stay in sync.
  const categories = fallCategories;

  // The header and each category section ease in together; the push itself carries the page.
  const entrance = useEntrance(1 + categories.length);
  const discovery = useSpotDiscovery('fall', categories, searchConfig);

  // Saved spots, kept live. The heart saves to Fall favourites and offers "Add to list" in a snackbar.
  const [favorites, setFavorites] = useFavouriteSpots(() => {
    Alert.alert('Favourites unavailable', 'Could not load your saved spots. Please check your connection and account access.');
  });
  const { toggleFavouriteSpot } = useSaveSpot(favorites, setFavorites);
  const toggleFavorite = (spotName, spotAddress) => toggleFavouriteSpot({ name: spotName, address: spotAddress, season: 'Fall' });

  const handleSpotPress = (spot) => {
    Keyboard.dismiss();
    openVenue(navigation, Alert.alert, spot.name);
  };

  return (
    <SignedInScreen style={styles.container}>
      <BackgroundLottie
        source={fallingLeaves}
        style={styles.leavesAnimation}
        speed={0.6}
      />

      <Animated.View style={[styles.headerContainer, entrance[0]]}>
        <Text style={styles.mainTitle}>Fall Dates</Text>
        <SpotDiscoveryControls discovery={discovery} />
      </Animated.View>

      <ScrollView ref={discovery.listRef} contentContainerStyle={floatingScrollStyle}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {discovery.count === 0 && <SpotEmptyState discovery={discovery} />}
        {discovery.sections.map(category => (
          <Animated.View key={category.title ?? 'sorted'} style={[styles.categorySection, entrance[category.index + 1]]}>
            {category.title && <Text style={styles.categoryTitle}>{category.title}</Text>}
            {category.spots.map(spot => (
              <View key={spot.name} style={styles.dateSpotCard}>
                <TouchableOpacity
                  style={styles.dateSpotCardContent}
                  accessibilityActions={[{ name: 'favorite', label: favorites[spot.name]?.isFavourite ? 'Remove from favourites' : 'Add to favourites' }]}
                  onAccessibilityAction={() => toggleFavorite(spot.name, spot.address)}
                  onPress={() => handleSpotPress(spot)}
                  accessibilityLabel={`View details for ${spot.name}`}
                  accessibilityRole="button"
                >
                  <TouchableOpacity
                    style={styles.cardHeartIcon}
                    hitSlop={11}
                    onPress={() => toggleFavorite(spot.name, spot.address)}
                    accessibilityLabel={`Favorite ${spot.name}`}
                    accessibilityRole="button"
                  >
                    <Icon
                      name={
                        favorites[spot.name]?.isFavourite ? 'favorite' : 'favorite-border'
                      }
                      size={23}
                      color={favorites[spot.name]?.isFavourite ? '#FF0000' : '#A9A9A9'}
                    />
                  </TouchableOpacity>

                  <View style={styles.cardTextContainer}>
                    <Text
                      style={styles.dateSpotName}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                      maxFontSizeMultiplier={1.2}
                    >
                      {spot.name}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cardArrowIcon}
                    hitSlop={13}
                    onPress={() => handleSpotPress(spot)}
                    accessibilityLabel={`View details for ${spot.name}`}
                    accessibilityRole="button"
                  >
                    <Icon name="chevron-right" size={18} color="#000" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4A460',
  },
  leavesAnimation: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').height * 1.5,
    top: -Dimensions.get('window').height * 0.2,
    left: -Dimensions.get('window').width * 0.25,
    transform: [{ scale: 1.65 }],
    opacity: 0.6,
  },
  headerContainer: {},
  mainTitle: {
    color: '#F5F5DC',
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 6,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryTitle: {
    color: '#F5F5DC',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateSpotCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    height: 74, // Same height for every spot card (the name is a single shrink-to-fit line)
    marginBottom: 24.15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateSpotCardContent: {
    padding: 14, // On the touchable, so the whole card responds and not just its middle
    alignSelf: 'stretch',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeartIcon: {
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  dateSpotName: {
    color: '#000',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardArrowIcon: {
    marginLeft: 16,
  },
  
  // Use the same styling as success notification

});
