const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { createHarness, act } = require('./renderHarness.cjs');
const { fallCategories, legacyFallSpots, detailedFallSpots, fallSpotNames } = require('../services/spots');
const {
  createSpotIndex, DEFAULT_FILTERS, distanceKm, findMatchingSpots, hasCoordinates,
  RADIUS_MIN, RADIUS_MAX, RADIUS_STOPS, radiusAt, radiusPosition, stepRadius, widerRadius,
  withCurrentPosition, isApproximate,
} = require('../services/spotDiscovery');

const origin = { latitude: 0, longitude: 0 };
const atBoundary = { latitude: 0, longitude: 0.05 };
const index = createSpotIndex([
  { title: 'Gardens', spots: [
    { name: 'Éden Park', address: '10 Oak St', tagline: 'Picnic grove', ...atBoundary },
    { name: 'Willow Park', address: '10 Oak St', latitude: 0, longitude: 0.15 },
  ] },
  { title: 'Cafés', spots: [
    { name: 'Zeta Café', address: 'Oak Lane', latitude: 0, longitude: 0.01 },
    { name: 'Acorn Café', address: 'Cedar Lane' },
  ] },
]);
const matches = (query, patch) => findMatchingSpots(index, query, { ...DEFAULT_FILTERS, ...patch });
const names = result => result.sections.flatMap(section => section.spots.map(spot => spot.name));
const fallIndex = createSpotIndex(fallCategories, { rankSearch: true });
const fallMatches = (query, patch) => names(findMatchingSpots(fallIndex, query, { ...DEFAULT_FILTERS, ...patch }));

test('spot search combines normalized terms, category choices and an inclusive radius', () => {
  const radiusKm = distanceKm(origin, atBoundary);
  assert.ok(Math.abs(radiusKm - 5.56) < 0.02);
  const filters = { categories: ['Gardens'], origin, radiusKm };
  assert.deepEqual(names(matches('  EDEN picnic, oak gardens  ', filters)), ['Éden Park']);
  assert.deepEqual(names(matches('oak', { ...filters, radiusKm: radiusKm - 0.01 })), []);
  assert.deepEqual(names(matches('cafe', { ...filters, categories: ['Gardens', 'Cafés'] })), ['Zeta Café']);
  assert.deepEqual(names(matches('oak nonexistent', {})), []);
});

test('catalogue sections keep their order and global sorts handle unknown coordinates', () => {
  assert.deepEqual(matches('', {}).sections.map(section => section.title), ['Gardens', 'Cafés']);
  assert.deepEqual(names(matches('', { sort: 'alphabetical' })), ['Acorn Café', 'Éden Park', 'Willow Park', 'Zeta Café']);
  assert.deepEqual(names(matches('', { origin, sort: 'nearest' })), ['Zeta Café', 'Éden Park', 'Willow Park', 'Acorn Café']);
  assert.deepEqual(names(matches('', { origin, sort: 'nearest', radiusKm: 5 })), ['Zeta Café']);
  assert.equal(createSpotIndex([{ title: 'Only', spots: [{ name: 'Spot' }] }]).supportsDistance, false);
  assert.deepEqual(createSpotIndex(fallCategories, { distance: false, categories: false }).categoryOptions, []);
  assert.ok(fallCategories.flatMap(section => section.spots).every(hasCoordinates));
});

test('every Fall spot has ten distinct tags and appears in a search for its locality', () => {
  const catalogue = [...legacyFallSpots, ...detailedFallSpots];
  assert.equal(catalogue.length, fallSpotNames.length);
  for (const { name, address, searchTags } of catalogue) {
    assert.equal(searchTags.length, 10, name);
    assert.ok(searchTags.every(tag => tag.trim().length > 0), name);
    assert.equal(new Set(searchTags.map(tag => tag.trim().toLowerCase())).size, 10, name);
    const city = address.split(',').at(-1).trim();
    assert.ok(searchTags.some(tag => tag.endsWith(city)), `${name} has a locality tag`);
    assert.ok(fallMatches(city).includes(name), `${name} matches ${city}`);
  }
  assert.deepEqual(fallMatches('North Vancouver'), ['Canyon Frights at Capilano']);
  assert.ok(!fallMatches('Vancouver').includes('Maan Farms'));
});

