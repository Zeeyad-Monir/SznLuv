// Collections the app makes: each city's seasons today, other categories later. A user keeps one by tapping
// its heart, and it then appears in My lists. Plain CommonJS so it can be unit-tested directly.
//
// Every collection has an ID that is unique across cities ("vancouver-fall"), so two cities' Fall
// collections are two different things to save. Saving one stores only that ID: the spots are read from
// the catalogue each time, so a spot SznLuv adds later shows up for everyone who saved it.
const { CITIES, catalogueSpots, cityName } = require('./catalogue');

const SEASON_SCREENS = [
  { season: 'Fall', screen: 'FallDatesScreen' },
  { season: 'Winter', screen: 'WinterDatesScreen' },
  { season: 'Spring', screen: 'SpringDatesScreen' },
  { season: 'Summer', screen: 'SummerDatesScreen' },
];

// A future category is one more entry with its own `kind` and a rule in `collectionSpots`.
const COLLECTIONS = CITIES.flatMap(city => SEASON_SCREENS.map(({ season, screen }) => ({
  id: `${city.id}-${season.toLowerCase()}`,
  cityId: city.id,
  kind: 'season',
  key: season.toLowerCase(),
  title: season,
  season,
  screen,
})));

const byId = new Map(COLLECTIONS.map(collection => [collection.id, collection]));

const collectionById = id => byId.get(id);
const collectionsForCity = cityId => COLLECTIONS.filter(collection => collection.cityId === cityId);

// The catalogue holds one city today, so a season's spots are that city's. Once spots carry a city,
// this also matches on `collection.cityId`.
function collectionSpots(id) {
  const collection = byId.get(id);
  if (!collection) return [];
  if (collection.kind === 'season') return catalogueSpots.filter(spot => spot.season === collection.season);
  return [];
}

// "Vancouver · 43 spots": the city tells apart collections that share a name.
function collectionCaption(id) {
  const collection = byId.get(id);
  if (!collection) return '';
  const count = collectionSpots(id).length;
  return `${cityName(collection.cityId)} · ${count} ${count === 1 ? 'spot' : 'spots'}`;
}

module.exports = { COLLECTIONS, collectionById, collectionsForCity, collectionSpots, collectionCaption };
