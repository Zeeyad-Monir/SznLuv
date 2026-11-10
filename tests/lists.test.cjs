const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  CITIES, catalogueSpots, catalogueSections, findCatalogueSpot, seasonOf, locality, catalogueRef, spotKey,
  resolveSpot, describeWhere,
} = require('../services/catalogue');
const lists = require('../services/listsState');
const search = require('../services/listSearch');
const top4 = require('../services/top4State');
const { parseLink, linkPath, shareMessage } = require('../services/links');
const { setPendingLink, takePendingLink, onPendingLink } = require('../services/pendingLink');
const { createSpotIndex, findMatchingSpots, DEFAULT_FILTERS } = require('../services/spotDiscovery');
const { fallSpotNames } = require('../services/spots');
const { createHarness, act } = require('./renderHarness.cjs');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const steps = { k: 'x', id: 'steps1', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
const cafe = { k: 'x', id: 'cafe1', name: 'Corner cafe', address: '12 Main St, Vancouver' };
const base = (extra = {}) => lists.createList({ ownerUid: 'maya', title: 'Golden Hour', now: 100, ...extra });

// ---------------------------------------------------------------- Catalogue

test('catalogue: one entry per spot across all four seasons, each knowing its season and town', () => {
  assert.equal(new Set(catalogueSpots.map(spot => spot.name)).size, catalogueSpots.length);
  assert.ok(fallSpotNames.every(name => seasonOf(name) === 'Fall'));
  assert.equal(seasonOf('Glacier Rink'), 'Winter');
  assert.equal(seasonOf('Blossom Garden'), 'Spring');
  assert.equal(seasonOf('Sunset Beach'), 'Summer');
  assert.equal(findCatalogueSpot('Aldor Family Farm').locality, 'Langley');
  assert.equal(locality('Main Mall, UBC, Vancouver'), 'Vancouver');
  assert.equal(locality('123 Ice Lane'), '');
  assert.equal(findCatalogueSpot('Nowhere'), undefined);
  assert.deepEqual(CITIES.map(city => city.id), ['vancouver']);
});

test('catalogue: the season sections feed the existing ranked search', () => {
  const index = createSpotIndex(catalogueSections, { rankSearch: true });
  const names = query => findMatchingSpots(index, query, DEFAULT_FILTERS).sections.flatMap(section => section.spots.map(spot => spot.name));
  assert.equal(names('aldor')[0], 'Aldor Family Farm');
  assert.ok(names('glacier').includes('Glacier Rink'));
  assert.deepEqual(names('zzzz'), []);
});

test('spot references resolve for cards, including own spots and spots no longer in the app', () => {
  assert.deepEqual(resolveSpot(farm), {
    key: 'c:Aldor Family Farm', name: 'Aldor Family Farm', meta: 'Langley · Fall', season: 'Fall', locality: 'Langley',
    latitude: 49.15313, longitude: -122.53021, missing: false, own: false,
  });
  assert.equal(resolveSpot(catalogueRef('Glacier Rink')).meta, 'Winter');
  const gone = resolveSpot(catalogueRef('Closed Farm'));
  assert.equal(gone.missing, true);
  assert.equal(gone.meta, 'No longer listed');

  const pin = resolveSpot(steps);
  assert.deepEqual([pin.key, pin.meta, pin.own, pin.latitude, pin.longitude], ['x:steps1', 'Dropped pin', true, 49.28651, -123.112]);
  const address = resolveSpot(cafe);
  assert.deepEqual([address.meta, address.latitude], ['Vancouver', undefined]);
  assert.equal(describeWhere(steps), 'Dropped pin (49.2865, -123.1120)');
  assert.equal(describeWhere(cafe), '12 Main St, Vancouver');
  assert.equal(spotKey(steps), 'x:steps1');
});

// ---------------------------------------------------------------- Lists

test('a new list is private, trimmed, and rejects a missing or oversized title', () => {
  const list = base({ title: '  Golden Hour  ', description: ' Last light. ' });
  assert.deepEqual(
    [list.title, list.description, list.public, list.publishedAt, list.cityId, list.items.length, list.createdAt],
    ['Golden Hour', 'Last light.', false, null, 'vancouver', 0, 100],
  );
  assert.deepEqual(list.cover, lists.DEFAULT_COVER);
  assert.throws(() => base({ title: '   ' }), { code: 'list/no-title' });
  assert.throws(() => base({ title: 'x'.repeat(41) }), { code: 'list/title-too-long' });
  assert.throws(() => base({ description: 'x'.repeat(121) }), { code: 'list/description-too-long' });
  assert.throws(() => lists.createList({ title: 'A', now: 1 }), { code: 'list/signed-out' });
  assert.deepEqual(base({ cover: { type: 'colour', value: 'red' } }).cover, lists.DEFAULT_COVER);
  assert.deepEqual(base({ cover: { type: 'season', value: 'fall' } }).cover, { type: 'season', value: 'fall' });
});

test('covers give the list page its background: the colour itself, or the season\'s colour', () => {
  assert.equal(lists.coverBackground({ type: 'colour', value: '#FFC1E3' }), '#FFC1E3');
  assert.equal(lists.coverBackground({ type: 'season', value: 'winter' }), '#BBCDEC');
  assert.equal(lists.coverBackground(undefined), lists.DEFAULT_COVER.value);
  assert.equal(lists.COLOURS.length, 7);
  assert.deepEqual(lists.SEASON_COVERS.map(cover => cover.value), ['fall', 'winter', 'spring', 'summer']);
});

test('spots are added once, in order, up to fifty, and never mutate the list they came from', () => {
  const empty = base();
  const one = lists.addSpot(empty, farm);
  const two = lists.addSpot(one, steps, 'Sit on the left.');
  assert.equal(empty.items.length, 0);
  assert.equal(lists.addSpot(two, farm), two);
  assert.deepEqual(two.items.map(item => spotKey(item.spot)), ['c:Aldor Family Farm', 'x:steps1']);
  assert.ok(lists.hasSpot(two, steps) && !lists.hasSpot(two, maan));

  let full = empty;
  for (let i = 0; i < 50; i += 1) full = lists.addSpot(full, catalogueRef('Spot ' + i));
  assert.throws(() => lists.addSpot(full, farm), { code: 'list/full' });
  assert.equal(lists.addSpot(full, catalogueRef('Spot 3')), full);
});

test('reordering stops at the ends, removal can be undone into the same position', () => {
  const list = [farm, maan, steps].reduce((current, ref) => lists.addSpot(current, ref), base());
  const order = current => current.items.map(item => item.spot.name);
  assert.deepEqual(order(lists.moveSpot(list, 'c:Maan Farms', -1)), ['Maan Farms', 'Aldor Family Farm', 'Waterfront steps']);
  assert.deepEqual(order(lists.moveSpot(list, 'c:Maan Farms', 1)), ['Aldor Family Farm', 'Waterfront steps', 'Maan Farms']);
  assert.equal(lists.moveSpot(list, 'c:Aldor Family Farm', -1), list);
  assert.equal(lists.moveSpot(list, 'x:steps1', 1), list);
  assert.equal(lists.moveSpot(list, 'c:Nope', 1), list);

  const removed = lists.removeSpot(list, 'c:Maan Farms');
  assert.deepEqual(order(removed), ['Aldor Family Farm', 'Waterfront steps']);
  assert.deepEqual(order(lists.insertSpot(removed, list.items[1], 1)), order(list));
  assert.equal(lists.insertSpot(list, list.items[1], 0), list);
});

test('notes are trimmed and capped, and saving someone else\'s spot never copies their note', () => {
  const list = lists.addSpot(base(), farm);
  const noted = lists.setNote(list, 'c:Aldor Family Farm', '  Go around 7.  ');
  assert.equal(noted.items[0].note, 'Go around 7.');
  assert.throws(() => lists.setNote(list, 'c:Aldor Family Farm', 'x'.repeat(141)), { code: 'list/note-too-long' });
  assert.deepEqual(lists.copySpot({ spot: steps, note: 'Their private tip' }), { spot: steps, note: '' });
  assert.notEqual(lists.copySpot({ spot: steps, note: '' }).spot, steps);
});

test('editing details keeps the spots and applies the same title rules', () => {
  const list = lists.addSpot(base(), farm);
  const edited = lists.editDetails(list, { title: 'Slow Sundays', cover: { type: 'season', value: 'spring' } });
  assert.deepEqual([edited.title, edited.cover.value, edited.items.length, edited.ownerUid], ['Slow Sundays', 'spring', 1, 'maya']);
  assert.throws(() => lists.editDetails(list, { title: '' }), { code: 'list/no-title' });
});

// ---------------------------------------------------------------- Publishing

test('the public snapshot carries only what visitors see, plus search terms', () => {
  const draft = lists.setNote(lists.addSpot(lists.addSpot(base({ description: 'Last light.' }), farm), steps), 'x:steps1', 'Left side.');
  const snapshot = lists.toPublicSnapshot(draft, { ownerUsername: 'maya', now: 500 });
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'cityId', 'cover', 'description', 'items', 'ownerUid', 'ownerUsername', 'publishedAt', 'searchTerms', 'spotCount', 'title', 'updatedAt',
  ]);
  assert.deepEqual([snapshot.spotCount, snapshot.publishedAt, snapshot.updatedAt, snapshot.ownerUsername], [2, 500, 500, 'maya']);
  assert.ok(snapshot.searchTerms.includes('golden') && snapshot.searchTerms.includes('maya'));
  // An update keeps the original publish time, which is what a follower's pointer is compared with.
  assert.equal(lists.toPublicSnapshot(draft, { ownerUsername: 'maya', now: 900, publishedAt: 500 }).publishedAt, 500);
  assert.throws(() => lists.toPublicSnapshot(base(), { ownerUsername: 'maya', now: 1 }), { code: 'list/empty' });
});

