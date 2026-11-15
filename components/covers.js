// The app's illustrations, by what they stand for. Every card looks its art up here, so replacing an
// illustration is a change to one line of this file. These are the small copies the app draws: after adding
// or changing an original in assets/, list it in scripts/optimize-images.cjs and run that script.

// The season illustrations a list can use as its cover on tiles.
export const SEASON_ART = {
  fall: require('../assets/optimized/fall2.jpg'),
  winter: require('../assets/optimized/winter2.jpg'),
  spring: require('../assets/optimized/spring2.jpg'),
  summer: require('../assets/optimized/summer3.jpg'),
};

// Each season illustration's overall colour, behind its card so the card is never blank while the picture loads.
export const SEASON_TINT = { fall: '#D98D54', winter: '#9CB2D1', spring: '#DEAAB8', summer: '#F1D772' };

// A city's cover on the city picker, by the city's id in services/catalogue.js.
export const CITY_ART = {
  vancouver: require('../assets/optimized/VancouverCoverIMG.jpg'),
};

// Home's collection cards, by the card's key in services/collections.js.
// Only Seasonal has its own illustration so far. The rest borrow one the app already ships until theirs is drawn.
const COLLECTION_ART = {
  seasonal: require('../assets/optimized/VancouverSeasonalCollectionCover.jpg'),
  outdoors: require('../assets/optimized/VancouverOutdoorsCollectionCover.jpg'),
  'unique-food': require('../assets/optimized/VancouverFoodCollectionCover.jpg'),
  'night-out': require('../assets/optimized/VancouverNightOutCollectionCover.jpg'),
  // The picks Home's large card rotates through (services/collections.js CURATED).
  'rain-days': require('../assets/optimized/VancouverRainDaysCollectionCover.jpg'),
  'golden-hour': require('../assets/optimized/VancouverGoldenHourCollectionCover.jpg'),
  'table-for-one': require('../assets/optimized/VancouverTableForOneCollectionsCover.jpg'),
};

// Undefined when a key has no art: the card then draws its plain tinted background instead.
export const collectionArt = key => COLLECTION_ART[key] ?? SEASON_ART[key];

// The other cover images a list can use, by the value in services/listsState.js IMAGE_COVERS.
export const IMAGE_ART = {
  ...COLLECTION_ART,
  vancouver: CITY_ART.vancouver,
  seasons: require('../assets/optimized/SeasonalCoverIMG.jpg'),
};

// Behind the Saved page's "Add Your Own Spot" banner.
export const ADD_SPOT_ART = require('../assets/optimized/AddOwnSpotBanner.jpg');

// A list's cover image, or undefined for a colour cover from before covers were images.
export const coverArt = cover => {
  if (cover?.type === 'season') return SEASON_ART[cover.value];
  if (cover?.type === 'image') return IMAGE_ART[cover.value];
  return undefined;
};
