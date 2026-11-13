// Collections the app makes for each city: its seasons, and themes that cut across seasons (Outdoors).
// A user keeps a season by tapping its heart, and it then appears in My lists. Home's cards, its featured
// card and "All spots" are all read from here. Plain CommonJS so it can be unit-tested directly.
//
// Every collection has an ID that is unique across cities ("vancouver-fall"), so two cities' Fall
// collections are two different things to save. Saving one stores only that ID: the spots are read from
// the catalogue each time, so a spot SznLuv adds later shows up for everyone who saved it.
const { CITIES, catalogueSpots, cityName } = require('./catalogue');
const { SEASON_NAMES, currentSeason } = require('./listSearch');

const SEASON_SCREENS = [
  { season: 'Fall', screen: 'FallDatesScreen' },
  { season: 'Winter', screen: 'WinterDatesScreen' },
  { season: 'Spring', screen: 'SpringDatesScreen' },
  { season: 'Summer', screen: 'SummerDatesScreen' },
];

// A theme gathers the catalogue categories named for it, whatever their season. One with no categories yet
// still has a card on Home, marked "Coming soon": naming a category here is all it takes to switch it on.
const THEMES = [
  { key: 'unique-food', title: 'Unique Food', categories: [] },
  { key: 'night-out', title: 'Night Out', categories: [] },
  { key: 'outdoors', title: 'Outdoors', categories: ['Fall Colour Walks', 'Salmon & Wildlife'] },
];
const THEME_SCREEN = 'CollectionSpots';

// Hand-picked collections that cut across categories, by spot `name` (services/spots.js), in the order shown.
// They are not grid tiles: Home's large card rotates through them, and they open like a theme. A spot named
// here that the catalogue no longer has is simply left out; one with no spots left drops out of the rotation.
// `title` and `tagline` are what the large card says; `art` names an illustration in components/covers.js.
const CURATED = {
  vancouver: [
    {
      key: 'rain-days', title: 'Better in the rain', tagline: '165 rainy days a year. Lean in.', art: 'rain-days',
      spotNames: [
        'Sun Yat-Sen Garden Moon Palace', 'VanDusen Mushroom Show', 'Pacific Spirit Park', 'Lost Souls of Gastown',
        'Haunted Halloween Trolley', 'Burnaby Haunted Village', 'Taves Family Farms', 'Krause Berry Farms',
      ],
    },
    {
      key: 'golden-hour', title: 'Golden hour', tagline: 'Where the light turns gold', art: 'golden-hour',
      spotNames: [
        'Burnaby Mountain Park', 'Wings Over Iona', 'Queen Elizabeth Park', 'Reifel Bird Sanctuary', 'Deer Lake Park',
        'Stanley Park', 'Buntzen Lake',
      ],
    },
    {
      key: 'table-for-one', title: 'Table for one', tagline: 'Quiet spots made for going solo', art: 'table-for-one',
      spotNames: [
        'Nitobe Memorial Garden', 'UBC Main Mall', 'Pacific Spirit Park', 'VanDusen Harvest Days', 'Reifel Bird Sanctuary',
        'Tynehead Hatchery', 'Trout Lake', 'Campbell Valley Park',
      ],
    },
  ],
};

const COLLECTIONS = CITIES.flatMap(city => [
  ...SEASON_SCREENS.map(({ season, screen }) => ({
    id: `${city.id}-${season.toLowerCase()}`,
    cityId: city.id,
    kind: 'season',
    key: season.toLowerCase(),
    title: season,
    season,
    screen,
  })),
  ...THEMES.map(({ key, title, categories }) => ({
    id: `${city.id}-${key}`,
    cityId: city.id,
    kind: 'theme',
    key,
    title,
    categories,
    screen: THEME_SCREEN,
  })),
  ...(CURATED[city.id] ?? []).map(({ key, title, tagline, art, spotNames }) => ({
    id: `${city.id}-${key}`,
    cityId: city.id,
    kind: 'curated',
    key,
    title,
    tagline,
    art,
    spotNames,
    screen: THEME_SCREEN,
  })),
]);

const byId = new Map(COLLECTIONS.map(collection => [collection.id, collection]));

