const { test } = require('node:test');
const assert = require('node:assert/strict');
const { catalogueRef } = require('../services/catalogue');
const { createSpotIndex, findMatchingSpots, DEFAULT_FILTERS, hasActiveFilters } = require('../services/spotDiscovery');
const {
  mapSources, selectableSources, pruneSelection, neededListIds, eligibleRefs, needsPublicCopy, toMapSpot,
  pinnable, mapSections,
} = require('../services/mapSpots');
const {
  validRegion, regionAround, regionFor, regionBounds, inBounds, spotsInRegion, clusterSpots, shiftRegion,
  nudgeIntoFrame,
} = require('../services/mapGeometry');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const laity = catalogueRef('Laity Pumpkin Patch');
const hatchery = catalogueRef('Tynehead Hatchery');
const mine = { k: 'x', id: 'me_steps', owner: 'me', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
const theirs = { k: 'x', id: 'maya_cafe', owner: 'maya', name: 'Corner cafe' };
const hearted = name => ({ [name]: { isFavourite: true, season: 'Fall', location: '', savedAt: 1 } });
const list = (id, refs, extra = {}) => ({ id, title: id, ownerUid: 'me', items: refs.map(spot => ({ spot, note: '' })), ...extra });
const follow = (id, refs, { showOnMap, publishedAt = 5, listPublishedAt = publishedAt, gone = false, unread = false } = {}) => ({
  pointer: { id, title: id, ownerUsername: 'maya', publishedAt, ...(showOnMap === undefined ? {} : { showOnMap }) },
  list: unread ? undefined : gone ? null : { id, title: id, ownerUsername: 'maya', publishedAt: listPublishedAt, items: refs.map(spot => ({ spot, note: '' })) },
});
const keys = refs => refs.map(ref => (ref.k === 'c' ? ref.name : ref.id)).sort();

// ---------------------------------------------------------------- What is on the map

test('map: hearts and my own lists are on the map by default, each spot once', () => {
  const sources = mapSources({
    favourites: { ...hearted('Aldor Family Farm'), 'x:me_steps': { isFavourite: true, owner: 'me', name: 'Waterfront steps', savedAt: 2 }, listsMigratedAt: 9, collections: [] },
    myLists: [list('weekend', [farm, maan, mine]), list('dates', [maan])],
  });
  assert.deepEqual(keys(eligibleRefs(sources)), ['Aldor Family Farm', 'Maan Farms', 'me_steps']);
  assert.deepEqual(sources.map(source => source.kind), ['saved', 'mine', 'mine']);
  assert.equal(sources[1].caption, '3 spots');
  assert.equal(sources[2].caption, '1 spot');
});

test('map: a spot stays while any source still holds it, and goes when none does', () => {
  const inList = [list('weekend', [farm])];
  const both = mapSources({ favourites: hearted('Aldor Family Farm'), myLists: inList });
  assert.deepEqual(keys(eligibleRefs(both)), ['Aldor Family Farm']);
  // The heart is removed: the list still holds it.
  assert.deepEqual(keys(eligibleRefs(mapSources({ favourites: {}, myLists: inList }))), ['Aldor Family Farm']);
  // An un-hearted entry left in the document does not count either.
  const unhearted = { 'Aldor Family Farm': { isFavourite: false, season: 'Fall' } };
  assert.deepEqual(eligibleRefs(mapSources({ favourites: unhearted, myLists: [] })), []);
});

test('map: a followed list is never on the default map, even with an old "Show all spots on map" flag', () => {
  const off = mapSources({ favourites: hearted('Maan Farms'), followed: [follow('forest', [farm, laity])] });
  assert.deepEqual(keys(eligibleRefs(off)), ['Maan Farms']);
  assert.equal(off.at(-1).onMap, false);
  assert.equal(off.at(-1).caption, 'Following · by maya');

  // The list page used to have a switch that saved `showOnMap` on the follow. It no longer counts.
  const legacy = mapSources({ favourites: hearted('Maan Farms'), followed: [follow('forest', [farm, laity], { showOnMap: true })] });
  assert.deepEqual(keys(eligibleRefs(legacy)), ['Maan Farms']);
  assert.equal(legacy.at(-1).onMap, false);
});

test('map: a kept season is never on the default map but can be picked', () => {
  const sources = mapSources({ favourites: hearted('Maan Farms'), keptCollections: { 'vancouver-fall': { savedAt: 1 }, 'gone-collection': { savedAt: 2 } } });
  assert.deepEqual(sources.map(source => source.id), ['saved', 'collection:vancouver-fall']);
  assert.deepEqual(keys(eligibleRefs(sources)), ['Maan Farms']);
  const picked = eligibleRefs(sources, ['collection:vancouver-fall']);
  assert.equal(picked.length, 43);
  assert.match(sources[1].caption, /Vancouver · 43 spots/);
});

// ---------------------------------------------------------------- Picking lists in the filter

test('map filter: picked lists replace the default set, combined without repeats', () => {
  const sources = mapSources({
    favourites: hearted('Tynehead Hatchery'),
    myLists: [list('weekend', [farm, maan]), list('dates', [maan, laity]), list('other', [hatchery])],
  });
  assert.deepEqual(keys(eligibleRefs(sources, ['mine:weekend'])), ['Aldor Family Farm', 'Maan Farms']);
  assert.deepEqual(keys(eligibleRefs(sources, ['mine:weekend', 'mine:dates'])), ['Aldor Family Farm', 'Laity Pumpkin Patch', 'Maan Farms']);
  // The hearted hatchery is hidden while lists are picked, and back when the selection is cleared.
  assert.equal(keys(eligibleRefs(sources, ['mine:weekend'])).includes('Tynehead Hatchery'), false);
  assert.equal(keys(eligibleRefs(sources, [])).includes('Tynehead Hatchery'), true);
});

test('map filter: a followed list can be picked, and only then is its public copy needed', () => {
  const followed = [follow('forest', [farm, laity])];
  const sources = mapSources({ favourites: hearted('Maan Farms'), followed });
  assert.deepEqual(keys(eligibleRefs(sources, ['followed:forest'])), ['Aldor Family Farm', 'Laity Pumpkin Patch']);
  assert.equal(followed[0].pointer.showOnMap, undefined);
  assert.deepEqual(keys(eligibleRefs(sources, [])), ['Maan Farms']);
  assert.deepEqual(neededListIds([followed[0].pointer], []), []);
  assert.deepEqual(neededListIds([followed[0].pointer], ['followed:forest']), ['forest']);
  assert.deepEqual(neededListIds([{ id: 'forest', showOnMap: true }, { id: 'quiet' }], []), [], 'an old flag reads nothing');
});

test('map filter: lists that were unfollowed, deleted or withdrawn leave the selection', () => {
  const sources = mapSources({
    myLists: [list('weekend', [farm])],
    followed: [
      follow('forest', [laity]),
      follow('private-now', [maan], { gone: true }),
      follow('republished', [maan], { listPublishedAt: 9 }),
      follow('unread', [], { unread: true }),
    ],
  });
  assert.deepEqual(selectableSources(sources).map(source => source.id), ['mine:weekend', 'followed:forest', 'followed:unread']);
  // Neither the list made private nor the one shared again under a new date adds anything.
  assert.deepEqual(keys(eligibleRefs(sources, ['followed:forest', 'followed:private-now', 'followed:republished'])), ['Laity Pumpkin Patch']);
  const selection = ['mine:weekend', 'followed:private-now', 'mine:deleted', 'followed:forest'];
  assert.deepEqual(pruneSelection(selection, sources), ['mine:weekend', 'followed:forest']);
  const untouched = ['mine:weekend'];
  assert.equal(pruneSelection(untouched, sources), untouched, 'an unchanged selection keeps its identity');
  assert.deepEqual(pruneSelection(['saved'], sources), [], 'single hearts are not a list to pick');
});

// ---------------------------------------------------------------- From references to pins

test('map: custom spots are placed from the reference, their record, or a public copy', () => {
  assert.equal(needsPublicCopy(farm, 'me'), false);
  assert.equal(needsPublicCopy(mine, 'me'), false);
  assert.equal(needsPublicCopy(theirs, 'me'), true);
  assert.equal(needsPublicCopy({ ...theirs, lat: 49.2, lng: -123.1 }, 'me'), false, 'the owner’s list already says where it is');
  assert.equal(needsPublicCopy({ k: 'x', id: 'maya_cafe', name: 'Corner cafe' }, 'me'), true, 'the owner is read from the ID');

  const fromRef = toMapSpot(mine);
  assert.deepEqual([fromRef.key, fromRef.latitude, fromRef.longitude, fromRef.category], ['x:me_steps', 49.28651, -123.112, 'Other']);
  assert.deepEqual(fromRef.ref, { k: 'x', id: 'me_steps', owner: 'me', name: 'Waterfront steps' });

  const unplaced = toMapSpot(theirs);
  assert.equal(unplaced.latitude, undefined);
  assert.deepEqual(pinnable([unplaced, fromRef]), [fromRef]);

  const copy = { name: 'Corner Café', address: '12 Main St, Vancouver', lat: 49.26, lng: -123.1, category: 'Salmon & Wildlife', description: 'Quiet tables', tips: 'Go early' };
  const placed = toMapSpot(theirs, copy);
  assert.deepEqual([placed.name, placed.latitude, placed.locality, placed.category], ['Corner Café', 49.26, 'Vancouver', 'Salmon & Wildlife']);
  assert.equal(placed.description, 'Quiet tables Go early');
  assert.equal(toMapSpot(theirs, { ...copy, category: 'Made up' }).category, 'Other');
});

test('map: bad coordinates never make a pin, and a spot the app dropped is left out', () => {
  assert.equal(toMapSpot(catalogueRef('No Such Farm')), null);
  const winter = toMapSpot(catalogueRef('Glacier Rink'));
  assert.equal(winter.name, 'Glacier Rink');
  const broken = [
    winter,
    toMapSpot({ ...mine, id: 'me_a', lat: 120, lng: 10 }),
    toMapSpot({ ...mine, id: 'me_b', lat: 49, lng: 500 }),
    toMapSpot({ ...mine, id: 'me_c', lat: 'x', lng: 1 }),
    toMapSpot({ k: 'x', id: 'me_d', owner: 'me', name: 'Half', lat: 49.2 }),
  ];
  assert.deepEqual(pinnable(broken), []);
  assert.equal(pinnable([toMapSpot(farm), ...broken]).length, 1, 'the good pin still loads');
  // Malformed entries in a list are skipped rather than crashing.
  assert.deepEqual(keys(eligibleRefs([{ id: 'saved', onMap: true, refs: [null, { k: '?' }, farm] }])), ['Aldor Family Farm']);
});

test('map: when a spot is referenced twice, the reference that knows the place is kept', () => {
  const bare = { k: 'x', id: 'me_steps', owner: 'me', name: 'Waterfront steps' };
  const sources = mapSources({ favourites: { 'x:me_steps': { isFavourite: true, owner: 'me', name: 'Waterfront steps' } }, myLists: [list('weekend', [mine])] });
  const [ref] = eligibleRefs(sources);
  assert.equal(ref.lat, mine.lat);
  assert.equal(eligibleRefs([{ id: 'a', onMap: true, refs: [mine, bare] }]).length, 1);
});

// ---------------------------------------------------------------- Search and filters over saved spots

test('map search: uses the app’s own search, hidden tags included, over saved spots only', () => {
  const saved = [farm, maan, hatchery, mine].map(ref => toMapSpot(ref));
  const sections = mapSections(saved);
  assert.deepEqual(sections.map(section => section.title), ['Pumpkin Patches & Harvest Farms', 'Salmon & Wildlife', 'Other']);
  const index = createSpotIndex(sections, { rankSearch: true, alphabetical: false });
  const names = (query, filters = DEFAULT_FILTERS) => findMatchingSpots(index, query, filters).sections.flatMap(section => section.spots.map(spot => spot.name));

  assert.deepEqual(names('salmon'), ['Tynehead Hatchery']);
  assert.deepEqual(names('langley'), ['Aldor Family Farm']);
  assert.deepEqual(names('waterfront'), ['Waterfront steps']);
  assert.deepEqual(names('Ice skating'), [], 'a spot that is not saved is not found');
  assert.deepEqual(names('', { ...DEFAULT_FILTERS, categories: ['Salmon & Wildlife'] }), ['Tynehead Hatchery']);

  // Distance combines with everything else: within 5 km of the steps there is only the steps.
  const near = { ...DEFAULT_FILTERS, radiusKm: 5, origin: { source: 'custom', label: 'Downtown', latitude: 49.2865, longitude: -123.112 } };
  assert.deepEqual(names('', near), ['Waterfront steps']);
  assert.deepEqual(names('farm', near), []);
});

test('map filter: picked lists light the filter button, and the other screens are unaffected', () => {
  assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, listIds: [] }), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, listIds: ['mine:weekend'] }), true);
});

