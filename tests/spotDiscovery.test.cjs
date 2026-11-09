const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { createHarness, act } = require('./renderHarness.cjs');
const { fallCategories } = require('../services/spots');
const {
  createSpotIndex, DEFAULT_FILTERS, distanceKm, findMatchingSpots, hasCoordinates,
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
  assert.equal(cards(renderer).length, 43);
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
  await press(button(renderer, '5 km'));
  assert.ok(button(renderer, 'Apply Filters').props.disabled);
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
  assert.equal(cards(renderer).length, 43);
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
    await press(button(renderer, '10 km'));
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
    assert.equal(cards(renderer).length, 43);

    await change(input(renderer, 'Custom location search'), 'Vancouver');
    await press(button(renderer, 'Find location'));
    await act(async () => lookup(geoapifyResponse(vancouver, northVancouver, vancouver, { lat: null, lon: 0 })));
    assert.ok(button(renderer, vancouver.formatted));
    assert.ok(button(renderer, northVancouver.formatted));
    assert.ok(button(renderer, 'Apply Filters').props.disabled, 'a candidate must be chosen explicitly');
    await press(button(renderer, vancouver.formatted));
    await apply(renderer);
    assert.match(output(renderer), /Within 10 km of Vancouver, BC, Canada/);
    assert.ok(cards(renderer).length > 0 && cards(renderer).length < 43);
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
