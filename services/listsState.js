// What a list is and how it changes. Pure functions over plain objects, so every rule here is unit-tested
// without Firestore. services/lists.js applies them inside transactions.
const { DEFAULT_CITY, spotKey, isOwnSpot, describeWhere, catalogueRef } = require('./catalogue');
const { buildSearchTerms } = require('./listSearch');

const LIMITS = { title: 25, description: 120, note: 140, spots: 50, spotName: 60 };

const COLOURS = [
  { value: '#FFC1E3', name: 'Pink' },
  { value: '#A7C8FF', name: 'Blue' },
  { value: '#A8E6CF', name: 'Green' },
  { value: '#FFF9C4', name: 'Yellow' },
  { value: '#FF8B94', name: 'Coral' },
  { value: '#D3BFFF', name: 'Lavender' },
  { value: '#FF8657', name: 'Orange' },
];
// A season cover shows that season's illustration on tiles and its colour behind the list page.
const SEASON_COVERS = [
  { value: 'fall', name: 'Fall', background: '#F4A460' },
  { value: 'winter', name: 'Winter', background: '#BBCDEC' },
  { value: 'spring', name: 'Spring', background: '#FF9FD2' },
  { value: 'summer', name: 'Summer', background: '#F8DD74' },
];
const DEFAULT_COVER = { type: 'colour', value: COLOURS[1].value };

function coverBackground(cover) {
  if (cover?.type === 'season') {
    return SEASON_COVERS.find(season => season.value === cover.value)?.background ?? DEFAULT_COVER.value;
  }
  return typeof cover?.value === 'string' ? cover.value : DEFAULT_COVER.value;
}

function validCover(cover) {
  if (cover?.type === 'season') return SEASON_COVERS.some(season => season.value === cover.value);
  return cover?.type === 'colour' && COLOURS.some(colour => colour.value === cover.value);
}

function listError(code, message) {
  return Object.assign(new Error(message), { code });
}

// `keepTitle` is the list's current title: one saved before titles were capped at 25 can stay as it is.
function cleanDetails({ title, description = '', cover = DEFAULT_COVER }, keepTitle) {
  const cleanTitle = String(title ?? '').trim();
  const cleanDescription = String(description ?? '').trim();
  if (!cleanTitle) throw listError('list/no-title', 'Give your list a title.');
  if (cleanTitle.length > LIMITS.title && cleanTitle !== keepTitle) throw listError('list/title-too-long', `Titles can be up to ${LIMITS.title} characters.`);
  if (cleanDescription.length > LIMITS.description) {
    throw listError('list/description-too-long', `Descriptions can be up to ${LIMITS.description} characters.`);
  }
  return { title: cleanTitle, description: cleanDescription, cover: validCover(cover) ? cover : DEFAULT_COVER };
}

function createList({ ownerUid, title, description, cover, cityId = DEFAULT_CITY.id, items = [], now }) {
  if (!ownerUid) throw listError('list/signed-out', 'You must be logged in.');
  return {
    ownerUid, ...cleanDetails({ title, description, cover }), cityId,
    items: items.slice(0, LIMITS.spots), public: false, publishedAt: null, createdAt: now, updatedAt: now,
  };
}

const editDetails = (list, details) => ({ ...list, ...cleanDetails({ ...list, ...details }, list.title) });

const indexOfSpot = (list, key) => list.items.findIndex(item => spotKey(item.spot) === key);
const hasSpot = (list, ref) => indexOfSpot(list, spotKey(ref)) !== -1;

// Adding a spot that is already there changes nothing, so a double tap is harmless.
function addSpot(list, ref, note = '') {
  if (hasSpot(list, ref)) return list;
  if (list.items.length >= LIMITS.spots) throw listError('list/full', `A list can hold up to ${LIMITS.spots} spots.`);
  return { ...list, items: [...list.items, { spot: ref, note }] };
}

const removeSpot = (list, key) => ({ ...list, items: list.items.filter(item => spotKey(item.spot) !== key) });

// Puts an entry back where it was, for Undo.
function insertSpot(list, item, index) {
  if (hasSpot(list, item.spot)) return list;
  const items = [...list.items];
  items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
  return { ...list, items };
}

function moveSpot(list, key, delta) {
  const from = indexOfSpot(list, key);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= list.items.length) return list;
  const items = [...list.items];
  [items[from], items[to]] = [items[to], items[from]];
  return { ...list, items };
}