test('Fall activity searches use relevant tags and descriptions, including wording variations', () => {
  const salmonSpots = new Set(['Tynehead Hatchery', 'Hoy Creek Hatchery', 'Kanaka Creek Fish Fence', 'Hyde Creek Hatchery']);
  assert.deepEqual(new Set(fallMatches('Salmon')), salmonSpots);
  assert.deepEqual(new Set(fallMatches('Fish')), salmonSpots);
  assert.deepEqual(fallMatches('Where can I see fish in Surrey?'), ['Tynehead Hatchery']);
  assert.deepEqual(fallMatches('haunted houses'), [
    'Cougar Creek House of Horrors', 'Maan Farms', 'Fright Nights at Playland',
  ]);
  assert.ok(fallMatches('haunted').includes('Burnaby Haunted Village'));
  assert.ok(fallMatches('Scary places').includes('Bear Creek Halloween Train'));
  assert.ok(!fallMatches('Scary places').includes('Burnaby Haunted Village'));
  assert.ok(fallMatches('Pumpkins').includes('VanDusen Harvest Days'));
  assert.ok(fallMatches('pumpkin patches').includes('Eagle Acres Dairy'));
  assert.ok(!fallMatches('Pumpkins').includes('The Bog Cranberry Farm'));
  assert.deepEqual(fallMatches('apple picking'), ['Taves Family Farms', 'Willow View Farms']);
  assert.deepEqual(fallMatches('bird watching'), ['Reifel Bird Sanctuary', 'Wings Over Iona', 'Boundary Bay Fall Bird Migration']);
  assert.deepEqual(fallMatches('fall colors'), fallMatches('autumn foliage'));
  assert.ok(fallMatches('corn maz').includes('Taves Family Farms'));
  assert.deepEqual(fallMatches('biodegradable'), ['VanDusen Harvest Days']);
  assert.deepEqual(fallMatches('R2D2'), ['Eagle Acres Dairy']);
});

test('Fall relevance puts exact names first and combines search with explicit sorts and filters', () => {
  assert.deepEqual(fallMatches('  STANLEY PARK  '), ['Stanley Park', 'Haunted Halloween Trolley']);
  assert.deepEqual(fallMatches('Stanley Park', { sort: 'alphabetical' }), ['Haunted Halloween Trolley', 'Stanley Park']);
  const start = detailedFallSpots.find(spot => spot.name === 'Haunted Halloween Trolley');
  assert.deepEqual(fallMatches('Stanley Park', { sort: 'nearest', origin: start }), [
    'Haunted Halloween Trolley', 'Stanley Park',
  ]);
  assert.deepEqual(fallMatches('fish', { categories: ['Festivals & Gardens'] }), []);
  const fishFence = detailedFallSpots.find(spot => spot.name === 'Kanaka Creek Fish Fence');
  assert.deepEqual(fallMatches('fish', { origin: fishFence, radiusKm: 1 }), ['Kanaka Creek Fish Fence']);
});

const press = node => act(async () => { node.props.onPress(); });
const change = (node, value) => act(async () => node.props.onChangeText(value));
const buttons = renderer => renderer.root.findAllByType('TouchableOpacity');
const labelled = (renderer, label) => buttons(renderer).find(node => node.props.accessibilityLabel === label);
const button = (renderer, label) => buttons(renderer).find(node => node.findAllByType('Text')
  .some(text => text.children.join('') === label));
const input = (renderer, label = 'Search spots') => renderer.root.findAllByType('TextInput')
  .find(node => node.props.accessibilityLabel === label);
