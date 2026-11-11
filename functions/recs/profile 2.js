// What one person is into, from what they saved, follow and opened. Built fresh for each request from
// signals the app sends about its own user; nothing about a person is stored on the server. Pure functions.
const config = require('./config');
const { spotFeatures, unit, slug, SEASON_NAMES } = require('./features');

const addScaled = (vector, features, scale) => {
  if (!(scale > 0)) return;
  Object.entries(features).forEach(([key, weight]) => { vector[key] = (vector[key] ?? 0) + weight * scale; });
};

// How much a dated action still counts towards "lately": halves every two weeks, gone after thirty days.
function recency(at, now) {
  if (!Number.isFinite(at)) return 0; // Undated saves (from before saves had dates) are long-term only
  const days = (now - at) / config.DAY_MS;
  if (days < 0 || days > config.SHORT_WINDOW_DAYS) return 0;
  return 0.5 ** (days / config.SHORT_HALF_LIFE_DAYS);
}

// `entries` is the index by list id, for the features of lists the person follows or opened.
function buildProfile(signals = {}, entries = {}, now = Date.now()) {
  const long = {}, short = {};
  const count = (features, weight, at) => {
    addScaled(long, features, weight);
    addScaled(short, features, weight * recency(at, now));
  };

  for (const spot of signals.savedSpots ?? []) {
    const key = String(spot?.key ?? '');
    // Spots people made can't be read here; the lists they came from carry that interest instead.
    if (key.startsWith('c:')) count(spotFeatures({ k: 'c', name: key.slice(2) }), config.SIGNALS.savedSpot, spot.at);
  }
  for (const followed of signals.followedLists ?? []) {
    const entry = entries[followed?.id];
    if (entry?.features) count(entry.features, config.SIGNALS.followedList, followed.at);
  }
  // A saved seasonal collection says "I like fall", not "I saved every fall spot".
  for (const season of signals.savedSeasons ?? []) {
    if (SEASON_NAMES.some(name => name.toLowerCase() === slug(season))) {
      addScaled(long, { [`season:${slug(season)}`]: 1 }, config.SIGNALS.savedCollection);
    }
  }
  // Opening a list is a weak hint, and only about right now.
  for (const opened of signals.opens ?? []) {
    const entry = entries[opened?.id];
    if (entry?.features) addScaled(short, entry.features, config.SIGNALS.open * recency(opened.at, now));
  }

  const longUnit = unit(long), shortUnit = unit(short);
  const hasLong = Object.keys(longUnit).length > 0, hasShort = Object.keys(shortUnit).length > 0;
  const mixed = {};
  addScaled(mixed, longUnit, hasShort ? config.LONG_SHARE : 1);
  addScaled(mixed, shortUnit, hasLong ? 1 - config.LONG_SHARE : 1);

  return {
    vector: unit(mixed),
    empty: !hasLong && !hasShort,
    followedOwners: new Set(signals.followedOwners ?? []),
    followedListIds: new Set((signals.followedLists ?? []).map(followed => followed?.id).filter(Boolean)),
    blocked: new Set(signals.blocked ?? []),
  };
}

module.exports = { buildProfile, recency };
