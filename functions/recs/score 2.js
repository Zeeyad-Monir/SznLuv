// How well one list suits one person right now. Every part is 0..1 so the weights in config.js mean what
// they say. Missing information is scored as neutral, never as bad. Pure functions.
const config = require('./config');
const { dot } = require('./features');

const clamp = value => Math.max(0, Math.min(1, value));
const dayNumber = time => Math.floor(time / config.DAY_MS);

// Sep–Nov Fall, Dec–Feb Winter, Mar–May Spring, Jun–Aug Summer (same as services/listSearch.js).
function currentSeason(now) {
  const month = new Date(now).getMonth();
  if (month >= 8 && month <= 10) return 'Fall';
  if (month === 11 || month <= 1) return 'Winter';
  if (month <= 4) return 'Spring';
  return 'Summer';
}

// Net new followers over the last `days` days. `fb` is { dayNumber: follows minus unfollows }.
function follows(entry, now, days) {
  const today = dayNumber(now);
  let total = 0;
  for (const [day, amount] of Object.entries(entry.fb ?? {})) {
    const age = today - Number(day);
    if (age >= 0 && age < days) total += Number(amount) || 0;
  }
  return Math.max(0, total);
}

// Growth lately, not size: thirty new followers in two days beats a big list that gained two.
// A few people have to follow before it counts, so one or two taps can't make a list trend.
function momentum(entry, now) {
  const week = follows(entry, now, 7);
  if (week < config.TREND_MIN_FOLLOWS) return 0;
  const today = follows(entry, now, 1), month = follows(entry, now, config.FOLLOW_DAYS);
  const pace = Math.log1p(week + 2 * today) / Math.log1p(config.TREND_FULL);
  const usualWeek = ((month - week) * 7) / (config.FOLLOW_DAYS - 7);
  return clamp(pace * (week > usualWeek * 1.5 ? 1.15 : 1)); // Speeding up counts for a little more
}

// Mostly how complete the list is; lifetime followers add a little and stop adding early.
function quality(entry) {
  const popularity = clamp(Math.log1p(Math.max(0, entry.fc ?? 0)) / Math.log1p(config.POPULAR_FOLLOWERS));
  return clamp((1 - config.POPULARITY_SHARE) * (entry.quality ?? 0.5) + config.POPULARITY_SHARE * popularity);
}

// Same city, and more so if it's around the towns this person saves spots in. Never a hard filter.
function geo(entry, profile, cityId) {
  const scores = config.GEO_SCORES;
  if (!entry.cityId) return scores.unknownCity;
  if (entry.cityId !== cityId) return scores.otherCity;
  const towns = key => key.startsWith('loc:');
  const mine = Object.fromEntries(Object.entries(profile.vector).filter(([key]) => towns(key)));
  const theirs = Object.fromEntries(Object.entries(entry.features ?? {}).filter(([key]) => towns(key)));
  const size = vector => Math.sqrt(Object.values(vector).reduce((sum, value) => sum + value * value, 0));
  const overlap = size(mine) && size(theirs) ? dot(mine, theirs) / (size(mine) * size(theirs)) : 0;
  return clamp(scores.sameCity + scores.locality * overlap);
}

function season(entry, now) {
  if (!entry.season) return config.SEASON_SCORES.evergreen;
  return entry.season === currentSeason(now) ? config.SEASON_SCORES.current : config.SEASON_SCORES.other;
}

const ageDays = (entry, now) => Math.max(0, (now - (entry.publishedAt ?? 0)) / config.DAY_MS);
const freshness = (entry, now) => 0.5 ** (ageDays(entry, now) / config.FRESH_HALF_LIFE_DAYS);

function scoreEntry(entry, profile, { now, cityId }) {
  const parts = {
    interest: clamp(dot(profile.vector, entry.features ?? {})),
    quality: quality(entry),
    momentum: momentum(entry, now),
    geo: geo(entry, profile, cityId),
    season: season(entry, now),
    freshness: freshness(entry, now),
    social: profile.followedOwners.has(entry.ownerUid) ? 1 : 0,
  };
  // With nothing known about the person, interest can't tell lists apart; the other parts share its weight.
  const weights = { ...config.WEIGHTS };
  if (profile.empty) weights.interest = 0;
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
  const total = Object.keys(parts).reduce((score, key) => score + parts[key] * weights[key], 0) / sum;
  return { parts, total };
}

module.exports = { scoreEntry, momentum, follows, quality, season, freshness, ageDays, currentSeason, dayNumber };
