// Which saved spots belong on the Map tab. Pure functions over plain objects, so every visibility rule is
// unit-tested without Firestore. Plain CommonJS.
//
// A spot can be on the map for more than one reason (hearted, in one of my lists, in a list picked in the
// filter). Each reason is a "source"; a spot is pinned once, and only leaves when no source holds it.
//
// - saved: spots hearted one by one. Always on the map.
// - mine: a list the user made. Always on the map.
// - followed: someone else's public list. Never on the map by default; pick it in the filter. (An old
//   `showOnMap` flag on a follow, from the switch the list page used to have, is ignored.)
// - collection: a season the user kept with a heart. Never on the map by default; pick it in the filter.
//
// Picking lists in the filter replaces the default set with just those lists.
const { catalogueRef, findCatalogueSpot, hasPin, spotKey } = require('./catalogue');
const { collectionById, collectionCaption, collectionSpots } = require('./collections');
const { SPOT_CATEGORIES, ownerOfSpotId, savedCustomSpots } = require('./customSpotsState');
const { hasCoordinates } = require('./spotDiscovery');

const OTHER = 'Other';
const count = total => `${total} ${total === 1 ? 'spot' : 'spots'}`;
const sourceId = (kind, id) => `${kind}:${id}`;

// The same rule as services/follows.js isStalePointer, which can't be loaded here (it imports Firestore).
const isStale = (pointer, list) => !list || list.publishedAt !== pointer.publishedAt;

function savedRefs(favourites) {
  const listed = Object.entries(favourites ?? {})
    .filter(([key, entry]) => !key.startsWith('x:') && entry?.isFavourite)
    .map(([name]) => catalogueRef(name));
  const custom = savedCustomSpots(favourites)
    .map(({ id, owner, name }) => ({ k: 'x', id, ...(owner ? { owner } : {}), name }));
  return [...listed, ...custom];
}

// `followed` is [{ pointer, list }]: `list` is the public copy, null once it is known to be gone, and
// undefined while it has not been read (it is only read when it is on the map or picked in the filter).
function mapSources({ favourites, myLists = [], followed = [], keptCollections = {} } = {}) {
  const sources = [{ id: 'saved', kind: 'saved', title: 'Saved', caption: '', onMap: true, refs: savedRefs(favourites) }];
  for (const list of myLists) {
    const refs = (list.items ?? []).map(item => item.spot);
    sources.push({ id: sourceId('mine', list.id), kind: 'mine', title: list.title, caption: count(refs.length), onMap: true, refs });
  }
  for (const { pointer, list } of followed) {
    // Deleted, made private, or withdrawn and shared again: it stops counting, and leaves the filter.
    if (list !== undefined && isStale(pointer, list)) continue;
    const by = (list?.ownerUsername ?? pointer.ownerUsername) ? `by ${list?.ownerUsername ?? pointer.ownerUsername}` : '';
    sources.push({
      id: sourceId('followed', pointer.id),
      kind: 'followed',
      title: list?.title ?? pointer.title ?? 'List',
      caption: ['Following', by].filter(Boolean).join(' · '),
      onMap: false,
      refs: (list?.items ?? []).map(item => item.spot),
    });
  }
  for (const id of Object.keys(keptCollections ?? {})) {
    const collection = collectionById(id);
    if (!collection) continue; // One the app no longer makes
    sources.push({
      id: sourceId('collection', id),
      kind: 'collection',
      title: collection.title,
      caption: collectionCaption(id),
      onMap: false,
      refs: collectionSpots(id).map(spot => catalogueRef(spot.name)),
    });
  }
  return sources;
}

// What the filter sheet offers: everything but the single hearts, which have no list to pick.
const selectableSources = sources => sources.filter(source => source.kind !== 'saved');

// Lists that were picked and have since been unfollowed, deleted or withdrawn drop out of the selection.
// Returns the same array when nothing changed, so callers can compare by identity.
function pruneSelection(selectedIds = [], sources) {
  const known = new Set(selectableSources(sources).map(source => source.id));
  const kept = selectedIds.filter(id => known.has(id));
  return kept.length === selectedIds.length ? selectedIds : kept;
}

// The followed lists whose contents are needed right now: the ones picked in the filter.
function neededListIds(pointers = [], selectedIds = []) {
  const picked = new Set(selectedIds);
  return pointers
    .filter(pointer => picked.has(sourceId('followed', pointer.id)))
    .map(pointer => pointer.id);
}

// One reference per spot. With nothing picked, every source that is on the map; otherwise only the picked
// ones. When the same spot is referenced twice, the reference that says where it is wins.
function eligibleRefs(sources, selectedIds = []) {
  const picked = new Set(selectedIds);
  const chosen = picked.size
    ? sources.filter(source => picked.has(source.id))
    : sources.filter(source => source.onMap);
  const byKey = new Map();
  for (const source of chosen) {
    for (const ref of source.refs) {
      if (!ref || (ref.k !== 'c' && ref.k !== 'x')) continue;
      const key = spotKey(ref);
      const seen = byKey.get(key);
      if (!seen || (!hasPin(seen) && hasPin(ref))) byKey.set(key, ref);
    }
  }
  return [...byKey.values()];
}

const ownerOf = ref => ref.owner ?? ownerOfSpotId(ref.id);

// Someone else's spot that the reference alone can't place: its public copy has to be read.
const needsPublicCopy = (ref, uid) => ref.k === 'x' && ownerOf(ref) !== uid && !hasPin(ref);

// Everything the map, its preview and search need for one spot, or null when it can't be shown at all
// (a spot the app no longer lists). `details` is a custom spot's own record or its public copy, if known.
function toMapSpot(ref, details) {
  if (ref.k === 'c') {
    const spot = findCatalogueSpot(ref.name);
    if (!spot) return null;
    return {
      key: spotKey(ref), ref: catalogueRef(spot.name),
      name: spot.name, title: spot.title, address: spot.address, detailAddress: spot.detailAddress,
      tagline: spot.tagline, description: spot.description, searchTags: spot.searchTags,
      category: spot.category || OTHER, locality: spot.locality,
      latitude: spot.latitude, longitude: spot.longitude,
    };
  }
  const place = details && Number.isFinite(details.lat) && Number.isFinite(details.lng) ? details : ref;
  const owner = ownerOf(ref);
  const address = details?.address ?? ref.address;
  return {
    key: spotKey(ref), ref: { k: 'x', id: ref.id, ...(owner ? { owner } : {}), name: details?.name ?? ref.name },
    name: details?.name ?? ref.name, address,
    description: [details?.description, details?.tips].filter(Boolean).join(' '),
    category: SPOT_CATEGORIES.includes(details?.category) ? details.category : OTHER,
    locality: typeof address === 'string' && address.includes(',') ? address.slice(address.lastIndexOf(',') + 1).trim() : '',
    latitude: hasPin(place) ? place.lat : undefined,
    longitude: hasPin(place) ? place.lng : undefined,
  };
}

// Only a spot with real coordinates gets a pin. The rest stay reachable everywhere else in the app.
const pinnable = spots => spots.filter(hasCoordinates);

// The shape services/spotDiscovery.js indexes: one section per category, in the app's own category order.
function mapSections(spots) {
  return SPOT_CATEGORIES
    .map(title => ({ title, spots: spots.filter(spot => spot.category === title) }))
    .filter(section => section.spots.length);
}

module.exports = {
  mapSources, selectableSources, pruneSelection, neededListIds, eligibleRefs,
  needsPublicCopy, toMapSpot, pinnable, mapSections, sourceId,
};
