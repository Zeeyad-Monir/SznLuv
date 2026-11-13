// The Map tab as a person meets it: which pins show, the preview, search, the list filter, and what it says
// when there is nothing to show. The rules themselves are covered in mapSpots.test.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, textOf, quiet, flush } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot, toPublicSnapshot } = require('../services/listsState');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const laity = catalogueRef('Laity Pumpkin Patch');
const steps = { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
const mayaSteps = { k: 'x', id: 'maya-uid_steps1', owner: 'maya-uid', name: 'Maya’s lookout', lat: 49.3, lng: -123.14 };
// Someone else's spot inside Maya's list: her list only links it, so where it is comes from its public copy.
const pier = { k: 'x', id: 'sam-uid_pier', owner: 'sam-uid', name: 'Old pier' };
const heart = (season = 'Fall') => ({ isFavourite: true, season, location: '', savedAt: 1 });
const listOf = (title, refs, ownerUid = 'audit') => refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid, title, now: 1 }));
const pointer = { ownerUid: 'maya-uid', ownerUsername: 'maya', title: 'Golden Hour', publishedAt: 100, followedAt: 5, lastOpenedAt: 5 };

const saved = {
  'users/audit': { username: 'audit' },
  'favourites/audit': { listsMigratedAt: 1, 'Aldor Family Farm': heart(), 'Tynehead Hatchery': heart() },
  'lists/w': listOf('Weekend', [maan, steps]),
  'spots/audit_steps1': { ownerUid: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112, photos: [], publicListIds: [] },
};
const following = {
  'publicLists/m': toPublicSnapshot(listOf('Golden Hour', [laity, mayaSteps, pier], 'maya-uid'), { ownerUsername: 'maya', now: 100 }),
  'publicSpots/sam-uid_pier': { ownerUid: 'sam-uid', name: 'Old pier', lat: 49.31, lng: -123.2, category: 'Salmon & Wildlife' },
  'users/audit/followedLists/m': pointer,
};
const MINE = ['c:Aldor Family Farm', 'c:Maan Farms', 'c:Tynehead Hatchery', 'x:audit_steps1'];
const MAYAS = ['c:Laity Pumpkin Patch', 'x:maya-uid_steps1', 'x:sam-uid_pier'];
const everywhere = { latitude: 49.2, longitude: -122.9, latitudeDelta: 1.2, longitudeDelta: 1.6 };

async function openMap(documents = saved, { location = false, harness = {} } = {}) {
  // The same options object is kept, so a test can change it (a read that fails, then works).
  const h = createHarness(Object.assign(harness, { documents: { ...documents } }));
  const screen = await quiet(() => mount(h, 'screens/MapScreen.js', { location }));
  const settle = async () => { for (let pass = 0; pass < 6; pass += 1) await flush(); };
  await settle();
  const mapView = () => screen.all('MapView')[0];
  const markers = prefix => screen.all('Marker').map(node => node.props.testID).filter(id => id?.startsWith(prefix));
  const pins = () => markers('map-pin:').map(id => id.slice('map-pin:'.length)).sort();
  const pin = key => screen.all('Marker').find(node => node.props.testID === `map-pin:${key}`);
  const preview = () => screen.all('Marker').find(node => node.props.testID === 'map-preview');
  const tap = async marker => { await act(async () => { await marker.props.onPress({ stopPropagation() {} }); }); await flush(); };
  // A screen so large that nothing overlaps, so every pin is drawn on its own.
  const spreadOut = () => act(async () => {
    screen.all('View').find(node => node.props.testID === 'map-frame').props.onLayout({ nativeEvent: { layout: { width: 4e6, height: 8e6 } } });
    mapView().props.onMapReady();
  });
  const look = async (region = everywhere, isGesture = true) => {
    await act(async () => mapView().props.onRegionChangeComplete(region, { isGesture }));
    await flush();
  };
  const type = async text => {
    const input = screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Search saved spots');
    await act(async () => { input.props.onFocus?.(); input.props.onChangeText(text); });
    await flush();
  };
  const moves = () => h.calls.filter(([name]) => name === 'animateToRegion' || name === 'fitToCoordinates');
  return { h, screen, settle, mapView, pins, pin, preview, tap, spreadOut, look, type, moves, markers };
}