test('unpublished changes are detected from content, whatever order Firestore returns the keys in', () => {
  const draft = lists.addSpot(base(), farm);
  const published = lists.toPublicSnapshot(draft, { ownerUsername: 'maya', now: 500 });
  const reordered = { ...published, cover: { value: published.cover.value, type: published.cover.type }, items: [{ note: '', spot: { name: 'Aldor Family Farm', k: 'c' } }] };
  assert.equal(lists.hasUnpublishedChanges(draft, reordered), false);
  assert.equal(lists.hasUnpublishedChanges({ ...draft, updatedAt: 999, public: true }, published), false);
  assert.equal(lists.hasUnpublishedChanges(lists.addSpot(draft, maan), published), true);
  assert.equal(lists.hasUnpublishedChanges(lists.editDetails(draft, { title: 'New name' }), published), true);
  assert.equal(lists.hasUnpublishedChanges(draft, null), false);
});

test('the publish review lists every note and own-spot location; an update lists only what is new', () => {
  let draft = [farm, steps, cafe].reduce((current, ref) => lists.addSpot(current, ref), base());
  draft = lists.setNote(draft, 'c:Aldor Family Farm', 'Go around 7.');
  assert.deepEqual(lists.exposure(draft), {
    notes: [{ key: 'c:Aldor Family Farm', name: 'Aldor Family Farm', text: 'Go around 7.' }],
    locations: [
      { key: 'x:steps1', name: 'Waterfront steps', text: 'Dropped pin (49.2865, -123.1120)' },
      { key: 'x:cafe1', name: 'Corner cafe', text: '12 Main St, Vancouver' },
    ],
  });
  assert.equal(lists.needsReview(draft, null), true);

  const published = lists.toPublicSnapshot(draft, { ownerUsername: 'maya', now: 500 });
  assert.equal(lists.needsReview(draft, published), false);
  // Adding or reordering catalogue spots reveals nothing personal, so it publishes without a review.
  assert.equal(lists.needsReview(lists.moveSpot(lists.addSpot(draft, maan), 'c:Maan Farms', -1), published), false);
  // A reworded note is new text, so it is shown again.
  const reworded = lists.setNote(draft, 'c:Aldor Family Farm', 'Go around 8.');
  assert.deepEqual(lists.newExposure(reworded, published), { notes: [{ key: 'c:Aldor Family Farm', name: 'Aldor Family Farm', text: 'Go around 8.' }], locations: [] });
  const another = lists.addSpot(draft, { k: 'x', id: 'home', name: 'My place', address: '9 Private Rd, Vancouver' });
  assert.deepEqual(lists.newExposure(another, published).locations.map(entry => entry.name), ['My place']);
});

