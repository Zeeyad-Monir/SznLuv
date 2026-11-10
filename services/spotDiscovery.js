const DISTANCE_OPTIONS = [null, 5, 10, 25, 50, 100];
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

function hasActiveFilters(filters) {
  return filters.categories.length > 0 || filters.radiusKm !== null || filters.sort !== 'catalogue';
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
  DISTANCE_OPTIONS, DEFAULT_FILTERS, hasCoordinates, distanceKm, createSpotIndex,
  usesOrigin, hasActiveFilters, withoutCurrentLocation, findMatchingSpots,
  normalize, wordForm,
};