const output = renderer => JSON.stringify(renderer.toJSON());
const cards = renderer => buttons(renderer).flatMap(node => {
  const match = /^View details for (.+)$/.exec(node.props.accessibilityLabel || '');
  return match && node.props.accessibilityActions ? [match[1]] : [];
});
const slider = renderer => renderer.root.findByProps({ testID: 'radius-slider' });
const radius = renderer => slider(renderer).props.accessibilityValue.now;
const limitSwitch = renderer => renderer.root.findAllByType('Switch').find(node => node.props.accessibilityLabel === 'Limit by distance');
const limit = (renderer, on) => act(async () => limitSwitch(renderer).props.onValueChange(on));
// Moves the slider the way VoiceOver does, one stop per swipe, until it reads `km`.
async function adjust(renderer, km) {
  for (let swipe = 0; swipe < RADIUS_STOPS.length && radius(renderer) !== km; swipe++) {
    const actionName = radius(renderer) < km ? 'increment' : 'decrement';
    await act(async () => slider(renderer).props.onAccessibilityAction({ nativeEvent: { actionName } }));
  }
  assert.equal(radius(renderer), km);
}
const openSheet = renderer => press(labelled(renderer, 'Filter spots, filters active') || labelled(renderer, 'Filter spots'));
const apply = renderer => press(button(renderer, 'Apply Filters'));
const close = renderer => press(labelled(renderer, 'Close filters'));

for (const [season, search, expected] of [
  ['Fall', 'maple ridge laity', 'Laity Pumpkin Patch'],
  ['Winter', 'ice lane', 'Glacier Rink'],
  ['Spring', 'bike meadow', 'Meadow Path'],
  ['Summer', 'ocean drive', 'Sunset Beach'],
]) {
  test(`${season} searches its own spots and shows a recoverable empty state`, async () => {
    const h = createHarness();
    const renderer = await h.render(`screens/${season}DatesScreen.js`);
    await change(input(renderer), search);
    assert.deepEqual(cards(renderer), [expected]);
    await change(input(renderer), 'no possible matches');
    assert.match(output(renderer), /No spots found/);
    await press(labelled(renderer, 'Clear search'));
    assert.ok(cards(renderer).length > 1);
    await act(async () => renderer.unmount());
  });
}

test('Fall live search finds a hidden tag without rendering the tag on the card', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/FallDatesScreen.js');
  await change(input(renderer), 'hay jumping');
  assert.deepEqual(cards(renderer), ['Aldor Family Farm']);
  assert.ok(!output(renderer).includes('hay jumping pile'));
  await act(async () => renderer.unmount());
});

test('draft filters discard on dismiss and applied state survives a season remount', async () => {
  const h = createHarness({ reduceMotion: true });
  const Fall = h.load('screens/FallDatesScreen.js').default;
  const Winter = h.load('screens/WinterDatesScreen.js').default;
  let selectSeason;
  function Browse() {
    const [Season, select] = React.useState(() => Winter);
    selectSeason = select;
    return React.createElement(Season, { navigation: h.navigation });
  }
  const renderer = await h.renderElement(React.createElement(Browse));
  const initialAnimations = h.timings.length;
  await openSheet(renderer);
  assert.equal(h.timings.length, initialAnimations, 'reduced motion skips the sheet animation');
  assert.match(output(renderer), /Distance filters are unavailable for this season/);
  await press(button(renderer, 'Christmas Tree Farms'));
  assert.equal(cards(renderer).length, 4, 'editing the draft leaves the applied list alone');
  await press(renderer.root.findByProps({ testID: 'spot-filter-backdrop' }));
  assert.equal(cards(renderer).length, 4);
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)));
  assert.deepEqual(h.calls.filter(([action]) => action === 'focusAccessibility'), [
    ['focusAccessibility', 'Filter spots'], ['focusAccessibility', 'Filter spots'],
  ]);

  await openSheet(renderer);
  await press(button(renderer, 'Christmas Tree Farms'));
  await press(button(renderer, 'A–Z'));
  await apply(renderer);
  await change(input(renderer), 'road');
  assert.deepEqual(cards(renderer), ['Evergreen Acres']);
  await act(async () => selectSeason(() => Fall));
  assert.equal(input(renderer).props.value, '');
  assert.equal(cards(renderer).length, fallSpotNames.length);
  await act(async () => selectSeason(() => Winter));
  assert.equal(input(renderer).props.value, 'road');
  assert.deepEqual(cards(renderer), ['Evergreen Acres']);

  await openSheet(renderer);
  assert.ok(button(renderer, 'Christmas Tree Farms').props.accessibilityState.selected);
  await press(button(renderer, 'Reset Filters'));
  assert.ok(button(renderer, 'All categories').props.accessibilityState.selected);
  await close(renderer);
  assert.ok(labelled(renderer, 'Filter spots, filters active'));
  await press(button(renderer, 'Clear filters'));
  assert.equal(input(renderer).props.value, 'road');
  assert.ok(labelled(renderer, 'Filter spots'));
  await act(async () => renderer.unmount());
});