// ---------------------------------------------------------------- Regions

const vancouver = { latitude: 49.2827, longitude: -123.1207 };

test('map region: opens about 30 km either side of you across the narrow side of the screen', () => {
  const region = regionAround(vancouver, 30, 844 / 390);
  assert.ok(validRegion(region));
  const widthKm = region.longitudeDelta * 111.32 * Math.cos(vancouver.latitude * Math.PI / 180);
  const heightKm = region.latitudeDelta * 110.574;
  assert.ok(Math.abs(widthKm - 60) < 0.5, `width ${widthKm}`);
  assert.ok(Math.abs(heightKm - 60 * (844 / 390)) < 1, `height ${heightKm}`);
  // On a wide screen the height is the narrow side.
  const wide = regionAround(vancouver, 30, 0.5);
  assert.ok(Math.abs(wide.latitudeDelta * 110.574 - 60) < 0.5);
  assert.equal(validRegion({ ...region, latitudeDelta: 0 }), false);
  assert.equal(validRegion({ latitude: 200, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 }), false);
  assert.equal(validRegion(null), false);
});

test('map region: fits saved spots wherever they are, and tells what is in view', () => {
  assert.equal(regionFor([]), null);
  assert.equal(regionFor([{ latitude: 'x', longitude: 1 }]), null);
  const whistler = { key: 'w', latitude: 50.1163, longitude: -122.9574 };
  const tokyo = { key: 't', latitude: 35.6762, longitude: 139.6503 };
  const home = { key: 'h', ...vancouver };
  const both = regionFor([home, whistler]);
  assert.ok(inBounds(home, regionBounds(both)) && inBounds(whistler, regionBounds(both)));
  assert.ok(validRegion(regionFor([home])), 'one spot still gives a usable view');

  const city = regionAround(vancouver, 30, 2);
  assert.deepEqual(spotsInRegion([home, whistler, tokyo, { key: 'bad', latitude: null, longitude: 1 }], city).map(spot => spot.key), ['h']);
  // Panning to Whistler brings its pin in: nothing is limited to the first 30 km.
  assert.deepEqual(spotsInRegion([home, whistler, tokyo], regionAround(whistler, 10, 2)).map(spot => spot.key), ['w']);
  assert.deepEqual(spotsInRegion([home, tokyo], regionAround(tokyo, 30, 2)).map(spot => spot.key), ['t']);
  // A view across the 180th meridian holds points on both sides of it.
  const pacific = regionBounds({ latitude: 0, longitude: 179, latitudeDelta: 10, longitudeDelta: 10 });
  assert.ok(inBounds({ latitude: 0, longitude: -178 }, pacific));
  assert.ok(inBounds({ latitude: 0, longitude: 177 }, pacific));
  assert.equal(inBounds({ latitude: 0, longitude: 0 }, pacific), false);
  assert.ok(inBounds(tokyo, regionBounds({ latitude: 0, longitude: 0, latitudeDelta: 170, longitudeDelta: 360 })));
});