test('reverting puts the draft back to the public version without touching ownership', () => {
  const draft = lists.addSpot(base(), farm);
  const published = lists.toPublicSnapshot(draft, { ownerUsername: 'maya', now: 500 });
  const edited = { ...lists.editDetails(lists.addSpot(draft, maan), { title: 'Changed' }), public: true, publishedAt: 500 };
  const reverted = lists.revertToPublic(edited, published);
  assert.deepEqual([reverted.title, reverted.items.length, reverted.public, reverted.ownerUid], ['Golden Hour', 1, true, 'maya']);
  assert.equal(lists.hasUnpublishedChanges(reverted, published), false);
  assert.equal(reverted.searchTerms, undefined);
});

// ---------------------------------------------------------------- Collections -> lists

test('migration turns each collection into a private list and removes the old field, keeping every heart', () => {
  const favourites = {
    'Aldor Family Farm': { isFavourite: true, season: 'Fall' },
    collections: [
      { title: 'Weekend', color: '#A7C8FF', dates: ['Aldor Family Farm', 'Maan Farms', 'Aldor Family Farm'] },
      { title: 'A title that was allowed to be much longer than forty characters', color: 'nonsense', dates: [] },
    ],
  };
  const result = lists.migrateCollections(favourites, { uid: 'maya', now: 1000 });
  assert.deepEqual(result.lists.map(list => list.id), ['maya_c0', 'maya_c1']);
  const [weekend, long] = result.lists.map(list => list.data);
  assert.deepEqual([weekend.title, weekend.cover, weekend.public, weekend.ownerUid], ['Weekend', { type: 'colour', value: '#A7C8FF' }, false, 'maya']);
  assert.deepEqual(weekend.items, [{ spot: farm, note: '' }, { spot: maan, note: '' }]);
  assert.equal(long.title.length, 40);
  assert.deepEqual(long.cover, lists.DEFAULT_COVER);
  assert.ok(weekend.createdAt < long.createdAt);
  assert.deepEqual(result.favourites, { 'Aldor Family Farm': { isFavourite: true, season: 'Fall' }, listsMigratedAt: 1000 });
  assert.ok('collections' in favourites, 'the input is not mutated');

  assert.equal(lists.migrateCollections(result.favourites, { uid: 'maya', now: 2000 }), null);
  assert.deepEqual(lists.migrateCollections({}, { uid: 'maya', now: 5 }), { lists: [], favourites: { listsMigratedAt: 5 } });
  assert.deepEqual(lists.migrateCollections(undefined, { uid: 'maya', now: 5 }).lists, []);
});