test('the sheet dismisses by a downward swipe and the modal back action', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SummerDatesScreen.js');
  await openSheet(renderer);
  const handle = renderer.root.findByProps({ testID: 'spot-filter-handle' });
  assert.ok(handle.props.onStartShouldSetPanResponder());
  await act(async () => handle.props.onPanResponderRelease({}, { dx: 0, dy: 85, vy: 0.2 }));
  assert.equal(renderer.root.findAllByType('Modal').length, 0);
  await openSheet(renderer);
  await act(async () => renderer.root.findByType('Modal').props.onRequestClose());
  assert.equal(renderer.root.findAllByType('Modal').length, 0);
  await act(async () => renderer.unmount());
});

test('current location requires an explicit opt-in and uses a single fix with search', async () => {
  let permissionRequests = 0;
  let fixes = 0;
  const h = createHarness({
    locationPermissions: async () => { permissionRequests++; return { status: 'granted' }; },
    getPosition: async () => { fixes++; return { coords: { latitude: 49.15313, longitude: -122.53021 } }; },
    getLocationPermissions: async () => ({ granted: false }),
  });
  const renderer = await h.render('screens/FallDatesScreen.js');
  await openSheet(renderer);
  await press(button(renderer, 'Nearest'));
  await limit(renderer, true);
  assert.equal(permissionRequests, 0, 'turning on a distance limit with location off still waits to be asked');
  await adjust(renderer, 5);
  assert.ok(button(renderer, 'Apply Filters').props.disabled);
  assert.match(output(renderer), /Choose a location to filter by distance/);
  await press(button(renderer, 'Current location'));
  assert.equal(permissionRequests, 0);
  await press(button(renderer, 'Enable and use current location'));
  assert.equal(permissionRequests, 1);
  assert.equal(fixes, 1);
  assert.match(output(renderer), /Measuring from .*Current location/);
  await apply(renderer);
  assert.equal(cards(renderer)[0], 'Aldor Family Farm');
  assert.match(output(renderer), /Within 5 km of Current location/);
  await change(input(renderer), 'Eagle');
  assert.deepEqual(cards(renderer), ['Eagle Acres Dairy']);
  await act(async () => h.appState('active'));
  assert.ok(labelled(renderer, 'Filter spots'));
  await act(async () => renderer.unmount());
});

test('denied permission offers settings and disabled services skip the permission prompt', async () => {
  let enabled = true;
  let requests = 0;
  const h = createHarness({
    locationServices: async () => enabled,
    locationPermissions: async () => { requests++; return { status: 'denied', canAskAgain: false }; },
  });
  const renderer = await h.render('screens/FallDatesScreen.js', { location: true });
  await openSheet(renderer);
  await press(button(renderer, 'Current location'));
  assert.match(output(renderer), /Location permission was denied/);
  await press(button(renderer, 'Open device settings'));
  assert.ok(h.calls.some(([action]) => action === 'openSettings'));
  enabled = false;
  await press(button(renderer, 'Use current location'));
  assert.match(output(renderer), /Turn on location services/);
  assert.equal(requests, 1);
  assert.equal(cards(renderer).length, fallSpotNames.length);
  await act(async () => renderer.unmount());
});

