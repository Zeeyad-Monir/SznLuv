// The radius slider runs 1 to 200 km. Its stops are closer together near the start, so a short distance is as
// easy to pick as a long one: 1 to 10 km by 1, then by 5 to 50 km, then by 10 to 200 km.
const RADIUS_MIN = 1;
const RADIUS_MAX = 200;
const RADIUS_DEFAULT = 25;
const RADIUS_STOPS = [
  ...Array.from({ length: 10 }, (_, step) => step + 1),
  ...Array.from({ length: 8 }, (_, step) => 15 + step * 5),
  ...Array.from({ length: 15 }, (_, step) => 60 + step * 10),
];

// The stop nearest a value, so a radius saved before the slider (or typed by a test) still lands on the track.
function nearestStop(km) {
  return RADIUS_STOPS.reduce((best, stop, index) => (
    Math.abs(stop - km) < Math.abs(RADIUS_STOPS[best] - km) ? index : best), 0);
}

// Where a radius sits along the track, from 0 at 1 km to 1 at 200 km.
function radiusPosition(km) {
  return nearestStop(km) / (RADIUS_STOPS.length - 1);
}

// The radius at a point along the track (0 to 1).
function radiusAt(position) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(position) ? position : 0));
  return RADIUS_STOPS[Math.round(clamped * (RADIUS_STOPS.length - 1))];
}

// One stop further (+1) or nearer (-1), held at the ends.
function stepRadius(km, direction) {
  const next = Math.min(RADIUS_STOPS.length - 1, Math.max(0, nearestStop(km) + direction));
  return RADIUS_STOPS[next];
}

// The empty state's way out: twice as far, up to the end of the track.
function widerRadius(km) {
  return km >= RADIUS_MAX ? null : RADIUS_STOPS[nearestStop(Math.min(RADIUS_MAX, km * 2))];
}

const DEFAULT_FILTERS = { categories: [], radiusKm: null, sort: 'catalogue', origin: null };

function hasCoordinates(point) {
  return !!point
    && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

function distanceKm(from, to) {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const halfChord = Math.sin(latitude / 2) ** 2
    + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(Math.min(1, halfChord)));
}