// ---------------------------------------------------------------- Clusters

const spread = (total, around = vancouver, step = 0.0004) => Array.from({ length: total }, (_, index) => ({
  key: `s${String(index).padStart(5, '0')}`, latitude: around.latitude + (index % 60) * step, longitude: around.longitude + Math.floor(index / 60) * step,
}));

test('map clusters: nearby pins group when zoomed out and separate when zoomed in', () => {
  const twelve = spread(12);
  const far = { key: 'far', latitude: 49.05, longitude: -122.3 };
  const wide = clusterSpots([...twelve, far], regionAround(vancouver, 30, 2), { width: 390 });
  assert.deepEqual(wide.map(item => item.type).sort(), ['cluster', 'spot']);
  const cluster = wide.find(item => item.type === 'cluster');
  assert.equal(cluster.count, 12);
  assert.equal(cluster.spots.length, 12);
  assert.ok(Math.abs(cluster.latitude - vancouver.latitude) < 0.02 && Math.abs(cluster.longitude - vancouver.longitude) < 0.02);
  assert.equal(wide.find(item => item.type === 'spot').spot.key, 'far');

  const close = clusterSpots(twelve, { ...vancouver, latitudeDelta: 0.002, longitudeDelta: 0.002 }, { width: 390 });
  assert.equal(close.length, 12);
  assert.ok(close.every(item => item.type === 'spot'), 'individual pins are selectable once zoomed in');

  // No pin is ever lost or drawn twice.
  const counted = wide.reduce((sum, item) => sum + (item.type === 'cluster' ? item.count : 1), 0);
  assert.equal(counted, 13);
  assert.equal(new Set(wide.map(item => (item.type === 'cluster' ? item.id : item.spot.key))).size, wide.length);
});