test('a stalled device fix returns a retryable timeout', async t => {
  let positionRequested;
  const started = new Promise(resolve => { positionRequested = resolve; });
  const h = createHarness({
    locationPermissions: async () => ({ status: 'granted' }),
    getPosition: () => {
      positionRequested();
      return new Promise(() => {});
    },
  });
  const { getCurrentOrigin } = h.load('services/spotLocation.js');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const result = assert.rejects(getCurrentOrigin(new AbortController().signal), /took too long/);
  await started;
  t.mock.timers.tick(12000);
  await result;
});

const geoapifyResponse = (...results) => ({ ok: true, json: async () => ({ results }) });
const vancouver = { formatted: 'Vancouver, BC, Canada', lat: 49.2827, lon: -123.1207 };
const northVancouver = { formatted: 'North Vancouver, BC, Canada', lat: 49.32, lon: -123.07 };

test('custom lookup handles ambiguity, invalid queries, network failures and stale results', async () => {
  const priorKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
  process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY = 'test-key';
  let lookup;
  let requestSignal;
  let requestUrl;
  let permissionRequests = 0;
  const h = createHarness({
    locationPermissions: async () => { permissionRequests++; return { status: 'denied' }; },
    fetch: (url, { signal }) => {
      requestSignal = signal;
      requestUrl = url;
      return new Promise(resolve => { lookup = resolve; });
    },
  });
  try {
    const renderer = await h.render('screens/FallDatesScreen.js');
    await openSheet(renderer);
    await limit(renderer, true);
    await adjust(renderer, 10);
    await press(button(renderer, 'Custom location'));
    await change(input(renderer, 'Custom location search'), 'Vancouver');
    assert.equal(lookup, undefined, 'typing a custom address does not make a request');
    await press(button(renderer, 'Find location'));
    assert.match(requestUrl, /text=Vancouver.*bias=proximity:-123\.1207,49\.2827/);
    await change(input(renderer, 'Custom location search'), 'invalid');
    assert.equal(requestSignal.aborted, true);
    await act(async () => lookup(geoapifyResponse(vancouver)));
    assert.equal(button(renderer, vancouver.formatted), undefined);

    await press(button(renderer, 'Find location'));
    await act(async () => lookup(geoapifyResponse()));
    assert.match(output(renderer), /No locations found/);
    await press(button(renderer, 'Find location'));
    await act(async () => lookup({ ok: false, status: 503 }));
    assert.match(output(renderer), /Custom location lookup failed/);
    assert.equal(cards(renderer).length, fallSpotNames.length);

    await change(input(renderer, 'Custom location search'), 'Vancouver');
    await press(button(renderer, 'Find location'));
    await act(async () => lookup(geoapifyResponse(vancouver, northVancouver, vancouver, { lat: null, lon: 0 })));
    assert.ok(button(renderer, vancouver.formatted));
    assert.ok(button(renderer, northVancouver.formatted));
    assert.ok(button(renderer, 'Apply Filters').props.disabled, 'a candidate must be chosen explicitly');
    await press(button(renderer, vancouver.formatted));
    await apply(renderer);
    assert.match(output(renderer), /Within 10 km of Vancouver, BC, Canada/);
    assert.ok(cards(renderer).length > 0 && cards(renderer).length < fallSpotNames.length);
    assert.equal(permissionRequests, 0);

    await openSheet(renderer);
    await change(input(renderer, 'Custom location search'), 'another place');
    await press(button(renderer, 'Find location'));
    await close(renderer);
    assert.ok(requestSignal.aborted);
    await act(async () => lookup(geoapifyResponse(northVancouver)));
    assert.match(output(renderer), /Within 10 km of Vancouver, BC, Canada/);
    await act(async () => renderer.unmount());
  } finally {
    if (priorKey === undefined) delete process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
    else process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY = priorKey;
  }
});

