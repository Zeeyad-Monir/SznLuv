// The season illustrations a list can use as its cover on tiles.
export const SEASON_ART = {
  fall: require('../assets/fall2.png'),
  winter: require('../assets/winter2.png'),
  spring: require('../assets/spring2.png'),
  summer: require('../assets/summer3.png'),
};

export const seasonArt = cover => (cover?.type === 'season' ? SEASON_ART[cover.value] : undefined);
