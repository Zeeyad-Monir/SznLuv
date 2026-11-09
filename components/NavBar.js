// The app's top bar, used as the tab bar for the four main sections so it stays still while pages slide beneath it.
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text, StatusBar, Animated, Dimensions } from 'react-native';
import { StackActions } from '@react-navigation/native';
import BackButton from './BackButton';
import { getReduceMotion } from '../hooks/useReduceMotion';

const ICON_SECTIONS = [
  { route: 'FavouritesTab', label: 'Favourites', image: require('../assets/FAVOURITES.png') },
  { route: 'SpinTab', label: 'Spin the Wheel', image: require('../assets/SPINTHEWHEEL.png') },
  { route: 'ProfileTab', label: 'Profile', image: require('../assets/PROFILE.png') },
];

// What the back button names for VoiceOver. Only pages that can have a page above them are listed.
const PARENT_TITLES = {
  Home: 'Home',
  VancouverScreen: 'Vancouver',
  SeasonsScreen: 'Seasons',
  FallDatesScreen: 'Fall Dates',
  WinterDatesScreen: 'Winter Dates',
  SpringDatesScreen: 'Spring Dates',
  SummerDatesScreen: 'Summer Dates',
  Favourites: 'Favourites',
  SeasonalFavourites: 'Saved Spots',
  CustomCollectionScreen: 'Collection',
};

// Room for the back chevron beside the title; the bar's other contents don't move.
const TITLE_SHIFT = 26;
const COMPACT = Dimensions.get('window').width < 360;
const BACK_LOCK_MS = 400;

export default function NavBar({ state, navigation, insets }) {
  const section = state.routes[state.index].state;
  const depth = section?.index ?? 0;
  const canGoBack = depth > 0;
  const parentTitle = canGoBack ? PARENT_TITLES[section.routes[depth - 1]?.name] : undefined;

  const backProgress = useRef(new Animated.Value(canGoBack ? 1 : 0)).current;
  const lastBackPress = useRef(0);

  useEffect(() => {
    Animated.timing(backProgress, {
      toValue: canGoBack ? 1 : 0,
      duration: getReduceMotion() ? 0 : 220,
      useNativeDriver: true,
    }).start();
  }, [canGoBack]);

  const pressSection = (routeName) => {
    const route = state.routes.find(candidate => candidate.name === routeName);
    const alreadyHere = state.routes[state.index].key === route.key;
    // tabPress lets the section's stack return to its start and its list scroll to top on a re-tap.
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!alreadyHere && !event.defaultPrevented) navigation.navigate(route.name);
  };

  const goBack = () => {
    const now = Date.now();
    if (!canGoBack || now - lastBackPress.current < BACK_LOCK_MS) return;
    lastBackPress.current = now;
    navigation.dispatch({ ...StackActions.pop(1), target: section.key });
  };

  const paddingTop = Math.max(65, insets.top + 3);
  const homeSelected = state.routes[state.index].name === 'HomeTab';

  return (
    <View style={[styles.bar, { paddingTop, height: paddingTop + 65 }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.row}>
        <Animated.View
          style={[styles.back, { opacity: backProgress }]}
          pointerEvents={canGoBack ? 'auto' : 'none'}
          accessibilityElementsHidden={!canGoBack}
          importantForAccessibility={canGoBack ? 'auto' : 'no-hide-descendants'}
        >
          <BackButton onPress={goBack} label={parentTitle ? `Back to ${parentTitle}` : 'Back'} />
        </Animated.View>

        <Animated.View
          style={{ transform: [{ translateX: backProgress.interpolate({ inputRange: [0, 1], outputRange: [0, TITLE_SHIFT] }) }] }}
        >
          <TouchableOpacity
            style={styles.titleButton}
            onPress={() => pressSection('HomeTab')}
            accessibilityRole="tab"
            accessibilityLabel="SznLuv Home"
            accessibilityState={{ selected: homeSelected }}
          >
            <Text style={styles.title}>SznLuv</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={[styles.icons, COMPACT && styles.iconsCompact]}>
          {ICON_SECTIONS.map(({ route, label, image }) => (
            <TouchableOpacity
              key={route}
              onPress={() => pressSection(route)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: state.routes[state.index].name === route }}
            >
              <Image source={image} style={[styles.icon, COMPACT && styles.iconCompact]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    backgroundColor: '#333333',
    paddingHorizontal: 20,
  },
  row: {
    height: 45,
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
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconsCompact: {
    gap: 8,
  },
  icon: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  iconCompact: {
    width: 38,
    height: 38,
  },
});
