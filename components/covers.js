// The app's illustrations, by what they stand for. Every card looks its art up here, so replacing an
// illustration is a change to one line of this file.

// The season illustrations a list can use as its cover on tiles.
export const SEASON_ART = {
  fall: require('../assets/fall2.png'),
  winter: require('../assets/winter2.png'),
  spring: require('../assets/spring2.png'),
  summer: require('../assets/summer3.png'),
};

export const seasonArt = cover => (cover?.type === 'season' ? SEASON_ART[cover.value] : undefined);

// A city's cover on the city picker, by the city's id in services/catalogue.js.
export const CITY_ART = {
  vancouver: require('../assets/cities/VancouverCoverIMG.png'),
};

// Home's collection cards, by the card's key in services/collections.js.
// Only Seasonal has its own illustration so far. The rest borrow one the app already ships until theirs is drawn.
const COLLECTION_ART = {
  seasonal: require('../assets/Seasonal/SeasonalCoverIMG.png'),
  outdoors: require('../assets/summer.png'),
  'unique-food': require('../assets/spring.png'),
  'night-out': require('../assets/winter.png'),
  // The featured "A morning outdoors" card, so it doesn't repeat the Outdoors card beneath it.
  'morning-outdoors': require('../assets/fall.png'),
};

// Undefined when a key has no art: the card then draws its plain tinted background instead.
export const collectionArt = key => COLLECTION_ART[key] ?? SEASON_ART[key];
