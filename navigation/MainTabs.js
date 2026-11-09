// The signed-in app: four sections, each remembering its own place, under one stationary top bar.
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NavBar from '../components/NavBar';
import HomeScreen from '../screens/HomeScreen';
import VancouverScreen from '../screens/VancouverScreen';
import SeasonsScreen from '../screens/SeasonsScreen';
import FallDatesScreen from '../screens/FallDatesScreen';
import WinterDatesScreen from '../screens/WinterDatesScreen';
import SpringDatesScreen from '../screens/SpringDatesScreen';
import SummerDatesScreen from '../screens/SummerDatesScreen';
import Favourites from '../screens/Favourites';
import SeasonalFavourites from '../screens/SeasonalFavourites';
import CustomCollectionScreen from '../screens/CustomCollectionScreen';
import SpinTheWheel from '../screens/SpinTheWheel';
import ProfileSettings from '../screens/ProfileSettings';
import AldorFamilyFarmScreen from '../screens/AldorFamilyFarmScreen';
import LaityPumpkinPatch from '../screens/LaityPumpkinPatch';
import EagleAcresDairy from '../screens/EagleAcresDairy';
import SpotDetailScreen from '../screens/SpotDetailScreen';

const Tabs = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const FavouritesStack = createNativeStackNavigator();

const stackOptions = { headerShown: false };

// Venue pages open from both the seasonal lists and saved favourites, inside whichever section you're in.
export const venueScreens = [
  ['AldorFamilyFarmScreen', AldorFamilyFarmScreen],
  ['LaityPumpkinPatch', LaityPumpkinPatch],
  ['EagleAcresDairy', EagleAcresDairy],
  ['SpotDetailScreen', SpotDetailScreen],
];
const renderVenues = (Stack) => venueScreens.map(([name, component]) => (
  <Stack.Screen key={name} name={name} component={component} />
));

function HomeSection() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="VancouverScreen" component={VancouverScreen} />
      <HomeStack.Screen name="SeasonsScreen" component={SeasonsScreen} />
      <HomeStack.Screen name="FallDatesScreen" component={FallDatesScreen} />
      <HomeStack.Screen name="WinterDatesScreen" component={WinterDatesScreen} />
      <HomeStack.Screen name="SpringDatesScreen" component={SpringDatesScreen} />
      <HomeStack.Screen name="SummerDatesScreen" component={SummerDatesScreen} />
      {renderVenues(HomeStack)}
    </HomeStack.Navigator>
  );
}

function FavouritesSection() {
  return (
    <FavouritesStack.Navigator screenOptions={stackOptions}>
      <FavouritesStack.Screen name="Favourites" component={Favourites} />
      <FavouritesStack.Screen name="SeasonalFavourites" component={SeasonalFavourites} />
      <FavouritesStack.Screen name="CustomCollectionScreen" component={CustomCollectionScreen} />
      {renderVenues(FavouritesStack)}
    </FavouritesStack.Navigator>
  );
}

const renderTopBar = (props) => <NavBar {...props} />;

export default function MainTabs() {
  return (
    <Tabs.Navigator
      // iOS has no hardware back; 'none' stops VoiceOver's back gesture jumping between sections.
      backBehavior={Platform.OS === 'ios' ? 'none' : 'firstRoute'}
      tabBar={renderTopBar}
      screenOptions={{ headerShown: false, tabBarPosition: 'top' }}
    >
      <Tabs.Screen name="HomeTab" component={HomeSection} />
      <Tabs.Screen name="FavouritesTab" component={FavouritesSection} />
      <Tabs.Screen name="SpinTab" component={SpinTheWheel} />
      <Tabs.Screen name="ProfileTab" component={ProfileSettings} />
    </Tabs.Navigator>
  );
}
