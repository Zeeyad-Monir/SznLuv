// Every number the Explore ranking uses, in one place. These are starting points to tune against real
// activity (docs/EXPLORE_RECS.md); changing them here needs a functions deploy, not an app release.
const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = {
  ALGO_VERSION: 'recs-1',
  DAY_MS,

  // How much each part of a list's score counts. They add up to 1.
  WEIGHTS: { interest: 0.35, quality: 0.2, momentum: 0.15, geo: 0.1, season: 0.1, freshness: 0.05, social: 0.05 },

  // One page of 20, by the main reason a list is there. Short pools hand their places to the best of the rest.
  PAGE: 20,
  FEED_SIZE: 60,
  PAGE_PATTERN: [
    'personal', 'trending', 'personal', 'fresh', 'personal', 'quality', 'trending', 'personal', 'fresh', 'discover',
    'personal', 'trending', 'quality', 'fresh', 'personal', 'trending', 'fresh', 'quality', 'personal', 'discover',
  ],
  MAX_PER_CREATOR: 2, // In one page

  // What a user's actions say about their interests, relative to each other.
  SIGNALS: { savedSpot: 3, followedList: 3, savedCollection: 0.5, open: 0.5 },
  SHORT_WINDOW_DAYS: 30,
  SHORT_HALF_LIFE_DAYS: 14,
  LONG_SHARE: 0.6, // The rest is the last 30 days
  MIN_INTEREST: 0.05, // Below this a list isn't "for you", it's just a list

  // A spot's features, before they are averaged over its list.
  SPOT_FEATURES: { category: 1, tag: 0.6, locality: 0.5, season: 0.4 },
  MAX_FEATURES: 12,

  NEW_DAYS: 14,
  NEW_MIN_SPOTS: 2,
  FRESH_HALF_LIFE_DAYS: 21,

  // Trending needs a few different people, not one or two taps.
  TREND_MIN_FOLLOWS: 3,
  TREND_FULL: 60,
  FOLLOW_DAYS: 30,
  POPULAR_FOLLOWERS: 50, // Lifetime followers stop counting for more past this
  POPULARITY_SHARE: 0.25, // Of the quality score

  SEASON_SCORES: { current: 1, evergreen: 0.6, other: 0.2 },
  GEO_SCORES: { sameCity: 0.7, unknownCity: 0.5, otherCity: 0.2, locality: 0.3 },
  DISCOVER_MIN_QUALITY: 0.4,
  JITTER: 0.02, // So a pull to refresh isn't word for word the same page

  // The index of public lists, spread over a fixed number of documents (about 1,000 lists each).
  SHARDS: 4,
  INDEX_TTL_MS: 10 * 60 * 1000,
  RECONCILE_EVERY_DAYS: 7,

  // What one request may send.
  LIMITS: { savedSpots: 300, followedLists: 300, followedOwners: 300, blocked: 300, opens: 100, savedSeasons: 8 },
};
