// Spots people make themselves: one record per spot (spots/{id}), referenced by ID from lists, Saved and Top 4.
// Pure functions over plain objects, so every rule is unit-tested without Firestore; services/customSpots.js
// applies them inside transactions. Plain CommonJS.
//
// A spot's ID is `${ownerUid}_${suffix}`, so the owner can be told from the ID alone. That is what lets the
// security rules check ownership without reading anything.
//
// References:
// - one of my spots: { k: 'x', id, owner, name, address?, lat?, lng? }. The name and place are repeated here
//   so a list can be searched, mapped and drawn without opening each spot; editing the spot refreshes them.
// - someone else's spot: { k: 'x', id, owner, name } only. The rest is read from their public copy, so
//   nothing private outlives their decision to stop sharing it.
// - from before spots had records: { k: 'x', id, name, address?, lat?, lng? }, no owner. See migrateLegacy.
const { catalogueSpots, spotKey, locality } = require('./catalogue');
const { distanceKm } = require('./spotDiscovery');

const SPOT_LIMITS = { name: 60, description: 500, tips: 300, cost: 60, hours: 120, photos: 3 };

// The categories SznLuv already sorts its spots into, then a catch-all.
const SPOT_CATEGORIES = [...new Set(catalogueSpots.map(spot => spot.category).filter(Boolean)), 'Other'];
const SPOT_SEASONS = [
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
];

// A reviewed spot may be nudged to the right place, but not moved somewhere else entirely.
const REVIEWED_MOVE_LIMIT_KM = 0.25;

const clean = value => String(value ?? '').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();
const round = value => Number(Number(value).toFixed(5));

const spotIdFor = (uid, suffix) => `${uid}_${suffix}`;
const ownerOfSpotId = id => (typeof id === 'string' && id.includes('_') ? id.slice(0, id.indexOf('_')) : null);
const savedKey = id => `x:${id}`;

// Why the form can't be saved yet, or null when it can.
function spotProblem({ name, mode, address, pin, description, tips, cost, hours, photos }) {
  const cleanName = clean(name);
  if (!cleanName) return 'Give the spot a name.';
  if (cleanName.length > SPOT_LIMITS.name) return `Names can be up to ${SPOT_LIMITS.name} characters.`;
  if (mode === 'pin' && !pin) return 'Move the map so the pin sits on your spot.';
  if (mode === 'address' && !clean(address)) return 'Type an address, or drop a pin instead.';
  const tooLong = [['description', description, 'Descriptions'], ['tips', tips, 'Tips'], ['cost', cost, 'Cost'], ['hours', hours, 'Hours']]
    .find(([field, value]) => clean(value).length > SPOT_LIMITS[field]);
  if (tooLong) return `${tooLong[2]} can be up to ${SPOT_LIMITS[tooLong[0]]} characters.`;
  if ((photos?.length ?? 0) > SPOT_LIMITS.photos) return `A spot can have up to ${SPOT_LIMITS.photos} photos.`;
  return null;
}

// The form as it will be stored. Empty optional fields are left out, so an old record and a new one
// without extras look the same and pages never show an empty section.
function spotFields({ name, mode, address, pin, label, category, description, tips, cost, hours, seasons }) {
  const where = mode === 'pin'
    ? { lat: round(pin.latitude), lng: round(pin.longitude) }
    : { address: clean(label || address), ...(pin ? { lat: round(pin.latitude), lng: round(pin.longitude) } : {}) };
  const extras = { category: SPOT_CATEGORIES.includes(category) ? category : '', description: clean(description), tips: clean(tips), cost: clean(cost), hours: clean(hours) };
  const chosenSeasons = SPOT_SEASONS.map(season => season.value).filter(value => (seasons ?? []).includes(value));
  return {
    name: clean(name),
    ...where,
    ...Object.fromEntries(Object.entries(extras).filter(([, value]) => value)),
    ...(chosenSeasons.length ? { seasons: chosenSeasons } : {}),
  };
}

