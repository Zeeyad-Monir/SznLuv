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

function createSpotIndex(sections, { categories = true, distance = true, alphabetical = true } = {}) {
  const categoryOptions = sections.filter(section => section.spots.length).map(section => section.title);
  return {
    categoryOptions: categories && categoryOptions.length > 1 ? categoryOptions : [],
    supportsDistance: distance && sections.some(section => section.spots.some(hasCoordinates)),
    alphabetical,
    sections: sections.map(({ title, spots }, index) => ({
      title,
      index,
      entries: spots.map(spot => ({
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
  const terms = normalize(query).split(' ').filter(Boolean);
  const origin = index.supportsDistance && usesOrigin(filters) && hasCoordinates(filters.origin)
    ? filters.origin : null;
  const radius = origin ? filters.radiusKm : null;
  const categories = new Set(filters.categories.filter(title => index.categoryOptions.includes(title)));
  const groups = [];
  let count = 0;
  for (const section of index.sections) {
    if (categories.size && !categories.has(section.title)) continue;
    const matches = [];
    for (const { spot, searchText } of section.entries) {
      if (!terms.every(term => searchText.includes(term))) continue;
      const distance = origin && hasCoordinates(spot) ? distanceKm(origin, spot) : Infinity;
      if (radius !== null && distance > radius) continue;
      matches.push({ spot, distance });
    }
    if (matches.length) {
      groups.push({ title: section.title, index: section.index, matches });
      count += matches.length;
    }
  }

  const nearest = filters.sort === 'nearest' && !!origin;
  if (count && (nearest || (filters.sort === 'alphabetical' && index.alphabetical))) {
    const matches = groups.flatMap(group => group.matches);
    matches.sort((a, b) => (nearest ? a.distance - b.distance : 0)
      || a.spot.name.localeCompare(b.spot.name, 'en', { sensitivity: 'base' }));
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
};