// ---------------------------------------------------------------- Search

const published = (title, ownerUid, ownerUsername, refs, extra = {}) => {
  const draft = refs.reduce((current, ref) => lists.addSpot(current, ref), lists.createList({ ownerUid, title, now: 1, ...extra }));
  return { id: title, ...lists.toPublicSnapshot(draft, { ownerUsername, now: extra.now ?? 1 }) };
};

test('search terms cover the title, creator, spots and towns, with prefixes for half-typed words', () => {
  const list = published('Golden Hour Leaves', 'maya', 'maya.b', [farm, steps], { description: 'Autumn colours' });
  for (const term of ['golden', 'gol', 'gold', 'golde', 'hour', 'leaf', 'maya.b', 'maya', 'may', 'aldor', 'farm', 'langley', 'waterfront', 'fall', 'foliage']) {
    assert.ok(list.searchTerms.includes(term), `expected "${term}"`);
  }
  assert.ok(!list.searchTerms.includes('go'), 'two-letter prefixes are not stored');
  assert.equal(new Set(list.searchTerms).size, list.searchTerms.length);

  const many = Array.from({ length: 50 }, (_, i) => catalogueRef(`Unique${i} Venue${i} Place${i}`));
  const big = published('Everything', 'maya', 'maya', many);
  assert.equal(big.searchTerms.length, search.MAX_TERMS);
  assert.ok(big.searchTerms.includes('everything') && big.searchTerms.includes('maya'), 'the title and creator survive the cap');
});