// The fields a reference repeats. When none of these change, an edit touches only the spot itself.
const THIN_FIELDS = ['name', 'address', 'lat', 'lng'];
const thinFields = spot => Object.fromEntries(THIN_FIELDS.filter(field => spot[field] !== undefined && spot[field] !== '').map(field => [field, spot[field]]));
const thinChanged = (before, after) => JSON.stringify(thinFields(before)) !== JSON.stringify(thinFields(after));

const toRef = (id, spot) => ({ k: 'x', id, owner: spot.ownerUid, ...thinFields(spot) });
const linkRef = ref => ({ k: 'x', id: ref.id, ...(ref.owner ? { owner: ref.owner } : {}), name: ref.name });

const isLegacyRef = ref => ref?.k === 'x' && !ref.owner;
const isMine = (ref, uid) => ref?.k === 'x' && !!uid && ref.owner === uid;

// What goes into one of my lists when I add a spot: someone else's spot is linked by ID and name only.
// An old reference with no owner is kept whole; bringing it over makes it one of mine (migrateLegacy).
const storedRef = (ref, uid) => (ref?.k === 'x' && ref.owner && ref.owner !== uid ? linkRef(ref) : ref);

// What a visitor reads: the spot as its owner wrote it, minus bookkeeping.
function toPublicSpot(spot, ownerUsername, now) {
  const { publicListIds: _lists, legacyId: _legacy, ...shown } = spot;
  return { ...shown, ownerUsername, updatedAt: now };
}

// Search over everything a person might remember about their own spot.
function matchesSpot(spot, query) {
  const typed = clean(query).toLowerCase();
  if (!typed) return true;
  const seasons = (spot.seasons ?? []).map(value => SPOT_SEASONS.find(season => season.value === value)?.label ?? value);
  const haystack = [spot.name, spot.address, locality(spot.address), spot.category, spot.description, spot.tips, ...seasons]
    .filter(Boolean).join(' ').toLowerCase();
  return typed.split(/\s+/).every(word => haystack.includes(word));
}

// One of my spots with the same name and place, to reuse instead of making a second one.
function findSameSpot(fields, mySpots) {
  return mySpots.find(spot => same(spot.name, fields.name)
    && (fields.address ? same(spot.address, fields.address) : spot.lat === fields.lat && spot.lng === fields.lng));
}

// A spot SznLuv already lists under that name.
const findListedSpot = name => catalogueSpots.find(spot => same(spot.name, name));

// Whether a reviewed spot's new location is still the same place.
function withinReach(before, after) {
  const pinned = spot => Number.isFinite(spot?.lat) && Number.isFinite(spot?.lng);
  if (pinned(before) && pinned(after)) {
    return distanceKm({ latitude: before.lat, longitude: before.lng }, { latitude: after.lat, longitude: after.lng }) <= REVIEWED_MOVE_LIMIT_KM;
  }
  if (!pinned(before) && !pinned(after)) return same(before?.address, after?.address);
  // Adding a pin to an address (or the reverse) is fine as long as the words still match.
  return !!before?.address && same(before.address, after?.address);
}

// ---------------------------------------------------------------- Where references live

const replaceRefInList = (list, ref) => ({
  ...list,
  items: list.items.map(item => (spotKey(item.spot) === spotKey(ref) ? { ...item, spot: ref } : item)),
});

const removeRefFromList = (list, key) => ({ ...list, items: list.items.filter(item => spotKey(item.spot) !== key) });