const collectionById = id => byId.get(id);
// A city's season collections, or with `kind: 'theme'` / `'curated'` its themes or hand-picked ones.
const collectionsForCity = (cityId, kind = 'season') => (
  COLLECTIONS.filter(collection => collection.cityId === cityId && collection.kind === kind)
);

// A collection only ever holds its own city's spots, so a city with no spots has empty collections.
function collectionSpots(id) {
  const collection = byId.get(id);
  if (!collection) return [];
  const inCity = catalogueSpots.filter(spot => spot.cityId === collection.cityId);
  if (collection.kind === 'season') return inCity.filter(spot => spot.season === collection.season);
  if (collection.kind === 'theme') return inCity.filter(spot => collection.categories.includes(spot.category));
  if (collection.kind === 'curated') {
    const byName = new Map(inCity.map(spot => [spot.name, spot]));
    return collection.spotNames.map(name => byName.get(name)).filter(Boolean);
  }
  return [];
}

// A theme's spots under the category each came from, in the shape services/spotDiscovery.js indexes.
// A curated collection has no categories of its own, so it uses its spots' categories, first seen first.
function collectionSections(id) {
  const spots = collectionSpots(id);
  const collection = byId.get(id);
  const categories = collection?.kind === 'curated'
    ? [...new Set(spots.map(spot => spot.category))]
    : (collection?.categories ?? []);
  return categories
    .map(title => ({ title, spots: spots.filter(spot => spot.category === title) }))
    .filter(section => section.spots.length > 0);
}

// Every spot in a city, one section per season, for "All spots".
function citySpotSections(cityId) {
  const spots = catalogueSpots.filter(spot => spot.cityId === cityId);
  return SEASON_NAMES
    .map(season => ({ title: season, spots: spots.filter(spot => spot.season === season) }))
    .filter(section => section.spots.length > 0);
}

// "Vancouver · 43 spots": the city tells apart collections that share a name.
function collectionCaption(id) {
  const collection = byId.get(id);
  if (!collection) return '';
  const count = collectionSpots(id).length;
  return `${cityName(collection.cityId)} · ${count} ${count === 1 ? 'spot' : 'spots'}`;
}

const hasSpots = collection => collectionSpots(collection.id).length > 0;
const openCollection = collection => (collection.kind !== 'season'
  ? { screen: collection.screen, params: { collectionId: collection.id } }
  : { screen: collection.screen });

// The cards under "Browse collections". Seasonal opens the season cards; a theme opens its own spots.
// `available: false` is a card with nothing behind it yet: Home shows it as "Coming soon" and it opens nothing.
// Cards with something to open come first, so a row is never half empty.
function homeCollections(cityId) {
  const cards = [
    {
      key: 'seasonal',
      art: 'seasonal',
      title: 'Seasonal',
      available: collectionsForCity(cityId, 'season').some(hasSpots),
      target: { screen: 'SeasonsScreen' },
    },
    ...collectionsForCity(cityId, 'theme').map(collection => ({
      key: collection.key,
      art: collection.key,
      title: collection.title,
      available: hasSpots(collection),
      target: openCollection(collection),
    })),
  ];
  return [...cards.filter(card => card.available), ...cards.filter(card => !card.available)];
}

// Home's large card, which rotates: one slide per curated collection of this city that has spots. A city with
// none gets the season it is now, alone; one with nothing to feature gets [], and Home leaves the card out.
function featuredRotation(cityId, date = new Date()) {
  const curated = collectionsForCity(cityId, 'curated').filter(hasSpots);
  if (curated.length > 0) {
    return curated.map(collection => ({
      key: collection.key, art: collection.art ?? collection.key, title: collection.title, subtitle: collection.tagline,
      target: openCollection(collection),
    }));
  }
  const season = collectionsForCity(cityId, 'season').find(collection => collection.season === currentSeason(date));
  if (!season || !hasSpots(season)) return [];
  return [{
    key: season.key,
    art: season.key,
    title: `${season.title} in ${cityName(cityId)}`,
    subtitle: `Explore the ${season.title} collection`,
    target: openCollection(season),
  }];
}

module.exports = {
  COLLECTIONS, THEMES, collectionById, collectionsForCity, collectionSpots, collectionSections, citySpotSections,
  collectionCaption, homeCollections, featuredRotation,
};