test('the radius track runs 1 to 200 km with finer steps near the start', () => {
  assert.equal(RADIUS_STOPS[0], RADIUS_MIN);
  assert.equal(RADIUS_STOPS.at(-1), RADIUS_MAX);
  assert.equal(radiusAt(0), 1);
  assert.equal(radiusAt(1), 200);
  assert.equal(radiusAt(-3), 1, 'held at the ends');
  assert.equal(radiusAt(7), 200);
  assert.equal(radiusAt(radiusPosition(25)), 25);
  for (const km of [5, 10, 25, 50, 100]) assert.ok(RADIUS_STOPS.includes(km), `${km} km, a distance chosen before the slider, is still a stop`);
  assert.deepEqual([stepRadius(1, -1), stepRadius(1, 1), stepRadius(10, 1), stepRadius(50, 1), stepRadius(200, 1)], [1, 2, 15, 60, 200]);
  assert.deepEqual([widerRadius(25), widerRadius(150), widerRadius(200)], [50, 200, null]);

  // 25 km means up to and including 25 km from where you are.
  const near = { name: 'Near', latitude: 0, longitude: 24.9 / 111.195 };
  const far = { name: 'Far', latitude: 0, longitude: 25.1 / 111.195 };
  const line = createSpotIndex([{ title: 'Line', spots: [near, far] }]);
  assert.deepEqual(names(findMatchingSpots(line, '', { ...DEFAULT_FILTERS, origin, radiusKm: 25 })), ['Near']);
});