const mapTop4Picks = (top4, change) => Object.fromEntries(Object.entries(top4 ?? {}).map(([cityId, city]) => {
  if (Array.isArray(city)) return [cityId, change(city)]; // profiles/{uid}.top4: { cityId: [picks] }
  return [cityId, { ...city, picks: change(city?.picks ?? []) }]; // users/{uid}.top4: { cityId: { picks, public } }
}));
const replaceRefInTop4 = (top4, ref) => mapTop4Picks(top4, picks => picks.map(pick => (spotKey(pick) === spotKey(ref) ? ref : pick)));
function removeRefFromTop4(top4, key) {
  return Object.fromEntries(Object.entries(mapTop4Picks(top4, picks => picks.filter(pick => spotKey(pick) !== key)))
    .map(([cityId, city]) => [cityId, Array.isArray(city) || city.picks.length ? city : { ...city, public: false }]));
}
const top4Has = (top4, key) => Object.values(top4 ?? {}).some(city => (Array.isArray(city) ? city : city?.picks ?? []).some(pick => spotKey(pick) === key));

// Saved: the favourites document holds my custom spots beside the app's ones, under "x:{id}".
const savedEntry = (ref, now) => ({ isFavourite: true, owner: ref.owner ?? null, name: ref.name, savedAt: now });
const savedCustomSpots = favourites => Object.entries(favourites ?? {})
  .filter(([key, entry]) => key.startsWith('x:') && entry?.isFavourite)
  .map(([key, entry]) => ({ id: key.slice(2), ...entry }));

// ---------------------------------------------------------------- From references to records

// Every own-spot reference written before spots had records has no owner. Each one becomes a spot of
// this user's at `${uid}_${oldId}`, so running this again finds the same IDs and changes nothing.
// A copy of someone else's old spot becomes this user's own: it already was an independent copy.
function migrateLegacy({ uid, lists = [], top4 = null, existing = new Set(), now }) {
  const found = new Map(); // old id -> first reference seen
  const note = ref => { if (isLegacyRef(ref) && !found.has(ref.id)) found.set(ref.id, ref); };
  lists.forEach(({ data }) => data.items.forEach(item => note(item.spot)));
  Object.values(top4 ?? {}).forEach(city => (Array.isArray(city) ? city : city?.picks ?? []).forEach(note));
  if (!found.size) return null;

  const newRef = ref => {
    const id = spotIdFor(uid, ref.id);
    return { k: 'x', id, owner: uid, ...thinFields(ref) };
  };
  const swap = ref => (isLegacyRef(ref) && found.has(ref.id) ? newRef(found.get(ref.id)) : ref);

  const spots = [...found.values()]
    .map(ref => ({ id: spotIdFor(uid, ref.id), legacyId: ref.id, ref }))
    .filter(({ id }) => !existing.has(id))
    .map(({ id, legacyId, ref }) => ({
      id,
      data: { ownerUid: uid, ...thinFields(ref), photos: [], publicListIds: [], createdAt: now, updatedAt: now, legacyId },
    }));
  const changedLists = lists
    .filter(({ data }) => data.items.some(item => isLegacyRef(item.spot)))
    .map(({ id, data }) => ({ id, data: { ...data, items: data.items.map(item => ({ ...item, spot: swap(item.spot) })) } }));
  const top4Changed = Object.values(top4 ?? {}).some(city => (Array.isArray(city) ? city : city?.picks ?? []).some(isLegacyRef));
  return {
    spots,
    lists: changedLists,
    top4: top4Changed ? mapTop4Picks(top4, picks => picks.map(swap)) : null,
    swap,
  };
}

module.exports = {
  SPOT_LIMITS, SPOT_CATEGORIES, SPOT_SEASONS, REVIEWED_MOVE_LIMIT_KM,
  spotIdFor, ownerOfSpotId, savedKey, spotProblem, spotFields, thinFields, thinChanged, toRef, linkRef, storedRef, isLegacyRef, isMine,
  toPublicSpot, matchesSpot, findSameSpot, findListedSpot, withinReach,
  replaceRefInList, removeRefFromList, replaceRefInTop4, removeRefFromTop4, top4Has, savedEntry, savedCustomSpots, migrateLegacy,
};