test('a query sends its longest word to Firestore and needs at least two characters', () => {
  assert.deepEqual(search.parseQuery('  Golden hours '), { words: ['golden', 'hours'], term: 'golden', prefixTerm: 'golden' });
  assert.deepEqual(search.parseQuery('@Maya'), { words: ['maya'], term: 'maya', prefixTerm: 'maya' });
  assert.equal(search.parseQuery('leaves').term, 'leaf');
  assert.equal(search.parseQuery('g'), null);
  assert.equal(search.parseQuery('   '), null);
  assert.equal(search.parseQuery(undefined), null);
});

test('results must match every word, rank title over creator over spot, and hide own and blocked lists', () => {
  const candidates = [
    published('Farm days', 'alex', 'alex', [maan], { now: 5 }),
    published('Golden Hour', 'sam', 'goldie', [farm], { now: 3 }),
    published('Slow Sundays', 'goldie-uid', 'gold', [farm], { now: 9 }),
    published('Golden picks', 'me', 'me', [farm], { now: 9 }),
    published('Golden spam', 'troll', 'troll', [farm], { now: 9 }),
  ];
  const titles = (text, options = { viewerUid: 'me', blocked: ['troll'] }) => search.rankLists(candidates, text, options).map(list => list.title);
  assert.deepEqual(titles('gold'), ['Golden Hour', 'Slow Sundays']);
  assert.deepEqual(titles('farm'), ['Farm days', 'Slow Sundays', 'Golden Hour']);
  assert.deepEqual(titles('golden farm'), ['Golden Hour']);
  assert.deepEqual(titles('langley'), ['Slow Sundays', 'Golden Hour']);
  assert.deepEqual(titles('golden zebra'), []);
  assert.deepEqual(titles('g'), []);
  assert.deepEqual(titles('golden', {}).length, 3);
  assert.deepEqual(search.visibleLists(candidates, { viewerUid: 'me', blocked: ['troll'] }).length, 3);
});

test('a username search accepts only text that could be the start of a username', () => {
  assert.equal(search.usernamePrefix(' @Maya.B '), 'maya.b');
  assert.equal(search.usernamePrefix('m'), null);
  assert.equal(search.usernamePrefix('golden hour'), null);
  assert.equal(search.usernamePrefix(''), null);
});

// ---------------------------------------------------------------- Top 4

test('Top 4 holds four distinct picks per city and keeps other cities untouched', () => {
  let state = {};
  for (const ref of [farm, maan, steps, cafe, catalogueRef('Glacier Rink'), farm]) state = top4.addPick(state, 'vancouver', ref);
  assert.deepEqual(top4.cityTop4(state, 'vancouver').picks.map(spotKey), ['c:Aldor Family Farm', 'c:Maan Farms', 'x:steps1', 'x:cafe1']);
  assert.deepEqual(top4.cityTop4(state, 'brooklyn'), { picks: [], public: false });
  const moved = top4.movePick(state, 'vancouver', 'x:cafe1', -1);
  assert.deepEqual(top4.cityTop4(moved, 'vancouver').picks.map(spotKey).slice(2), ['x:cafe1', 'x:steps1']);
  assert.equal(top4.movePick(state, 'vancouver', 'c:Aldor Family Farm', -1), state);
  const replaced = top4.replacePick(state, 'vancouver', 'c:Maan Farms', catalogueRef('Glacier Rink'));
  assert.equal(top4.cityTop4(replaced, 'vancouver').picks[1].name, 'Glacier Rink');
  assert.equal(top4.replacePick(state, 'vancouver', 'c:Maan Farms', farm), state);
  assert.equal(top4.MAX_PICKS, 4);
});

test('Top 4 is private until shown, per city, and goes private again when the last pick is removed', () => {
  assert.equal(top4.cityTop4(top4.setPublic({}, 'vancouver', true), 'vancouver').public, false);
  let state = top4.addPick(top4.addPick({}, 'vancouver', farm), 'brooklyn', maan);
  assert.deepEqual(top4.publicTop4(state), {});
  state = top4.setPublic(state, 'vancouver', true);
  assert.deepEqual(top4.publicTop4(state), { vancouver: [farm] });
  state = top4.removePick(state, 'vancouver', 'c:Aldor Family Farm');
  assert.deepEqual(top4.cityTop4(state, 'vancouver'), { picks: [], public: false });
  assert.deepEqual(top4.publicTop4(state), {});
  assert.deepEqual(top4.publicTop4(undefined), {});
  assert.deepEqual(top4.exposedLocations([farm, steps]), [{ key: 'x:steps1', name: 'Waterfront steps', text: 'Dropped pin (49.2865, -123.1120)' }]);
});

