// The signed-in app: four sections, each remembering its own place.
import React, { useContext, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NavBar, { getMinimumNavBarHeight } from '../components/NavBar';
import FloatingTabBar from '../components/FloatingTabBar';
import { SnackbarProvider } from '../components/Snackbar';
import HomeScreen from '../screens/HomeScreen';
import VancouverScreen from '../screens/VancouverScreen';
import SeasonsScreen from '../screens/SeasonsScreen';
import FallDatesScreen from '../screens/FallDatesScreen';
import WinterDatesScreen from '../screens/WinterDatesScreen';
import SpringDatesScreen from '../screens/SpringDatesScreen';
import SummerDatesScreen from '../screens/SummerDatesScreen';
import Favourites from '../screens/Favourites';
import SeasonalFavourites from '../screens/SeasonalFavourites';
import ExploreScreen from '../screens/ExploreScreen';
import ListScreen from '../screens/ListScreen';
import OwnSpotScreen from '../screens/OwnSpotScreen';
import CustomSpotScreen from '../screens/CustomSpotScreen';
import SpinTheWheel from '../screens/SpinTheWheel';
import ProfileSettings from '../screens/ProfileSettings';
import ProfileScreen from '../screens/ProfileScreen';
import PersonScreen from '../screens/PersonScreen';
import AldorFamilyFarmScreen from '../screens/AldorFamilyFarmScreen';
import LaityPumpkinPatch from '../screens/LaityPumpkinPatch';
import EagleAcresDairy from '../screens/EagleAcresDairy';
import SpotDetailScreen from '../screens/SpotDetailScreen';
import { AuthContext } from '../contexts/AuthContext';
import { SpotDiscoveryProvider } from '../hooks/useSpotDiscovery';
import useReduceMotion from '../hooks/useReduceMotion';
import { FloatingNavigationLayoutProvider } from './floatingNavigationLayout';
import { TopNavigationHeightContext } from './topNavigationLayout';

const Tabs = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const FavouritesStack = createNativeStackNavigator();
const ExploreStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const stackOptions = { headerShown: false };

// Venue pages open from both the seasonal lists and saved favourites, inside whichever section you're in.
export const venueScreens = [
  ['AldorFamilyFarmScreen', AldorFamilyFarmScreen],
  ['LaityPumpkinPatch', LaityPumpkinPatch],
  ['EagleAcresDairy', EagleAcresDairy],
  ['SpotDetailScreen', SpotDetailScreen],
];
// Lists and the pages they lead to, likewise available inside whichever section opened them.
export const socialScreens = [
  ['ListScreen', ListScreen],
  ['PersonScreen', PersonScreen],
  ['OwnSpotScreen', OwnSpotScreen],
  ['CustomSpotScreen', CustomSpotScreen],
];
// A collection's own page: from the season cards at home, and from My lists once it has been saved.
export const collectionScreens = [
  ['FallDatesScreen', FallDatesScreen],
  ['WinterDatesScreen', WinterDatesScreen],
  ['SpringDatesScreen', SpringDatesScreen],
  ['SummerDatesScreen', SummerDatesScreen],
];
const renderCollections = (Stack) => collectionScreens.map(([name, component]) => (
  <Stack.Screen key={name} name={name} component={component} />
));
const renderVenues = (Stack) => [...venueScreens, ...socialScreens].map(([name, component]) => (
  <Stack.Screen key={name} name={name} component={component} />
));

function HomeSection() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="VancouverScreen" component={VancouverScreen} />
      <HomeStack.Screen name="SeasonsScreen" component={SeasonsScreen} />
      {renderCollections(HomeStack)}
      {renderVenues(HomeStack)}
    </HomeStack.Navigator>
  );
}

function FavouritesSection() {
  return (
    <FavouritesStack.Navigator screenOptions={stackOptions}>
      <FavouritesStack.Screen name="Favourites" component={Favourites} />
      <FavouritesStack.Screen name="SeasonalFavourites" component={SeasonalFavourites} />
      {renderCollections(FavouritesStack)}
      {renderVenues(FavouritesStack)}
    </FavouritesStack.Navigator>
  );
}

function ExploreSection() {
  return (
    <ExploreStack.Navigator screenOptions={stackOptions}>
      <ExploreStack.Screen name="Explore" component={ExploreScreen} />
      {renderVenues(ExploreStack)}
    </ExploreStack.Navigator>
  );
}

function ProfileSection() {
  return (
    <ProfileStack.Navigator screenOptions={stackOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={ProfileSettings} />
      {renderVenues(ProfileStack)}
    </ProfileStack.Navigator>
  );
}

const bottomItems = [
  {
    route: 'HomeTab',
    label: 'Home',
    returnToRoot: true,
    renderIcon: ({ selected, color }) => (
      <Ionicons name={selected ? 'home' : 'home-outline'} size={26} color={color} />
    ),
  },
  {
    route: 'ExploreTab',
    label: 'Explore',
    hint: 'Search lists from other people',
    renderIcon: ({ selected, color }) => (
      <Ionicons name={selected ? 'search' : 'search-outline'} size={26} color={color} />
    ),
  },
  {
    route: 'FavouritesTab',
    label: 'Favorites',
    renderIcon: ({ selected, color }) => (
      <Ionicons name={selected ? 'heart' : 'heart-outline'} size={27} color={color} />
    ),
  },
  {
    route: 'SpinTab',
    label: 'Spin the Wheel',
    renderIcon: () => <Image source={require('../assets/SPINTHEWHEEL.png')} style={styles.discoveryIcon} />,
  },
];

function SignedInLayout({ children, state, navigation }) {
  const insets = useSafeAreaInsets();
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0);
  const headerHeight = Math.max(getMinimumNavBarHeight(insets.top), measuredHeaderHeight);

  return (
    <TopNavigationHeightContext.Provider value={headerHeight}>
      <View style={styles.shell}>
        <NavBar
          state={state}
          navigation={navigation}
          insets={insets}
          onLayout={({ nativeEvent }) => setMeasuredHeaderHeight(nativeEvent.layout.height)}
        />
        {children}
      </View>
    </TopNavigationHeightContext.Provider>
  );
}

const renderLayout = props => <SignedInLayout {...props} />;
const renderBottomBar = props => <FloatingTabBar {...props} items={bottomItems} />;

export default function MainTabs() {
  const { user } = useContext(AuthContext);
  const reduceMotion = useReduceMotion();
  return (
    <SpotDiscoveryProvider key={user?.uid}>
      <FloatingNavigationLayoutProvider>
        <SnackbarProvider>
        <Tabs.Navigator
          // iOS has no hardware back; 'none' stops VoiceOver's back gesture jumping between sections.
          backBehavior={Platform.OS === 'ios' ? 'none' : 'firstRoute'}
          layout={renderLayout}
          tabBar={renderBottomBar}
          screenOptions={{
            headerShown: false,
            tabBarPosition: 'bottom',
            animation: reduceMotion ? 'none' : 'fade',
          }}
        >
          <Tabs.Screen name="HomeTab" component={HomeSection} />
          <Tabs.Screen name="ExploreTab" component={ExploreSection} />
          <Tabs.Screen name="FavouritesTab" component={FavouritesSection} />
          <Tabs.Screen name="SpinTab" component={SpinTheWheel} />
          <Tabs.Screen name="ProfileTab" component={ProfileSection} />
        </Tabs.Navigator>
        </SnackbarProvider>
      </FloatingNavigationLayoutProvider>
    </SpotDiscoveryProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#FFF5E4' },
  discoveryIcon: { width: 33, height: 33, resizeMode: 'contain' },
});
