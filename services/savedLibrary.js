// Search, filters and sort for the Saved page and its two "View all" pages. Plain CommonJS so it can be
// unit-tested directly. Every item is { name, meta?, season?, own?, savedAt? }: a saved spot or a saved collection.
const SEASONS = ['Fall', 'Winter', 'Spring', 'Summer'];

const SORTS = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'season', label: 'Season' },
];
const TYPES = [
  { value: 'all', label: 'All spots' },
  { value: 'sznluv', label: 'SznLuv spots' },
  { value: 'own', label: 'Your spots' },
];

const DEFAULT_SAVED_FILTERS = Object.freeze({ sort: 'recent', seasons: [], type: 'all' });

const isDefaultFilters = filters => filters.sort === DEFAULT_SAVED_FILTERS.sort
  && !filters.seasons.length && filters.type === DEFAULT_SAVED_FILTERS.type;

const sortLabel = sort => SORTS.find(option => option.value === sort)?.label ?? SORTS[0].label;

// Lower case without accents, so "cafe" finds "Café".
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const byName = (a, b) => String(a.name).localeCompare(String(b.name));
const seasonRank = item => {
  const index = SEASONS.indexOf(item.season);
  return index === -1 ? SEASONS.length : index;
};
const COMPARE = {
  // Newest first. Anything saved before saves were dated goes last, by name.
  recent: (a, b) => (b.savedAt ?? -Infinity) - (a.savedAt ?? -Infinity) || byName(a, b),
  name: byName,
  season: (a, b) => seasonRank(a) - seasonRank(b) || byName(a, b),
};

// Every word typed must appear in the name, where it is, or its season.
function matchesQuery(item, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold([item.name, item.meta, item.locality, item.season].filter(Boolean).join(' '));
  return words.every(word => haystack.includes(word));
}

function filterSaved(items, { query = '', seasons = [], type = 'all', sort = 'recent' } = {}) {
  return items
    .filter(item => matchesQuery(item, query))
    // A spot of your own has no season, so choosing a season leaves it out.
    .filter(item => !seasons.length || seasons.includes(item.season))
    .filter(item => type === 'all' || (type === 'own' ? !!item.own : !item.own))
    .sort(COMPARE[sort] ?? COMPARE.recent);
}

module.exports = { SEASONS, SORTS, TYPES, DEFAULT_SAVED_FILTERS, isDefaultFilters, sortLabel, matchesQuery, filterSaved };