// ---------------------------------------------------------------- Links

test('links open a list or a person from the app scheme and from Expo Go, and nothing else', () => {
  assert.deepEqual(parseLink('sznluv://list/abcDEF_123-x'), { type: 'list', listId: 'abcDEF_123-x' });
  assert.deepEqual(parseLink('exp://192.168.1.4:8081/--/list/abc123'), { type: 'list', listId: 'abc123' });
  assert.deepEqual(parseLink('sznluv://u/Maya.B'), { type: 'person', username: 'maya.b' });
  assert.deepEqual(parseLink('sznluv://list/abc123?ref=share#top'), { type: 'list', listId: 'abc123' });
  for (const bad of ['sznluv://list/', 'sznluv://list/a/b', 'sznluv://list/has space', 'sznluv://u/ab', 'sznluv://settings', 'exp://192.168.1.4:8081', '', null, undefined, 42]) {
    assert.equal(parseLink(bad), null, String(bad));
  }
  assert.equal(linkPath({ type: 'list', listId: 'abc' }), 'list/abc');
  assert.equal(linkPath({ type: 'person', username: 'maya' }), 'u/maya');
  assert.deepEqual(parseLink('sznluv://' + linkPath({ type: 'list', listId: 'abc' })), { type: 'list', listId: 'abc' });
  assert.equal(shareMessage({ title: 'Golden Hour', ownerUsername: 'maya' }, 'sznluv://list/abc'), '“Golden Hour”, a SznLuv list by maya\nsznluv://list/abc');
});

test('a link that arrives early waits, is delivered once, and tells the app it is there', () => {
  let notified = 0;
  const stop = onPendingLink(() => { notified += 1; });
  assert.equal(takePendingLink(), null);
  setPendingLink({ type: 'list', listId: 'abc' });
  assert.equal(notified, 1);
  assert.deepEqual(takePendingLink(), { type: 'list', listId: 'abc' });
  assert.equal(takePendingLink(), null);
  stop();
  setPendingLink({ type: 'list', listId: 'def' });
  assert.equal(notified, 1);
  takePendingLink();
});

// ---------------------------------------------------------------- Components

async function renderSnackbar(h, { clearance } = {}) {
  const React = require('react');
  const { SnackbarProvider, useSnackbar } = h.load('components/Snackbar.js');
  const { FloatingNavigationLayoutProvider } = h.load('navigation/floatingNavigationLayout.js');
  const api = {};
  const Probe = () => { Object.assign(api, useSnackbar()); return null; };
  const tree = React.createElement(SnackbarProvider, null, React.createElement(Probe));
  const renderer = await h.renderElement(clearance === false ? tree : React.createElement(FloatingNavigationLayoutProvider, null, tree));
  const bar = () => renderer.root.findAll(node => node.props.testID === 'snackbar')[0];
  const dockBottom = () => bar().parent.props.style[1].bottom;
  return { api, bar, dockBottom };
}

test('snackbar: shows one message at a time above the tab pill and runs its action once', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = createHarness();
  const { api, bar, dockBottom } = await renderSnackbar(h);
  assert.equal(bar(), undefined);

  let undone = 0;
  await act(async () => api.show({ message: 'Removed', actionLabel: 'Undo', onAction: () => { undone += 1; } }));
  assert.deepEqual(bar().findAllByType('Text').map(node => node.props.children), ['Removed', 'Undo']);
  assert.equal(dockBottom(), 34 + 12 + 58 + 12, 'sits above the floating bar and its gap');

  await act(async () => api.show({ message: 'Saved to Fall favourites' }));
  assert.deepEqual(bar().findAllByType('Text').map(node => node.props.children), ['Saved to Fall favourites']);
  assert.equal(undone, 0, 'a replaced message never fires its action');

  await act(async () => api.show({ message: 'Removed', actionLabel: 'Undo', onAction: () => { undone += 1; } }));
  await act(async () => bar().findByType('TouchableOpacity').props.onPress());
  assert.equal(undone, 1);
  assert.equal(bar(), undefined);
});