test('the distance slider reaches both ends, steps finely, applies and reopens at the applied distance', async () => {
  const h = createHarness({
    locationPermissions: async () => ({ status: 'granted' }),
    getPosition: async () => ({ coords: { latitude: 49.15313, longitude: -122.53021 } }),
  });
  const renderer = await h.render('screens/FallDatesScreen.js', { location: true });
  await openSheet(renderer);
  assert.equal(renderer.root.findAllByProps({ testID: 'radius-slider' }).length, 0, 'no slider until a limit is asked for');
  await limit(renderer, true);
  assert.equal(radius(renderer), 25, 'starts at 25 km');
  assert.match(output(renderer), /Measuring from .*Current location/, 'turning it on uses where you are when location is on');
  assert.deepEqual(slider(renderer).props.accessibilityValue, { min: 1, max: 200, now: 25, text: '25 kilometres' });
  assert.equal(slider(renderer).props.accessibilityRole, 'adjustable');

  await adjust(renderer, 1);
  assert.ok(labelled(renderer, 'Decrease distance').props.disabled, 'nothing below 1 km');
  await press(labelled(renderer, 'Increase distance'));
  assert.equal(radius(renderer), 2, 'the + button moves one stop');
  await adjust(renderer, 200);
  assert.ok(labelled(renderer, 'Increase distance').props.disabled, 'nothing past 200 km');

  // Dragging: the track is 300 wide, so its middle is the middle stop.
  const track = slider(renderer);
  await act(async () => track.props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
  await act(async () => slider(renderer).props.onPanResponderGrant({ nativeEvent: { pageX: 120, locationX: 100 } }));
  await act(async () => slider(renderer).props.onPanResponderMove({}, { moveX: 20 + 150 }));
  assert.equal(radius(renderer), radiusAt(0.5));
  await adjust(renderer, 15);
  await apply(renderer);
  assert.match(output(renderer), /Within 15 km of Current location/);
  const within = cards(renderer).length;
  assert.ok(within > 0 && within < fallSpotNames.length);

  await openSheet(renderer);
  assert.equal(limitSwitch(renderer).props.value, true);
  assert.equal(radius(renderer), 15, 'reopening shows the applied distance');
  await limit(renderer, false);
  await limit(renderer, true);
  assert.equal(radius(renderer), 15, 'on again brings back the last distance');
  await limit(renderer, false);
  await apply(renderer);
  assert.equal(cards(renderer).length, fallSpotNames.length, 'off is any distance');
  await act(async () => renderer.unmount());
});

test('no spots within the radius says so and offers a wider distance', async () => {
  const h = createHarness({
    locationPermissions: async () => ({ status: 'granted' }),
    // Far out at sea: nothing in the Fall catalogue is close.
    getPosition: async () => ({ coords: { latitude: 49.5, longitude: -126.5 } }),
  });
  const renderer = await h.render('screens/FallDatesScreen.js', { location: true });
  await openSheet(renderer);
  await limit(renderer, true);
  await adjust(renderer, 50);
  await apply(renderer);
  assert.deepEqual(cards(renderer), []);
  assert.match(output(renderer), /No spots within 50 km of Current location/);
  await press(button(renderer, 'Widen to 100 km'));
  assert.match(output(renderer), /Within 100 km of Current location/);
  await act(async () => renderer.unmount());
});

test('while the location loads the slider waits, and Apply stays off until there is a place', async () => {
  let answer;
  const h = createHarness({
    locationPermissions: async () => ({ status: 'granted' }),
    getPosition: () => new Promise(resolve => { answer = resolve; }),
  });
  const renderer = await h.render('screens/FallDatesScreen.js', { location: true });
  await openSheet(renderer);
  await limit(renderer, true);
  assert.match(output(renderer), /Getting current location…/);
  assert.equal(slider(renderer).props.accessibilityState.disabled, true);
  assert.ok(labelled(renderer, 'Increase distance').props.disabled);
  assert.ok(button(renderer, 'Apply Filters').props.disabled);
  await act(async () => answer({ coords: { latitude: 49.15313, longitude: -122.53021 } }));
  assert.equal(slider(renderer).props.accessibilityState.disabled, false);
  assert.equal(button(renderer, 'Apply Filters').props.disabled, false);
  await act(async () => renderer.unmount());
});

test('a current-location filter takes each new fix; other filters and unchanged fixes are left alone', () => {
  const here = { ...DEFAULT_FILTERS, radiusKm: 10, origin: { source: 'current', label: 'Current location', latitude: 1, longitude: 2, accuracyM: 30 } };
  const moved = withCurrentPosition(here, { latitude: 3, longitude: 4, accuracy: 65 });
  assert.deepEqual(moved.origin, { source: 'current', label: 'Current location', latitude: 3, longitude: 4, accuracyM: 65 });
  assert.equal(moved.radiusKm, 10);
  assert.equal(withCurrentPosition(moved, { latitude: 3, longitude: 4, accuracy: 65 }), moved, 'the same fix changes nothing');
  const custom = { ...here, origin: { source: 'custom', label: 'Vancouver', latitude: 49.28, longitude: -123.12 } };
  assert.equal(withCurrentPosition(custom, { latitude: 3, longitude: 4 }), custom, 'a typed place stays put');
  assert.equal(withCurrentPosition(here, { latitude: null, longitude: 4 }), here, 'a broken fix is ignored');
  assert.equal(isApproximate(moved.origin), false);
  assert.equal(isApproximate({ ...moved.origin, accuracyM: 3200 }), true);
  assert.equal(isApproximate({ ...custom.origin, accuracyM: 3200 }), false);
});

test('"Current location" follows the person: moving updates the results, and an approximate fix says so', async () => {
  const surrey = { latitude: 49.104599, longitude: -122.823509, accuracy: 35 };
  const downtown = { latitude: 49.2827, longitude: -123.1207, accuracy: 35 };
  let fix = surrey;
  let report;
  const watches = [];
  const location = {
    hasServicesEnabledAsync: async () => true,
    requestForegroundPermissionsAsync: async () => ({ status: 'granted', granted: true }),
    getForegroundPermissionsAsync: async () => ({ status: 'granted', granted: true }),
    getCurrentPositionAsync: async () => ({ coords: fix }),
    watchPositionAsync: async (options, callback) => {
      watches.push(options);
      report = coords => callback({ coords });
      return { remove() { watches.push('removed'); } };
    },
    Accuracy: { Balanced: 3, High: 4 },
  };
  const h = createHarness({ stubs: { 'expo-location': location } });
  const renderer = await h.render('screens/CitySpotsScreen.js', { location: true });
  await openSheet(renderer);
  await limit(renderer, true);
  await adjust(renderer, 10);
  await apply(renderer);
  const near = ['Stewart Farm Harvest Fair', 'Cougar Creek House of Horrors', 'Bear Creek Halloween Train', 'Tynehead Hatchery', 'Darts Hill Garden Park'];
  assert.deepEqual(new Set(cards(renderer)), new Set(near), 'the five spots within 10 km of Surrey');
  assert.equal(watches.length, 1, 'following starts once the filter is applied');
  assert.deepEqual(watches[0], { accuracy: 3, distanceInterval: 100, timeInterval: 10000 });

  await act(async () => report(downtown));
  assert.equal(cards(renderer).length, 18, 'after moving downtown, the 18 spots within 10 km of there');
  assert.ok(cards(renderer).includes('Stanley Park'));
  assert.ok(!cards(renderer).includes('Stewart Farm Harvest Fair'));

  // Coming back to the app takes a fresh fix straight away.
  fix = surrey;
  await act(async () => { h.appState('active'); await new Promise(resolve => setTimeout(resolve, 0)); });
  assert.deepEqual(new Set(cards(renderer)), new Set(near));

  // The sheet shows the moved position too, so Apply doesn't put the old one back.
  await openSheet(renderer);
  await act(async () => report(downtown));
  await apply(renderer);
  assert.equal(cards(renderer).length, 18);

  // Precise Location off: a fix only good to a few kilometres is called approximate.
  await act(async () => report({ ...downtown, accuracy: 3000 }));
  assert.match(output(renderer), /Within 10 km of Current location \(approximate\)/);
  await openSheet(renderer);
  const words = require('./support.cjs').textOf(renderer.root).join(' ');
  assert.match(words, /only sharing an approximate location \(within about 3 km\)/);
  assert.ok(button(renderer, 'Open device settings'), 'with the way to turn Precise Location on');
  await close(renderer);

  await press(button(renderer, 'Clear filters'));
  assert.equal(watches.at(-1), 'removed', 'following stops when nothing is measured from here');
  await act(async () => renderer.unmount());
});

test('following the position starts the watch again when iOS quietly ends it', async t => {
  const started = [];
  let removed = 0;
  const location = {
    watchPositionAsync: async (options, callback) => { started.push(callback); return { remove() { removed += 1; } }; },
    Accuracy: { Balanced: 3 },
  };
  const h = createHarness({ stubs: { 'expo-location': location } });
  const { followPosition } = h.load('services/followPosition.js');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fixes = [];
  const following = followPosition({ accuracy: 3 }, position => fixes.push(position.coords.latitude), { quietMs: 30000 });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(started.length, 1);
  started[0]({ coords: { latitude: 1 } });
  t.mock.timers.tick(20000);
  started[0]({ coords: { latitude: 2 } });
  t.mock.timers.tick(20000);
  assert.equal(started.length, 1, 'a watch that keeps reporting is left alone');

  // Core Location's "location unknown" ends the watch with no word to the app: it goes quiet.
  t.mock.timers.tick(10001);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(started.length, 2, 'started again once quiet for 30 s');
  assert.equal(removed, 1, 'the dead watch is let go');
  started[1]({ coords: { latitude: 3 } });
  assert.deepEqual(fixes, [1, 2, 3]);

  following.remove();
  t.mock.timers.tick(60000);
  await Promise.resolve();
  assert.equal(started.length, 2, 'nothing restarts after it is stopped');
  started[0]({ coords: { latitude: 9 } });
  assert.deepEqual(fixes, [1, 2, 3]);
});
