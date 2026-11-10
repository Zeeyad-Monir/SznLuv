// Every spot the app ships, across all seasons, for lists, Top 4 and search.
// Plain CommonJS so it can be unit-tested directly.
const { fallCategories } = require('./spots');
const { winterCategories, springCategories, summerCategories } = require('./seasonSpots');

// Lists and Top 4 are keyed by city so a second city needs no data change.
const CITIES = [{ id: 'vancouver', name: 'Vancouver', latitude: 49.2827, longitude: -123.1207 }];
const DEFAULT_CITY = CITIES[0];
const cityName = cityId => CITIES.find(city => city.id === cityId)?.name ?? DEFAULT_CITY.name;

const SEASONS = [
  { season: 'Fall', categories: fallCategories },
  { season: 'Winter', categories: winterCategories },
  { season: 'Spring', categories: springCategories },
  { season: 'Summer', categories: summerCategories },
];

// "24990 84 Ave, Langley" -> "Langley". Placeholder addresses without a town have none.
function locality(address) {
  if (typeof address !== 'string' || !address.includes(',')) return '';
  return address.slice(address.lastIndexOf(',') + 1).trim();
}

const catalogueSpots = SEASONS.flatMap(({ season, categories }) => categories.flatMap(category => (
  category.spots.map(spot => ({ ...spot, season, category: category.title, locality: locality(spot.address) }))
)));
const byName = new Map(catalogueSpots.map(spot => [spot.name, spot]));

const findCatalogueSpot = name => byName.get(name);
const seasonOf = name => byName.get(name)?.season;

// One search section per season, in the shape services/spotDiscovery.js indexes.
const catalogueSections = SEASONS.map(({ season }) => ({
  title: season,
  spots: catalogueSpots.filter(spot => spot.season === season),
}));

// A list or Top 4 entry points at a spot: { k: 'c', name } for a catalogue spot,
// or { k: 'x', id, name, address?, lat?, lng? } for one a user added themselves.
const catalogueRef = name => ({ k: 'c', name });
const spotKey = ref => (ref.k === 'c' ? `c:${ref.name}` : `x:${ref.id}`);
const isOwnSpot = ref => ref.k === 'x';

const hasPin = ref => Number.isFinite(ref.lat) && Number.isFinite(ref.lng);

// Where an own spot is, in words, for cards and for the "what people will see" review.
function describeWhere(ref) {
  if (ref.address) return ref.address;
  return hasPin(ref) ? `Dropped pin (${ref.lat.toFixed(4)}, ${ref.lng.toFixed(4)})` : '';
}

// Everything a card, tile or map marker needs to draw a spot reference.
function resolveSpot(ref) {
  if (ref.k === 'c') {
    const spot = byName.get(ref.name);
    if (!spot) return { key: spotKey(ref), name: ref.name, meta: 'No longer listed', missing: true, own: false };
    return {
      key: spotKey(ref),
      name: spot.name,
      meta: [spot.locality, spot.season].filter(Boolean).join(' · '),
      season: spot.season,
      locality: spot.locality,
      latitude: spot.latitude,
      longitude: spot.longitude,
      missing: false,
      own: false,
    };
  }
  return {
    key: spotKey(ref),
    name: ref.name,
    meta: ref.address ? (locality(ref.address) || ref.address) : 'Dropped pin',
    locality: locality(ref.address),
    latitude: hasPin(ref) ? ref.lat : undefined,
    longitude: hasPin(ref) ? ref.lng : undefined,
    missing: false,
    own: true,
  };
}

module.exports = {
  CITIES, DEFAULT_CITY, cityName, locality, catalogueSpots, catalogueSections,
  findCatalogueSpot, seasonOf, catalogueRef, spotKey, isOwnSpot, hasPin, describeWhere, resolveSpot,
};