function normalize(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const QUERY_FILLER = new Set([
  'a', 'an', 'the', 'and', 'in', 'at', 'on', 'with', 'near', 'around', 'for', 'to', 'of',
  'can', 'i', 'we', 'where', 'what', 'find', 'see', 'me', 'place', 'places', 'spot', 'spots',
  'thing', 'things', 'do', 'go', 'looking', 'visit', 'is', 'are', 'there',
]);

function queryWords(normalized) {
  return normalized.split(' ').filter(word => word && !QUERY_FILLER.has(word));
}

function normalizeRanked(text) {
  return normalize(text).replace(/\bbird watching\b/g, 'birdwatching').replace(/\bhay rides?\b/g, 'hayride');
}

function wordForm(word) {
  if (word === 'leaves') return 'leaf';
  if (word === 'autumn') return 'fall';
  const spelling = word.replace(/^colour/, 'color');
  if (spelling === 'color' || spelling === 'colors') return 'foliage';
  if (spelling.length < 4) return spelling;
  if (spelling.length > 4 && spelling.endsWith('ies')) return spelling.slice(0, -3) + 'y';
  if (/(?:ch|sh|ss|x|zz)es$/.test(spelling)) return spelling.slice(0, -2);
  return /[^su]s$/.test(spelling) ? spelling.slice(0, -1) : spelling;
}

function rankedEntry(spot) {
  const name = normalizeRanked(spot.name);
  const title = normalizeRanked(spot.title || '');
  const fields = [
    [name, 16],
    [[title, spot.address, spot.detailAddress].filter(Boolean).join(' '), 8],
    [(spot.searchTags ?? []).join(' '), 4],
    [spot.description || spot.tagline || '', 2],
  ].map(([text, weight]) => {
    const words = normalizeRanked(text).split(' ').filter(Boolean);
    return { words, forms: new Set(words.map(wordForm)), weight };
  });
  return { spot, name, title, fields };
}

function relevance(entry, query, terms, categoryMatch) {
  if (entry.name === query) return Number.MAX_SAFE_INTEGER;
  if (entry.title === query) return Number.MAX_SAFE_INTEGER - 1;

  let score = 0;
  for (const { word, form } of terms) {
    let best = 0;
    for (const { words, forms, weight } of entry.fields) {
      if (forms.has(form)) {
        best = Math.max(best, weight * 2);
      } else if (words.some(candidate => candidate.startsWith(word))) {
        best = Math.max(best, weight);
      }
    }
    if (!best) return categoryMatch ? 0 : null;
    score += best;
  }
  return score;
}

function createSpotIndex(sections, { categories = true, distance = true, alphabetical = true, rankSearch = false } = {}) {
  const categoryOptions = sections.filter(section => section.spots.length).map(section => section.title);
  return {
    categoryOptions: categories && categoryOptions.length > 1 ? categoryOptions : [],
    supportsDistance: distance && sections.some(section => section.spots.some(hasCoordinates)),
    alphabetical,
    rankSearch,
    sections: sections.map(({ title, spots }, index) => ({
      title,
      index,
      categoryQuery: rankSearch ? queryWords(normalizeRanked(title)).join(' ') : null,
      entries: rankSearch ? spots.map(rankedEntry) : spots.map(spot => ({
        spot,
        searchText: normalize([spot.name, spot.address, title, spot.tagline].filter(Boolean).join(' ')),
      })),
    })),
  };
}

function usesOrigin(filters) {
  return filters.radiusKm !== null || filters.sort === 'nearest';
}

// `listIds` is only set by the Map tab, where saved spots can be narrowed to chosen lists.
function hasActiveFilters(filters) {
  return filters.categories.length > 0 || filters.radiusKm !== null || filters.sort !== 'catalogue'
    || (filters.listIds?.length ?? 0) > 0;
}

function withoutCurrentLocation(filters) {
  if (filters.origin?.source !== 'current') return filters;
  return {
    ...filters,
    origin: null,
    radiusKm: null,
    sort: filters.sort === 'nearest' ? 'catalogue' : filters.sort,
  };
}

// "Current location" means where the person is now, not where they were when they chose it. A fresh fix is
// written into every filter measured from there; other filters, and one already at that spot, are unchanged.
function withCurrentPosition(filters, position) {
  if (filters.origin?.source !== 'current' || !hasCoordinates(position)) return filters;
  const { latitude, longitude } = position;
  const accuracyM = Number.isFinite(position.accuracy) ? position.accuracy : null;
  const { origin } = filters;
  if (origin.latitude === latitude && origin.longitude === longitude && origin.accuracyM === accuracyM) return filters;
  return { ...filters, origin: { ...origin, latitude, longitude, accuracyM } };
}

// iOS without Precise Location, and Android with coarse location, place you only within a few kilometres.
const APPROXIMATE_M = 1000;
function isApproximate(origin) {
  return origin?.source === 'current' && Number.isFinite(origin.accuracyM) && origin.accuracyM > APPROXIMATE_M;
}

function findMatchingSpots(index, query, filters) {
  const normalized = index.rankSearch ? normalizeRanked(query) : normalize(query);
  const words = index.rankSearch ? queryWords(normalized) : normalized.split(' ').filter(Boolean);
  const ranked = index.rankSearch && words.length > 0;
  const terms = ranked ? words.map(word => ({ word, form: wordForm(word) })) : [];
  const categoryQuery = ranked ? words.join(' ') : null;
  const origin = index.supportsDistance && usesOrigin(filters) && hasCoordinates(filters.origin)
    ? filters.origin : null;
  const radius = origin ? filters.radiusKm : null;
  const categories = new Set(filters.categories.filter(title => index.categoryOptions.includes(title)));
  const groups = [];
  let count = 0;
  for (const section of index.sections) {
    if (categories.size && !categories.has(section.title)) continue;
    const matches = [];
    // A full category label can match the group. Individual activity words must match the spot itself.
    const categoryMatch = ranked && categoryQuery === section.categoryQuery;
    for (const entry of section.entries) {
      const { spot, searchText } = entry;
      const score = ranked ? relevance(entry, normalized, terms, categoryMatch) : 0;
      if (score === null || (!index.rankSearch && !words.every(word => searchText.includes(word)))) continue;
      const distance = origin && hasCoordinates(spot) ? distanceKm(origin, spot) : Infinity;
      if (radius !== null && distance > radius) continue;
      matches.push({ spot, distance, score });
    }
    if (matches.length) {
      groups.push({ title: section.title, index: section.index, matches });
      count += matches.length;
    }
  }

  const nearest = filters.sort === 'nearest' && !!origin;
  const alphabetical = filters.sort === 'alphabetical' && index.alphabetical;
  if (count && (nearest || alphabetical || ranked)) {
    const matches = groups.flatMap(group => group.matches);
    if (nearest || alphabetical) {
      matches.sort((a, b) => (nearest ? a.distance - b.distance : 0)
        || a.spot.name.localeCompare(b.spot.name, 'en', { sensitivity: 'base' }));
    } else {
      matches.sort((a, b) => b.score - a.score);
    }
    return { count, sections: [{ title: null, index: 0, spots: matches.map(match => match.spot) }] };
  }
  return {
    count,
    sections: groups.map(({ title, index, matches }) => ({
      title, index, spots: matches.map(match => match.spot),
    })),
  };
}

module.exports = {
  RADIUS_MIN, RADIUS_MAX, RADIUS_DEFAULT, RADIUS_STOPS, radiusAt, radiusPosition, stepRadius, widerRadius,
  DEFAULT_FILTERS, hasCoordinates, distanceKm, createSpotIndex,
  usesOrigin, hasActiveFilters, withoutCurrentLocation, withCurrentPosition, isApproximate, findMatchingSpots,
  normalize, wordForm,
};
