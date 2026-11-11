// One stationary header above the signed-in sections and their nested pages.
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, StatusBar, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';
import BackButton from './BackButton';
import useReduceMotion from '../hooks/useReduceMotion';
import pressTab from '../navigation/pressTab';

const CHARCOAL = '#333333';
const ROW_HEIGHT = 44;
const BOTTOM_PADDING = 8;
const getTopPadding = topInset => Math.max(65, topInset + 3);
export const getMinimumNavBarHeight = topInset => getTopPadding(topInset) + ROW_HEIGHT + BOTTOM_PADDING;

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