test('snackbar: leaves by itself, later when it has an action, and rides above the keyboard', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = createHarness();
  const { api, bar, dockBottom } = await renderSnackbar(h);

  await act(async () => api.show({ message: 'Following' }));
  await act(async () => t.mock.timers.tick(3999));
  assert.ok(bar());
  await act(async () => t.mock.timers.tick(1));
  assert.equal(bar(), undefined);

  await act(async () => api.show({ message: 'Removed', actionLabel: 'Undo' }));
  await act(async () => t.mock.timers.tick(5999));
  assert.ok(bar());
  await act(async () => h.keyboardEvent('keyboardWillShow', { endCoordinates: { height: 336 } }));
  assert.equal(dockBottom(), 336 + 12);
  await act(async () => t.mock.timers.tick(1));
  assert.equal(bar(), undefined);
});

test('spot card: opens the spot, saves with the heart, and offers the save to VoiceOver', async () => {
  const React = require('react');
  const h = createHarness();
  const SpotCard = h.load('components/SpotCard.js').default;
  const log = [];
  const renderer = await h.renderElement(React.createElement(SpotCard, {
    spot: resolveSpot(farm), note: 'Go around 7.', saved: false,
    onPress: () => log.push('open'), onToggleSave: () => log.push('save'),
  }));
  const [card, heart] = renderer.root.findAllByType('TouchableOpacity');
  assert.equal(card.props.accessibilityLabel, 'View details for Aldor Family Farm');
  assert.equal(heart.props.accessibilityLabel, 'Save Aldor Family Farm');
  assert.deepEqual(card.props.accessibilityActions, [{ name: 'save', label: 'Save spot' }]);
  await act(async () => { card.props.onPress(); heart.props.onPress(); card.props.onAccessibilityAction({ nativeEvent: { actionName: 'save' } }); });
  assert.deepEqual(log, ['open', 'save', 'save']);
  assert.deepEqual(renderer.root.findAllByType('Text').map(node => node.props.children), ['Aldor Family Farm', 'Langley · Fall', 'Go around 7.']);
});

test('spot card: edit mode swaps the heart for note, move and remove controls', async () => {
  const React = require('react');
  const h = createHarness();
  const SpotCard = h.load('components/SpotCard.js').default;
  const log = [];
  const renderer = await h.renderElement(React.createElement(SpotCard, {
    spot: resolveSpot(steps), note: '', editing: true, canMoveUp: false, canMoveDown: true,
    onToggleSave: () => log.push('save'), onMoveUp: () => log.push('up'), onMoveDown: () => log.push('down'),
    onRemove: () => log.push('remove'), onNotePress: () => log.push('note'),
  }));
  const buttons = renderer.root.findAllByType('TouchableOpacity');
  const labelled = label => buttons.find(node => node.props.accessibilityLabel === label);
  assert.equal(labelled('Save Waterfront steps'), undefined);
  assert.equal(labelled('Move Waterfront steps up').props.disabled, true);
  assert.equal(buttons[0].props.disabled, true, 'the card does not navigate while editing');
  assert.deepEqual(buttons[0].props.accessibilityActions.map(action => action.name), ['moveDown', 'remove']);
  await act(async () => {
    labelled('Add a note for Waterfront steps').props.onPress();
    labelled('Move Waterfront steps down').props.onPress();
    labelled('Remove Waterfront steps').props.onPress();
  });
  assert.deepEqual(log, ['note', 'down', 'remove']);
});

test('spot card: a spot no longer in the app is dimmed and cannot be opened or saved', async () => {
  const React = require('react');
  const h = createHarness();
  const SpotCard = h.load('components/SpotCard.js').default;
  const renderer = await h.renderElement(React.createElement(SpotCard, {
    spot: resolveSpot(catalogueRef('Closed Farm')), onPress() {}, onToggleSave() {},
  }));
  const buttons = renderer.root.findAllByType('TouchableOpacity');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].props.disabled, true);
  assert.equal(buttons[0].props.accessibilityLabel, 'Closed Farm, no longer listed');
});