function setNote(list, key, note) {
  const clean = String(note ?? '').trim();
  if (clean.length > LIMITS.note) throw listError('list/note-too-long', `Notes can be up to ${LIMITS.note} characters.`);
  return { ...list, items: list.items.map(item => (spotKey(item.spot) === key ? { ...item, note: clean } : item)) };
}

// Saving a spot from someone else's list copies the place, never their note.
const copySpot = item => ({ spot: { ...item.spot }, note: '' });

// ---------------------------------------------------------------- Publishing

// The part of a list that visitors see. Comparing these is how "changes not public yet" is decided.
const publicFields = list => ({
  title: list.title,
  description: list.description ?? '',
  cityId: list.cityId,
  cover: list.cover,
  items: list.items.map(item => ({ spot: item.spot, note: item.note ?? '' })),
});

// Key order differs between a local draft and a document read back from Firestore.
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}
const sameContent = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

const hasUnpublishedChanges = (draft, published) => !!published && !sameContent(publicFields(draft), publicFields(published));

// Personal details a visitor would be able to read: every note, and where every own spot is.
function exposure(list) {
  return {
    notes: list.items.filter(item => item.note).map(item => ({ key: spotKey(item.spot), name: item.spot.name, text: item.note })),
    locations: list.items.filter(item => isOwnSpot(item.spot) && describeWhere(item.spot))
      .map(item => ({ key: spotKey(item.spot), name: item.spot.name, text: describeWhere(item.spot) })),
  };
}

// Only what an update would reveal that the public version does not already show.
function newExposure(draft, published) {
  const next = exposure(draft);
  if (!published) return next;
  const current = exposure(published);
  const unseen = (entries, seen) => entries.filter(entry => !seen.some(old => old.key === entry.key && old.text === entry.text));
  return { notes: unseen(next.notes, current.notes), locations: unseen(next.locations, current.locations) };
}

const needsReview = (draft, published) => {
  const fresh = newExposure(draft, published);
  return fresh.notes.length + fresh.locations.length > 0;
};

function assertPublishable(list) {
  if (!list.items.length) throw listError('list/empty', 'Add a spot first.');
}

// The document written to publicLists. `publishedAt` is kept across updates and reset when a private
// list goes public again, which is what tells old followers the list was withdrawn in between.
function toPublicSnapshot(draft, { ownerUsername, now, publishedAt }) {
  assertPublishable(draft);
  const fields = publicFields(draft);
  return {
    ...fields,
    ownerUid: draft.ownerUid,
    ownerUsername,
    spotCount: fields.items.length,
    publishedAt: publishedAt ?? now,
    updatedAt: now,
    searchTerms: buildSearchTerms({ ...fields, ownerUsername }),
  };
}

// Throws away draft edits and goes back to what visitors see.
const revertToPublic = (draft, published) => ({ ...draft, ...publicFields(published) });

// ---------------------------------------------------------------- Collections -> lists

const migratedListId = (uid, index) => `${uid}_c${index}`;

// Turns the old favourites.collections array into private lists and removes it from the favourites document.
// Returns null when there is nothing to migrate.
function migrateCollections(favourites, { uid, now }) {
  const collections = Array.isArray(favourites?.collections) ? favourites.collections : [];
  if (!collections.length && favourites?.listsMigratedAt) return null;
  const { collections: _removed, ...rest } = favourites ?? {};
  const lists = collections.map((old, index) => ({
    id: migratedListId(uid, index),
    data: createList({
      ownerUid: uid,
      title: String(old.title ?? '').trim().slice(0, LIMITS.title) || 'Untitled list',
      cover: { type: 'colour', value: old.color },
      items: [...new Set(old.dates ?? [])].filter(name => typeof name === 'string' && name).map(name => ({ spot: catalogueRef(name), note: '' })),
      now: now + index, // Keeps the collections in their original order
    }),
  }));
  return { lists, favourites: { ...rest, listsMigratedAt: now } };
}

module.exports = {
  LIMITS, COLOURS, SEASON_COVERS, DEFAULT_COVER, coverBackground,
  createList, editDetails, hasSpot, addSpot, removeSpot, insertSpot, moveSpot, setNote, copySpot,
  publicFields, hasUnpublishedChanges, exposure, newExposure, needsReview, assertPublishable,
  toPublicSnapshot, revertToPublic, migratedListId, migrateCollections,
};
