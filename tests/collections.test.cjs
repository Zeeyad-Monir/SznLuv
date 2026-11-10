// Collections the app makes (each city's seasons): their IDs, the hearts on the season cards, and My lists.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, quiet, flush } = require('./support.cjs');
const { COLLECTIONS, collectionById, collectionsForCity, collectionSpots, collectionCaption } = require('../services/collections');
const { catalogueSections } = require('../services/catalogue');
const { fallSpotNames } = require('../services/spots');

const kept = h => [...h.documents.keys()].filter(key => key.startsWith('users/audit/savedCollections/'));

// ---------------------------------------------------------------- The registry (pure)

test('collections: one per season per city, with IDs that include the city', () => {
  assert.deepEqual(collectionsForCity('vancouver').map(collection => collection.id),
    ['vancouver-fall', 'vancouver-winter', 'vancouver-spring', 'vancouver-summer']);
  assert.equal(new Set(COLLECTIONS.map(collection => collection.id)).size, COLLECTIONS.length);
  assert.deepEqual(collectionById('vancouver-fall'), {
    id: 'vancouver-fall', cityId: 'vancouver', kind: 'season', key: 'fall', title: 'Fall', season: 'Fall', screen: 'FallDatesScreen',
  });
  assert.equal(collectionById('toronto-fall'), undefined);
  assert.deepEqual(collectionsForCity('nowhere'), []);
});

test('collections: spots are read live from the catalogue, never copied', () => {
  const fall = catalogueSections.find(section => section.title === 'Fall').spots;
  assert.deepEqual(collectionSpots('vancouver-fall').map(spot => spot.name), fall.map(spot => spot.name));
  assert.equal(collectionSpots('vancouver-fall').length, fallSpotNames.length);
  assert.deepEqual(collectionSpots('gone'), []);
  assert.equal(collectionCaption('vancouver-fall'), `Vancouver · ${fallSpotNames.length} spots`);
  assert.equal(collectionCaption('gone'), '');
});

// ---------------------------------------------------------------- Hearts on the season cards

test('season card heart keeps the whole collection, without opening it or filling its spots\' hearts', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/SeasonsScreen.js');
  await screen.press('Save Fall collection to My lists');
  assert.deepEqual(h.navigations, [], 'the heart never opens the season');
  const saved = h.documents.get('users/audit/savedCollections/vancouver-fall');
  assert.equal(saved.collectionId, 'vancouver-fall');
  assert.equal(saved.cityId, 'vancouver');
  assert.equal(h.documents.get('favourites/audit'), undefined, 'no spot is saved on its own');
  assert.ok(screen.button('Remove Fall collection from My lists'), 'the heart fills');
  assert.ok(h.calls.some(([name]) => name === 'selectionHaptic'));
  assert.deepEqual(screen.snackbar(), ['Fall saved to My lists', 'View']);
  await screen.press('View');
  assert.deepEqual(h.navigations.at(-1), ['FavouritesTab', { screen: 'Favourites', params: { segment: 'lists' } }]);

  // The card itself still opens the season.
  await screen.press('Fall Season - View Active Date Ideas');
  assert.deepEqual(h.navigations.at(-1), ['FallDatesScreen']);

  await screen.press('Remove Fall collection from My lists');
  assert.deepEqual(kept(h), []);
  assert.deepEqual(screen.snackbar(), ['Removed Fall from My lists', 'Undo']);
  await screen.press('Undo');
  assert.deepEqual(kept(h), ['users/audit/savedCollections/vancouver-fall']);
});

test('season card hearts are independent, and rapid taps never make a second entry', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/SeasonsScreen.js');
  const heart = screen.button('Save Winter collection to My lists');
  await act(async () => { heart.props.onPress(); heart.props.onPress(); heart.props.onPress(); });
  await flush();
  assert.deepEqual(kept(h), ['users/audit/savedCollections/vancouver-winter'], 'taps while saving are ignored');
  assert.ok(screen.button('Save Fall collection to My lists'), 'other seasons are untouched');
  assert.ok(screen.button('Remove Winter collection from My lists'));
});

test('a failed collection save puts the heart back and says so', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } }, writeError: 'unavailable' });
  await quiet(async () => {
    const screen = await mount(h, 'screens/SeasonsScreen.js');
    await screen.press('Save Spring collection to My lists');
    assert.ok(screen.button('Save Spring collection to My lists'), 'the heart is empty again');
    assert.deepEqual(screen.snackbar(), ['Couldn’t save. Check your connection.']);
    assert.deepEqual(kept(h), []);
  });
});

// ---------------------------------------------------------------- My lists

test('My lists shows kept collections apart from lists, opens them, and can let them go', async () => {
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit' },
    'users/audit/savedCollections/vancouver-summer': { collectionId: 'vancouver-summer', cityId: 'vancouver', savedAt: 2 },
    'users/audit/savedCollections/vancouver-fall': { collectionId: 'vancouver-fall', cityId: 'vancouver', savedAt: 1 },
    'users/audit/savedCollections/retired-thing': { collectionId: 'retired-thing', cityId: 'vancouver', savedAt: 3 },
  } });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'lists' } });
  const texts = screen.texts();
  assert.ok(texts.includes('Collections'), texts.join(' | '));
  const fallTile = `Fall, Vancouver · ${fallSpotNames.length} spots`;
  assert.ok(screen.button(fallTile));
  assert.ok(screen.button('Summer, Vancouver · 3 spots'));
  assert.ok(texts.indexOf('Fall') < texts.indexOf('Summer'), 'oldest first');
  assert.ok(!texts.join(' ').includes('retired'), 'a collection the app no longer makes is left out');
  assert.ok(texts.includes('No lists yet'), 'lists keep their own empty state');

  await screen.press(fallTile);
  assert.deepEqual(h.navigations.at(-1), ['FallDatesScreen']);

  await screen.press('Remove Summer collection from My lists');
  assert.equal(h.documents.get('users/audit/savedCollections/vancouver-summer'), undefined);
  assert.equal(screen.button('Summer, Vancouver · 3 spots'), undefined);
  assert.deepEqual(screen.snackbar(), ['Removed Summer from My lists', 'Undo']);
});

test('My lists with no lists and no collections suggests both ways to fill it', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'lists' } });
  assert.ok(screen.texts().includes('Make a list for a plan, a mood, or a whole season. Or tap the heart on a season to keep it here.'));
  assert.ok(!screen.texts().includes('Collections'));
});