// ---------------------------------------------------------------- Pins

test('map: hearts and my own lists are pinned once each; a followed list adds nothing by default', async () => {
  // Even a follow that still carries the old "Show all spots on map" flag stays off the default map.
  const { pins, spreadOut, look } = await openMap({ ...saved, ...following, 'users/audit/followedLists/m': { ...pointer, showOnMap: true } });
  await spreadOut();
  await look();
  assert.deepEqual(pins(), MINE, 'a followed list is picked in the filter instead');
});

test('map: saving and unsaving while the map is open moves the pins without a refresh', async () => {
  const { h, pins, spreadOut, look, settle } = await openMap();
  await spreadOut();
  await look();
  const favourites = h.load('services/favourites.js');
  await act(async () => { await favourites.toggleSavedSpot('audit', 'Laity Pumpkin Patch', heart()); });
  await settle();
  assert.ok(pins().includes('c:Laity Pumpkin Patch'));

  // Maan Farms is hearted too, then un-hearted: its list still holds it, so the pin stays.
  await act(async () => { await favourites.toggleSavedSpot('audit', 'Maan Farms', heart()); });
  await act(async () => { await favourites.removeSavedSpot('audit', 'Maan Farms'); });
  await settle();
  assert.ok(pins().includes('c:Maan Farms'));

  await act(async () => { await favourites.removeSavedSpot('audit', 'Aldor Family Farm'); });
  await settle();
  assert.equal(pins().includes('c:Aldor Family Farm'), false, 'nothing else holds the farm, so its pin goes');

  const lists = h.load('services/lists.js');
  await act(async () => { await lists.deleteList('w'); });
  await settle();
  assert.deepEqual(pins(), ['c:Laity Pumpkin Patch', 'c:Tynehead Hatchery'], 'deleting a list takes its pins with it');
});

test('map: pins that would overlap are counted together, and tapping the count zooms into them', async () => {
  const { h, screen, look, mapView, markers, pins, tap } = await openMap();
  await act(async () => mapView().props.onMapReady());
  await look({ latitude: 49.2, longitude: -122.9, latitudeDelta: 2.4, longitudeDelta: 3.2 });
  const clusters = markers('map-cluster:');
  assert.ok(clusters.length >= 1, 'at this zoom some of the four pins sit on top of each other');
  const counted = clusters.reduce((sum, id) => sum + Number(id.split(':')[1]), 0) + pins().length;
  assert.equal(counted, 4, 'every saved spot is drawn exactly once, alone or in a count');

  await tap(screen.all('Marker').find(node => node.props.testID === clusters[0]));
  const [name, coordinates] = h.calls.filter(([call]) => call === 'fitToCoordinates').at(-1);
  assert.equal(name, 'fitToCoordinates');
  assert.equal(coordinates.length, Number(clusters[0].split(':')[1]));
});

// ---------------------------------------------------------------- Preview