test('map clusters: hold still while dragging, and leave the open preview’s pin alone', () => {
  const pins = spread(12);
  const region = regionAround(vancouver, 30, 2);
  const before = clusterSpots(pins, region, { width: 390 });
  const dragged = clusterSpots(pins, { ...region, latitude: region.latitude + 0.05, longitude: region.longitude - 0.08 }, { width: 390 });
  assert.deepEqual(dragged, before);

  const pinned = clusterSpots(pins, region, { width: 390, pinnedKey: 's00003' });
  assert.equal(pinned.find(item => item.type === 'spot').spot.key, 's00003');
  assert.equal(pinned.find(item => item.type === 'cluster').count, 11);
  // Without a usable region every pin is simply shown.
  assert.equal(clusterSpots(pins, null, { width: 390 }).length, 12);
  assert.equal(clusterSpots(pins, region, { width: 0 }).length, 12);
});

test('map clusters: three thousand saved spots stay quick', () => {
  const many = spread(3000, vancouver, 0.002);
  const started = process.hrtime.bigint();
  const region = regionAround(vancouver, 30, 2);
  const items = clusterSpots(spotsInRegion(many, region), region, { width: 390 });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(items.length < 400, `${items.length} markers for 3,000 spots`);
  assert.ok(elapsedMs < 250, `clustering took ${elapsedMs} ms`);
});

