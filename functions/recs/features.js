// What a public list is about, worked out from the spots inside it. Lists carry no tags of their own, so a
// list of salmon rivers is "about wildlife" because its spots are, whatever its title says. Pure functions.
const { catalogueSpots, findCatalogueSpot, locality, CITIES } = require('./catalogue');
const config = require('./config');

const SEASON_NAMES = ['Fall', 'Winter', 'Spring', 'Summer'];
const slug = text => String(text ?? '').trim().toLowerCase();

// Place names are already covered by loc: keys, so they are left out of the tags.
const places = new Set([...CITIES.map(city => slug(city.name)), ...catalogueSpots.map(spot => slug(spot.locality))].filter(Boolean));
const tagsOf = spot => [...new Set((spot.searchTags ?? []).map(slug))].filter(tag => tag && !places.has(tag));

// A tag most spots share says little; a rare one says a lot. 0..1.
const tagCounts = new Map();
catalogueSpots.forEach(spot => tagsOf(spot).forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)));
const rarity = tag => {
  const total = Math.max(2, catalogueSpots.length);
  return Math.log(total / (tagCounts.get(tag) ?? 1)) / Math.log(total);
};

const add = (vector, key, weight) => { if (weight > 0) vector[key] = (vector[key] ?? 0) + weight; };

// One spot's features. `shared` is the public copy of a spot someone made, when the caller has it:
// that is where its category and seasons live (a list item only repeats the name and place).
function spotFeatures(ref, shared) {
  const weights = config.SPOT_FEATURES, vector = {};
  if (ref?.k === 'c') {
    const spot = findCatalogueSpot(ref.name);
    if (!spot) return vector;
    add(vector, `cat:${slug(spot.category)}`, weights.category);
    add(vector, `season:${slug(spot.season)}`, weights.season);
    if (spot.locality) add(vector, `loc:${slug(spot.locality)}`, weights.locality);
    tagsOf(spot).forEach(tag => add(vector, `tag:${tag}`, weights.tag * rarity(tag)));
    return vector;
  }
  const town = locality(shared?.address ?? ref?.address);
  if (town) add(vector, `loc:${slug(town)}`, weights.locality);
  if (shared?.category && shared.category !== 'Other') add(vector, `cat:${slug(shared.category)}`, weights.category);
  (shared?.seasons ?? []).forEach(season => add(vector, `season:${slug(season)}`, weights.season / shared.seasons.length));
  return vector;
}

function unit(vector) {
  const length = Math.sqrt(Object.values(vector).reduce((sum, value) => sum + value * value, 0));
  if (!length) return {};
  return Object.fromEntries(Object.entries(vector).map(([key, value]) => [key, Math.round((value / length) * 1000) / 1000]));
}

// The strongest few keys, as a unit vector, so two lists (or a list and a person) can be compared.
function strongest(vector, count = config.MAX_FEATURES) {
  const top = Object.entries(vector).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count);
  return unit(Object.fromEntries(top));
}

const dot = (a, b) => Object.keys(a).reduce((sum, key) => sum + a[key] * (b[key] ?? 0), 0);

function listFeatures(list, sharedSpots = {}) {
  const vector = {};
  for (const item of list.items ?? []) {
    const features = spotFeatures(item.spot, sharedSpots[item.spot?.id]);
    Object.entries(features).forEach(([key, weight]) => add(vector, key, weight));
  }
  return strongest(vector);
}

// The season most of the list's spots belong to, counting spots people made as well as the catalogue's.
// No seasonal spots and no season cover means the list is good all year (null).
function listSeason(list, sharedSpots = {}) {
  const counts = new Map();
  const count = (season, amount) => {
    const name = SEASON_NAMES.find(candidate => candidate.toLowerCase() === slug(season));
    if (name) counts.set(name, (counts.get(name) ?? 0) + amount);
  };
  for (const item of list.items ?? []) {
    if (item.spot?.k === 'c') count(findCatalogueSpot(item.spot.name)?.season, 1);
    else {
      const seasons = sharedSpots[item.spot?.id]?.seasons ?? [];
      // A spot marked for every season isn't seasonal.
      if (seasons.length && seasons.length < SEASON_NAMES.length) seasons.forEach(season => count(season, 1 / seasons.length));
    }
  }
  let best = null;
  counts.forEach((amount, season) => { if (!best || amount > counts.get(best)) best = season; });
  if (best) return best;
  return list.cover?.type === 'season' ? SEASON_NAMES.find(season => season.toLowerCase() === slug(list.cover.value)) ?? null : null;
}

// How complete and usable a list is, 0..1. Nothing here needs followers, reviews or a verified owner,
// so a careful first list scores as well as an established one.
function listQuality(list) {
  const items = list.items ?? [];
  if (!items.length) return 0;
  const described = Math.min(1, String(list.description ?? '').trim().length / 40);
  const size = Math.min(1, items.length / 8);
  const noted = items.filter(item => String(item.note ?? '').trim()).length / items.length;
  const findable = items.filter(item => (
    item.spot?.k === 'c' ? !!findCatalogueSpot(item.spot.name) : !!(item.spot?.address || Number.isFinite(item.spot?.lat) || item.spot?.owner)
  )).length / items.length;
  return Math.round((0.2 * described + 0.4 * size + 0.2 * noted + 0.2 * findable) * 1000) / 1000;
}

// What the index keeps for one public list: enough to draw its card and to score it, nothing else.
function indexEntry(list, sharedSpots = {}) {
  return {
    ownerUid: list.ownerUid,
    ownerUsername: list.ownerUsername ?? '',
    title: list.title ?? '',
    cover: list.cover ?? null,
    spotCount: list.spotCount ?? (list.items ?? []).length,
    cityId: list.cityId ?? null,
    publishedAt: list.publishedAt ?? 0,
    updatedAt: list.updatedAt ?? 0,
    fc: Math.max(0, Number(list.followerCount) || 0),
    season: listSeason(list, sharedSpots),
    features: listFeatures(list, sharedSpots),
    quality: listQuality(list),
  };
}

module.exports = { SEASON_NAMES, spotFeatures, listFeatures, listSeason, listQuality, indexEntry, strongest, unit, dot, slug };