test('map: a pin shows one preview at a time, which opens the spot’s own page', async () => {
  const { h, screen, spreadOut, look, pin, preview, tap, mapView, settle } = await openMap();
  await spreadOut();
  await look();
  assert.equal(preview(), undefined);

  await tap(pin('c:Aldor Family Farm'));
  assert.deepEqual(textOf(preview()), ['Aldor Family Farm', 'Tap for more details'], 'no distance without a location');
  assert.equal(pin('c:Aldor Family Farm').props.accessibilityState.selected, true);

  await tap(pin('x:audit_steps1'));
  assert.deepEqual(textOf(preview()), ['Waterfront steps', 'Tap for more details']);
  assert.equal(screen.all('Marker').filter(node => node.props.testID === 'map-preview').length, 1);

  // A marker press also reaches the map; only a tap on empty map closes the preview.
  await act(async () => mapView().props.onPress({ nativeEvent: { action: 'marker-press' } }));
  assert.ok(preview());
  await tap(preview());
  assert.deepEqual(h.navigations.at(-1), ['SpotDetailScreen', { spot: { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps' } }]);
  assert.ok(preview(), 'the preview is still there when you come back');
  await act(async () => mapView().props.onPress({ nativeEvent: {} }));
  assert.equal(preview(), undefined);

  // Unsaving a spot while its preview is open closes the preview with the pin.
  await tap(pin('c:Aldor Family Farm'));
  await act(async () => { await h.load('services/favourites.js').removeSavedSpot('audit', 'Aldor Family Farm'); });
  await settle();
  assert.equal(preview(), undefined);
  assert.equal(pin('c:Aldor Family Farm'), undefined);
});

// ---------------------------------------------------------------- Location

const here = { latitude: 49.2827, longitude: -123.1207 };
const locationStub = (answers = {}) => {
  const asked = [];
  return {
    asked,
    stub: {
      getForegroundPermissionsAsync: async () => answers.current ?? { granted: true, status: 'granted' },
      requestForegroundPermissionsAsync: async () => { asked.push('request'); return answers.request ?? { granted: true, status: 'granted' }; },
      hasServicesEnabledAsync: async () => true,
      getCurrentPositionAsync: async () => ({ coords: here }),
      watchPositionAsync: async (_options, onPosition) => { onPosition({ coords: here }); return { remove() {} }; },
      Accuracy: { Balanced: 3, High: 4 },
    },
  };
};

test('map: with location on it opens about 30 km around you and says how far each spot is', async () => {
  const { stub, asked } = locationStub();
  const { h, screen, mapView, spreadOut, look, pin, preview, tap, moves } = await openMap(saved, { location: true, harness: { stubs: { 'expo-location': stub } } });
  const opening = mapView().props.initialRegion;
  assert.deepEqual([opening.latitude, opening.longitude], [here.latitude, here.longitude]);
  const widthKm = opening.longitudeDelta * 111.32 * Math.cos(here.latitude * Math.PI / 180);
  assert.ok(Math.abs(widthKm - 60) < 1, `the opening view is ${widthKm} km wide`);
  assert.equal(mapView().props.showsUserLocation, true);
  assert.deepEqual(asked, [], 'permission already given is not asked for again');

  await spreadOut();
  await look();
  await tap(pin('x:audit_steps1'));
  assert.match(textOf(preview())[1], /^\d+ m away$|^\d+(\.\d)? km away$/);
  await tap(pin('c:Aldor Family Farm'));
  assert.match(textOf(preview())[1], /^4\d km away$/, 'Langley is about 43 km in a straight line');

  // Recentring moves the map only: the search text and the open preview's filters are untouched.
  const before = moves().length;
  await screen.press('Centre the map on my location');
  const [, region] = moves().at(-1);
  assert.equal(moves().length, before + 1);
  assert.deepEqual([region.latitude, region.longitude], [here.latitude, here.longitude]);
  assert.equal(h.storage.has('map.region.audit'), false, 'nothing is remembered until the view has settled');
});

test('map: the first visit asks for location once; a yes turns it on, a no leaves the map working', async () => {
  const yes = locationStub({ current: { granted: false, status: 'undetermined', canAskAgain: true } });
  const allowed = await openMap(saved, { harness: { stubs: { 'expo-location': yes.stub } } });
  assert.deepEqual(yes.asked, ['request']);
  assert.equal(allowed.mapView().props.showsUserLocation, true, 'saying yes also turns on the app’s own location setting');

  const answers = { current: { granted: false, status: 'undetermined', canAskAgain: true }, request: { granted: false, status: 'denied', canAskAgain: false } };
  const no = locationStub(answers);
  const denied = await openMap(saved, { harness: { stubs: { 'expo-location': no.stub } } });
  assert.deepEqual(no.asked, ['request']);
  assert.equal(denied.mapView().props.showsUserLocation, false);
  await denied.spreadOut();
  await denied.look();
  assert.deepEqual(denied.pins(), MINE, 'the pins are all still there');
  await denied.tap(denied.pin('c:Aldor Family Farm'));
  assert.deepEqual(textOf(denied.preview()), ['Aldor Family Farm', 'Tap for more details'], 'no made-up distance');
  // Once the phone has said no, the offer to turn it on leads to the phone's settings.
  answers.current = { granted: false, status: 'denied', canAskAgain: false };
  await denied.screen.press('Turn on location');
  assert.ok(denied.h.calls.some(([name]) => name === 'openSettings'));
  assert.deepEqual(no.asked, ['request'], 'and it is not asked a second time');
});

test('map: a position that arrives late still centres the map, unless it has been touched first', async () => {
  const late = () => {
    const { stub } = locationStub();
    const holder = {};
    stub.watchPositionAsync = async (_options, onPosition) => { holder.deliver = () => onPosition({ coords: here }); return { remove() {} }; };
    return { stub, holder };
  };
  const waitForOpening = () => new Promise(resolve => setTimeout(resolve, 1600));

  const untouched = late();
  const first = await openMap(saved, { location: true, harness: { stubs: { 'expo-location': untouched.stub } } });
  assert.equal(first.mapView(), undefined, 'the map waits a moment for a position');
  await waitForOpening();
  await first.settle();
  assert.deepEqual([first.mapView().props.initialRegion.latitude, first.mapView().props.initialRegion.longitude], [49.2827, -123.1207]);
  // Asking to recentre before there is a position says so instead of doing nothing.
  await first.screen.press('Centre the map on my location');
  assert.deepEqual(first.screen.snackbar(), ['Still finding your location. Try again in a moment.']);
  // iOS places the opening view before the map has a size, so it is placed again once it is ready and laid out.
  await act(async () => { first.mapView().props.onMapReady(); first.mapView().props.onLayout({ nativeEvent: { layout: { width: 390, height: 700 } } }); });
  assert.deepEqual(first.moves().at(-1), ['animateToRegion', first.mapView().props.initialRegion, 0]);
  await act(async () => untouched.holder.deliver());
  await first.settle();
  const [, centred] = first.moves().at(-1);
  assert.deepEqual([centred.latitude, centred.longitude], [here.latitude, here.longitude]);

  const touched = late();
  const second = await openMap(saved, { location: true, harness: { stubs: { 'expo-location': touched.stub } } });
  await waitForOpening();
  await second.settle();
  await act(async () => second.mapView().props.onTouchStart());
  const before = second.moves().length;
  await act(async () => touched.holder.deliver());
  await second.settle();
  assert.equal(second.moves().length, before, 'the map is not pulled away from where the user is looking');
  assert.equal(second.mapView().props.showsUserLocation, true, 'the blue dot still shows');
});

test('map: without location it opens on the last view, or else on the saved spots, and offers to turn location on', async () => {
  const last = { latitude: 50.11, longitude: -122.95, latitudeDelta: 0.3, longitudeDelta: 0.2 };
  const returning = await openMap(saved, { harness: { storage: { 'map.region.audit': JSON.stringify(last) } } });
  assert.deepEqual(returning.mapView().props.initialRegion, last);
  await act(async () => returning.mapView().props.onMapReady());
  await returning.settle();
  assert.equal(returning.moves().length, 0, 'a remembered view is left alone');

  const first = await openMap();
  const city = first.mapView().props.initialRegion;
  assert.deepEqual([city.latitude, city.longitude], [49.2827, -123.1207], 'a sensible default until the spots are known');
  await act(async () => first.mapView().props.onMapReady());
  await first.settle();
  const [, fitted] = first.moves().at(-1);
  for (const [latitude, longitude] of [[49.15467, -122.53112], [49.28651, -123.112]]) {
    assert.ok(Math.abs(latitude - fitted.latitude) <= fitted.latitudeDelta / 2 && Math.abs(longitude - fitted.longitude) <= fitted.longitudeDelta / 2);
  }
  assert.ok(first.screen.texts().includes('Location is off'));
  assert.equal(first.mapView().props.showsUserLocation, false);
  // The phone already allows it here, so one tap turns the app's own setting on.
  await first.screen.press('Turn on');
  await first.settle();
  assert.equal(first.mapView().props.showsUserLocation, true);
  assert.equal(first.screen.texts().includes('Location is off'), false);

  // The view is remembered once it has settled, for next time.
  await first.look(last);
  await new Promise(resolve => setTimeout(resolve, 900));
  assert.deepEqual(JSON.parse(first.h.storage.get('map.region.audit')), last);
});

// ---------------------------------------------------------------- Search and filters

test('map search: narrows the pins with the app’s own search, and a result flies to its pin and opens it', async () => {
  const { screen, spreadOut, look, type, pins, preview, moves } = await openMap();
  await spreadOut();
  await look();
  const before = moves().length;
  await type('salmon');
  assert.deepEqual(pins(), ['c:Tynehead Hatchery'], 'found by its hidden tags');
  assert.ok(screen.texts().includes('1 spot found'));
  assert.equal(moves().length, before, 'typing does not move the map');

  await screen.press('Tynehead Hatchery. Show on map');
  assert.equal(moves().length, before + 1);
  assert.equal(textOf(preview())[0], 'Tynehead Hatchery');
  assert.equal(screen.texts().includes('1 spot found'), false, 'the results close once one is chosen');

  await type('zzzz');
  assert.deepEqual(pins(), []);
  assert.ok(screen.texts().includes('No saved spots match your search.'));
  assert.equal(screen.texts().includes('Your map is looking a little empty.'), false, 'it does not claim nothing is saved');
  await screen.press('Clear search');
  assert.deepEqual(pins(), MINE);
});

test('map filter: picking lists shows only their spots, including a followed list', async () => {
  const { h, screen, spreadOut, look, pins, settle } = await openMap({ ...saved, ...following, 'users/audit/savedCollections/vancouver-fall': { collectionId: 'vancouver-fall', cityId: 'vancouver', savedAt: 1 } });
  await spreadOut();
  await look();
  await screen.press('Filter spots');
  const rows = () => screen.all('TouchableOpacity').filter(node => node.props.accessibilityRole === 'checkbox');
  assert.deepEqual(rows().map(node => node.props.accessibilityLabel),
    ['Weekend, 2 spots', 'Golden Hour, Following · by maya', 'Fall, Vancouver · 50 spots']);
  assert.ok(screen.texts().includes('Lists & collections'));
  assert.equal(screen.texts().includes('Sort by'), false, 'sorting is left out on a map');
  assert.equal(screen.button('Search lists'), undefined, 'three lists all fit, so there is nothing to search');
  assert.equal(screen.all('TouchableOpacity').some(node => /^Show \d+ more$/.test(textOf(node).join(''))), false);

  const pick = async label => { await act(async () => rows().find(node => node.props.accessibilityLabel === label).props.onPress()); };
  await pick('Golden Hour, Following · by maya');
  assert.ok(screen.texts().includes('1 selected'));
  assert.deepEqual(pins(), MINE, 'nothing changes until Apply');
  await screen.press('Apply Filters');
  await settle();
  assert.deepEqual(pins(), MAYAS, 'its catalogue spot, the owner’s spot and a linked spot from its public copy; the single hearts wait until the filter is cleared');
  assert.equal('showOnMap' in h.documents.get('users/audit/followedLists/m'), false, 'picking it writes nothing');
  assert.ok(screen.button('Filter spots, filters active'));
  assert.ok(screen.texts().includes('3 spots match your filters'));

  // Two lists together: every spot in either, once.
  await screen.press('Filter spots, filters active');
  assert.equal(rows().find(node => node.props.accessibilityLabel.startsWith('Golden Hour')).props.accessibilityState.checked, true);
  await pick('Weekend, 2 spots');
  assert.ok(screen.texts().includes('2 selected'));
  await screen.press('Apply Filters');
  await settle();
  assert.deepEqual(pins(), ['c:Maan Farms', 'x:audit_steps1', ...MAYAS].sort());

  // Unfollowing a picked list drops it from the filter by itself.
  await act(async () => { await h.load('services/follows.js').unfollowList('audit', 'm'); });
  await settle();
  assert.deepEqual(pins(), ['c:Maan Farms', 'x:audit_steps1']);
  await screen.press('Clear filters');
  await settle();
  assert.deepEqual(pins(), MINE);
  assert.ok(screen.button('Filter spots'));
});

test('map filter: lists combine with categories and search, and Reset clears every choice', async () => {
  const { screen, spreadOut, look, pins, settle, type } = await openMap({ ...saved, 'lists/d': listOf('Dates', [farm, catalogueRef('Tynehead Hatchery')]) });
  await spreadOut();
  await look();
  await screen.press('Filter spots');
  const row = label => screen.all('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  await act(async () => row('Dates, 2 spots').props.onPress());
  await screen.press('Salmon & Wildlife');
  await screen.press('Apply Filters');
  await settle();
  assert.deepEqual(pins(), ['c:Tynehead Hatchery'], 'in the picked list and in the picked category');
  await type('farm');
  assert.deepEqual(pins(), []);
  assert.ok(screen.texts().includes('No saved spots match your filters.'));
  await screen.press('Clear search');
  assert.deepEqual(pins(), ['c:Tynehead Hatchery'], 'clearing the search keeps the filters');

  await screen.press('Filter spots, filters active');
  await screen.press('Reset Filters');
  assert.equal(row('Dates, 2 spots').props.accessibilityState.checked, false);
  await screen.press('Apply Filters');
  await settle();
  assert.deepEqual(pins(), MINE);
});

test('map filter: many lists show five, reveal more in batches, and every one can be searched', async () => {
  const many = { ...saved };
  for (let n = 1; n <= 120; n += 1) many[`lists/l${n}`] = addSpot(createList({ ownerUid: 'audit', title: `Trip ${n}`, now: n + 1 }), maan);
  many['lists/again'] = createList({ ownerUid: 'audit', title: 'Trip 1', now: 500 }); // the same name, told apart by its caption
  const { screen } = await openMap(many);
  await screen.press('Filter spots');
  const rows = () => screen.all('TouchableOpacity').filter(node => node.props.accessibilityRole === 'checkbox')
    .map(node => node.props.accessibilityLabel);
  const type = text => act(async () => screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Search lists').props.onChangeText(text));
  assert.equal(rows().length, 5, 'the panel starts compact');
  await screen.press('Show 10 more');
  assert.equal(rows().length, 15);

  await screen.press('Search lists');
  const field = screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Search lists');
  assert.equal(field.props.autoFocus, true, 'the field is ready to type in');
  await type('trip 118');
  assert.deepEqual(rows(), ['Trip 118, 1 spot'], 'found though it was not shown yet');
  await act(async () => screen.all('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Trip 118, 1 spot').props.onPress());
  assert.ok(screen.texts().includes('1 selected'));

  await type('zzz');
  assert.deepEqual(rows(), []);
  assert.ok(screen.texts().includes('No lists match “zzz”.'));
  assert.ok(screen.button('Remove Trip 118, 1 spot'), 'the pick stays in view outside the search');
  await screen.press('Clear search');
  assert.equal(rows().length, 15);
  assert.ok(screen.button('Remove Trip 118, 1 spot'), 'and past the lists shown so far');

  await type('trip 1');
  assert.ok(rows().includes('Trip 1, 1 spot') && rows().includes('Trip 1, 0 spots'), 'two lists with one name read differently');
  await screen.press('Close list search');
  assert.equal(screen.all('TextInput').some(node => node.props.accessibilityLabel === 'Search lists'), false);
  assert.ok(screen.button('Search lists'));

  await screen.press('Remove Trip 118, 1 spot');
  assert.equal(screen.texts().includes('1 selected'), false);
  for (let reveals = 0; reveals < 11; reveals += 1) await screen.press(screen.all('TouchableOpacity').map(node => textOf(node).join('')).find(label => /^Show \d+ more$/.test(label)));
  assert.equal(rows().length, 122, 'every list, mine and the Weekend one');
  assert.equal(screen.all('TouchableOpacity').some(node => /^Show \d+ more$/.test(textOf(node).join(''))), false, 'Show more goes once all are shown');
});

test('map filter: with no lists it says so, with no search or Show more', async () => {
  const { 'lists/w': _weekend, ...noLists } = saved;
  const { screen } = await openMap(noLists);
  await screen.press('Filter spots');
  assert.ok(screen.texts().includes('No saved lists yet. Lists you make, follow or keep with a heart show up here.'));
  assert.equal(screen.button('Search lists'), undefined);
  assert.equal(screen.all('TouchableOpacity').some(node => node.props.accessibilityRole === 'checkbox'), false);
});

// ---------------------------------------------------------------- Nothing to show, and trouble

test('map: says so kindly when nothing is saved, and when the saved spots have no place', async () => {
  const empty = await openMap({ 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } });
  assert.ok(empty.screen.texts().includes('Your map is looking a little empty.'));
  assert.ok(empty.screen.texts().includes('Save your favourite spots to see them here.'));
  await empty.screen.press('Explore spots');
  assert.deepEqual(empty.h.navigations.at(-1), ['HomeTab', { screen: 'SeasonsScreen', initial: false }]);

  // Winter's spots have no coordinates yet: no pin is guessed for them.
  const unplaced = await openMap({ 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1, 'Glacier Rink': heart('Winter') } });
  await unplaced.spreadOut();
  await unplaced.look();
  assert.deepEqual(unplaced.pins(), []);
  assert.ok(unplaced.screen.texts().includes('Nothing to pin yet'));
  assert.equal(unplaced.screen.texts().includes('Your map is looking a little empty.'), false);
});

test('map: an area with no saved spots says so and offers the way back to them', async () => {
  const { h, screen, spreadOut, look, pins } = await openMap();
  await spreadOut();
  await look({ latitude: 35.68, longitude: 139.65, latitudeDelta: 0.5, longitudeDelta: 0.5 });
  assert.deepEqual(pins(), []);
  assert.ok(screen.texts().includes('No saved spots in this area'));
  assert.equal(screen.texts().includes('Your map is looking a little empty.'), false);
  await screen.press('Show saved spots');
  const [name, coordinates] = h.calls.filter(([call]) => call === 'fitToCoordinates').at(-1);
  assert.equal(name, 'fitToCoordinates');
  assert.equal(coordinates.length, 4);
});

test('map: a list that can’t be read says so, keeps the other pins, and loads on Try again', async () => {
  const options = { readError: 'unavailable' };
  const { screen, spreadOut, look, pins, settle } = await quiet(() => openMap({ ...saved, ...following }, { harness: options }));
  await spreadOut();
  await look();
  await screen.press('Filter spots');
  const rows = () => screen.all('TouchableOpacity').filter(node => node.props.accessibilityRole === 'checkbox');
  await act(async () => rows().find(node => node.props.accessibilityLabel.startsWith('Golden Hour')).props.onPress());
  await rows().find(node => node.props.accessibilityLabel.startsWith('Weekend')).props.onPress();
  await quiet(() => screen.press('Apply Filters'));
  await quiet(settle);
  assert.ok(screen.texts().includes('Couldn’t load some saved spots'));
  assert.deepEqual(pins(), ['c:Maan Farms', 'x:audit_steps1'], 'what is already known is still shown');

  options.readError = undefined;
  await quiet(() => screen.press('Try again'));
  await settle();
  assert.equal(screen.texts().includes('Couldn’t load some saved spots'), false);
  assert.deepEqual(pins(), ['c:Maan Farms', 'x:audit_steps1', ...MAYAS].sort());
});

test('map: a followed list that was deleted or made private stops adding pins, with no error', async () => {
  const gone = { ...saved, 'users/audit/followedLists/m': pointer };
  const { screen, spreadOut, look, pins, settle } = await openMap(gone);
  await spreadOut();
  await look();
  assert.deepEqual(pins(), MINE);
  // It is only read once picked: then it is found gone, adds nothing, and the map goes back to the default set.
  await screen.press('Filter spots');
  const rows = () => screen.all('TouchableOpacity').filter(node => node.props.accessibilityRole === 'checkbox');
  await act(async () => rows().find(node => node.props.accessibilityLabel.startsWith('Golden Hour')).props.onPress());
  await screen.press('Apply Filters');
  await settle();
  assert.deepEqual(pins(), MINE);
  assert.equal(screen.texts().includes('Couldn’t load some saved spots'), false);
  await screen.press('Filter spots');
  assert.deepEqual(rows().map(node => node.props.accessibilityLabel), ['Weekend, 2 spots'], 'it is no longer offered in the filter');
});
