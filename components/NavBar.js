// One stationary header above the signed-in sections and their nested pages.
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, StatusBar, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';
import BackButton from './BackButton';
import useReduceMotion from '../hooks/useReduceMotion';
import pressTab from '../navigation/pressTab';
import { useCity } from '../contexts/CityContext';

const CHARCOAL = '#333333';
const CITY_INK = '#62584E';
const ROW_HEIGHT = 44;
const BOTTOM_PADDING = 8;
const getTopPadding = topInset => Math.max(65, topInset + 3);
export const getMinimumNavBarHeight = topInset => getTopPadding(topInset) + ROW_HEIGHT + BOTTOM_PADDING;

// What the back button names for VoiceOver. Only pages that can have a page above them are listed.
const PARENT_TITLES = {
  Home: 'Home',
  SeasonsScreen: 'Seasons',
  CollectionSpots: 'Collection',
  CitySpots: 'All spots',
  FallDatesScreen: 'Fall Dates',
  WinterDatesScreen: 'Winter Dates',
  SpringDatesScreen: 'Spring Dates',
  SummerDatesScreen: 'Summer Dates',
  Favourites: 'Favourites',
  SeasonalFavourites: 'Saved Spots',
  Explore: 'Explore',
  Map: 'Map',
  ListScreen: 'List',
  PersonScreen: 'Profile',
  Profile: 'Profile',
};

// Room for the back chevron beside the title; the bar's other contents don't move.
const TITLE_SHIFT = 32;
const BACK_LOCK_MS = 400;

export default function NavBar({ state, navigation, insets, onLayout }) {
  const section = state.routes[state.index].state;
  const depth = section?.index ?? 0;
  const canGoBack = depth > 0;
  const parentTitle = canGoBack ? PARENT_TITLES[section.routes[depth - 1]?.name] : undefined;

  const reduceMotion = useReduceMotion();
  const backProgress = useRef(new Animated.Value(canGoBack ? 1 : 0)).current;
  const lastBackPress = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      backProgress.setValue(canGoBack ? 1 : 0);
      return;
    }
    const animation = Animated.timing(backProgress, {
      toValue: canGoBack ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [backProgress, canGoBack, reduceMotion]);

  const goBack = () => {
    const now = Date.now();
    if (!canGoBack || now - lastBackPress.current < BACK_LOCK_MS) return;
    lastBackPress.current = now;
    navigation.dispatch({ ...StackActions.pop(1), target: section.key });
  };

  const activeRoute = state.routes[state.index].name;
  // The city is Home's to show: it sits beside the gear on Home's first page and steps aside on the pages under it.
  const { city } = useCity();
  const showCity = activeRoute === 'HomeTab' && !!city;

  return (
    <View pointerEvents="box-none" onLayout={onLayout} style={[styles.bar, {
      paddingTop: getTopPadding(insets.top),
      paddingLeft: insets.left + 20,
      paddingRight: insets.right + 20,
      minHeight: getMinimumNavBarHeight(insets.top),
    }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View pointerEvents="box-none" style={styles.row}>
        <Animated.View
          style={[styles.back, { opacity: backProgress }]}
          pointerEvents={canGoBack ? 'auto' : 'none'}
          accessibilityElementsHidden={!canGoBack}
          importantForAccessibility={canGoBack ? 'auto' : 'no-hide-descendants'}
        >
          <BackButton onPress={goBack} label={parentTitle ? `Back to ${parentTitle}` : 'Back'} tintColor={CHARCOAL} iconSize={28} />
        </Animated.View>

        <Animated.View
          style={{ transform: [{ translateX: backProgress.interpolate({ inputRange: [0, 1], outputRange: [0, TITLE_SHIFT] }) }] }}
        >
          <TouchableOpacity
            style={styles.titleButton}
            onPress={() => pressTab(state, navigation, 'HomeTab')}
            accessibilityRole="tab"
            accessibilityLabel="SznLuv Home"
            accessibilityState={{ selected: activeRoute === 'HomeTab' }}
          >
            <Text style={styles.title}>SznLuv</Text>
          </TouchableOpacity>
        </Animated.View>

        <View pointerEvents="box-none" style={styles.actions}>
          {showCity && (
            <Animated.View
              style={[styles.city, { opacity: backProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
              pointerEvents={canGoBack ? 'none' : 'auto'}
              accessibilityElementsHidden={canGoBack}
              importantForAccessibility={canGoBack ? 'no-hide-descendants' : 'auto'}
            >
              <TouchableOpacity
                style={styles.cityButton}
                onPress={() => { Keyboard.dismiss(); navigation.navigate('CitySelection'); }}
                disabled={canGoBack}
                hitSlop={{ top: 4, bottom: 4, left: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`City: ${city.name}`}
                accessibilityHint="Opens the list of cities so you can explore another one"
              >
                <Ionicons name="location-outline" size={20} color={CITY_INK} />
                <Text style={styles.cityName} numberOfLines={1}>{city.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => { Keyboard.dismiss(); navigation.navigate('Settings'); }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <View style={styles.settingsBadge}>
              <Ionicons name="settings-outline" size={24} color={CHARCOAL} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingBottom: BOTTOM_PADDING,
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    position: 'absolute',
    left: -16,
    zIndex: 1,
  },
  titleButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  title: {
    color: CHARCOAL,
    fontSize: 29,
    fontWeight: 'bold',
  },
  // The city and the gear share the right side. A long city name gives way before the title does.
  actions: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 12,
  },
  city: {
    flexShrink: 1,
  },
  cityButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  cityName: {
    flexShrink: 1,
    color: CITY_INK,
    fontSize: 17,
    fontWeight: '700',
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8EDD9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