// ---------------------------------------------------------------- Keeping the preview on screen

test('map preview: the view slides just enough to keep the card clear of the edges and the bars', () => {
  const card = { width: 240, height: 90 }, frame = { top: 70, bottom: 600, left: 12, right: 378 };
  assert.deepEqual(nudgeIntoFrame({ x: 195, y: 300 }, card, frame, 20), { dx: 0, dy: 0 });
  assert.deepEqual(nudgeIntoFrame({ x: 40, y: 300 }, card, frame, 20), { dx: -92, dy: 0 });
  assert.deepEqual(nudgeIntoFrame({ x: 380, y: 300 }, card, frame, 20), { dx: 122, dy: 0 });
  assert.deepEqual(nudgeIntoFrame({ x: 195, y: 100 }, card, frame, 20), { dx: 0, dy: -80 });
  assert.deepEqual(nudgeIntoFrame({ x: 195, y: 640 }, card, frame, 20), { dx: 0, dy: 60 });

  const region = { ...vancouver, latitudeDelta: 0.4, longitudeDelta: 0.2 };
  const size = { width: 400, height: 800 };
  const moved = shiftRegion(region, -100, -80, size);
  assert.ok(Math.abs(moved.longitude - (vancouver.longitude - 0.05)) < 1e-9, 'the view moves left, so the pin moves right');
  assert.ok(Math.abs(moved.latitude - (vancouver.latitude + 0.04)) < 1e-9, 'the view moves up, so the pin moves down');
  assert.deepEqual([moved.latitudeDelta, moved.longitudeDelta], [0.4, 0.2]);
  assert.equal(shiftRegion({ ...region, longitude: 179.99 }, 100, 0, size).longitude < 0, true);
});
