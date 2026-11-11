// Search over public lists without a search server.
// A list stores its own search terms when it is published; a query asks Firestore for one term
// (array-contains) and the rest is matched and ranked here. Plain CommonJS for unit tests.
const { normalize, wordForm } = require('./spotDiscovery');
const { resolveSpot } = require('./catalogue');

const MAX_TERMS = 120;
const MIN_PREFIX = 3;
const MIN_QUERY = 2;

const words = text => normalize(String(text ?? '')).split(' ').filter(Boolean);
const forms = text => words(text).map(wordForm);

// "golden" -> gol, gold, golde, so a half-typed word still finds the list.
function prefixes(word) {
  const result = [];
  for (let length = MIN_PREFIX; length < word.length; length += 1) result.push(word.slice(0, length));
  return result;
}

// Most useful terms first, so the cap drops description words before it drops the title.
function buildSearchTerms({ title, description, ownerUsername, items = [] }) {
  const terms = new Set();
  const add = values => values.forEach(value => { if (value && terms.size < MAX_TERMS) terms.add(value); });
  const spots = items.map(item => resolveSpot(item.spot));

  const username = String(ownerUsername ?? '').toLowerCase();
  add(forms(title));
  add([username, ...forms(username)]);
  add(words(title).flatMap(prefixes));
  add(prefixes(username));
  add(spots.flatMap(spot => forms(spot.name)));
  add(spots.flatMap(spot => forms(spot.locality)));
  add(forms(description));
  return [...terms];
}

// What the user typed, as words to match and the single term to send to Firestore.
function parseQuery(text) {
  const typed = words(String(text ?? '').replace(/^@/, ''));
  if (!typed.length || typed.join('').length < MIN_QUERY) return null;
  const longest = typed.reduce((best, word) => (word.length > best.length ? word : best));
  return { words: typed, term: wordForm(longest), prefixTerm: longest };
}

const wordMatches = (candidates, word) => {
  const form = wordForm(word);
  return candidates.some(candidate => candidate === form || candidate === word || candidate.startsWith(word));
};

function score(list, queryWords) {
  const title = forms(list.title).concat(words(list.title));
  const owner = [String(list.ownerUsername ?? '').toLowerCase(), ...words(list.ownerUsername)];
  const spots = (list.items ?? []).flatMap(item => {
    const spot = resolveSpot(item.spot);
    return forms(spot.name).concat(forms(spot.locality));
  });
  const description = forms(list.description);
  let total = 0;
  for (const word of queryWords) {
    if (wordMatches(title, word)) total += 8;
    else if (wordMatches(owner, word)) total += 6;
    else if (wordMatches(spots, word)) total += 4;
    else if (wordMatches(description, word)) total += 2;
    else return 0; // Every typed word has to match something
  }
  return total;
}

// Keeps the lists that match every typed word, best match first, then newest.
function rankLists(lists, text, { viewerUid, blocked = [] } = {}) {
  const query = parseQuery(text);
  if (!query) return [];
  return visibleLists(lists, { viewerUid, blocked })
    .map(list => ({ list, score: score(list, query.words) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.list.publishedAt ?? 0) - (a.list.publishedAt ?? 0))
    .map(entry => entry.list);
}

// Explore never shows your own lists or anything from someone you blocked.
function visibleLists(lists, { viewerUid, blocked = [] } = {}) {
  return lists.filter(list => list.ownerUid !== viewerUid && !blocked.includes(list.ownerUid));
}

const followers = list => Math.max(0, Number(list.followerCount) || 0);
const byNewest = (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0);
const byMostFollowed = (a, b) => followers(b) - followers(a) || byNewest(a, b);

// "From the community" for one city: most followed first, newest first among equals.
function mostFollowed(lists, { cityId, viewerUid, blocked = [], count = 3 } = {}) {
  return visibleLists(lists, { viewerUid, blocked })
    .filter(list => !cityId || list.cityId === cityId)
    .sort(byMostFollowed)
    .slice(0, count);
}

// Explore's sort: 'newest' or 'followed'. Returns a new array.
const sortLists = (lists, sort) => [...lists].sort(sort === 'followed' ? byMostFollowed : byNewest);

// ---------------------------------------------------------------- Seasons

const SEASON_NAMES = ['Fall', 'Winter', 'Spring', 'Summer'];

// Sep–Nov Fall, Dec–Feb Winter, Mar–May Spring, Jun–Aug Summer.
function currentSeason(date = new Date()) {
  const month = date.getMonth();
  if (month >= 8 && month <= 10) return 'Fall';
  if (month === 11 || month <= 1) return 'Winter';
  if (month <= 4) return 'Spring';
  return 'Summer';
}

// The season most of a list's catalogue spots belong to; ties go to the earlier spot.
// A list with no catalogue spots falls back to its season cover, if it has one.
function listSeason(list) {
  const counts = new Map();
  for (const item of list.items ?? []) {
    const season = item?.spot ? resolveSpot(item.spot).season : undefined;
    if (season) counts.set(season, (counts.get(season) ?? 0) + 1);
  }
  let best = null;
  counts.forEach((count, season) => { if (!best || count > counts.get(best)) best = season; });
  if (best) return best;
  const cover = list.cover?.type === 'season' ? String(list.cover.value ?? '') : '';
  return SEASON_NAMES.find(season => season.toLowerCase() === cover) ?? null;
}

const filterBySeason = (lists, season) => lists.filter(list => listSeason(list) === season);

// Usernames are lowercase letters, digits, dot, dash and underscore. Returns null if the text can't be one.
function usernamePrefix(text) {
  const prefix = String(text ?? '').trim().toLowerCase().replace(/^@/, '');
  return prefix.length >= MIN_QUERY && /^[a-z0-9_.-]+$/.test(prefix) ? prefix : null;
}

module.exports = {
  MAX_TERMS, buildSearchTerms, parseQuery, rankLists, visibleLists, mostFollowed, sortLists, usernamePrefix,
  SEASON_NAMES, currentSeason, listSeason, filterBySeason,
};
