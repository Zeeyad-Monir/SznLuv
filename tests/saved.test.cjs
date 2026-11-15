// The Saved page and its two "View all" pages: search, filters and sort, previews, and hearts that stay put.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount } = require('./support.cjs');
const { DEFAULT_SAVED_FILTERS, filterSaved, isDefaultFilters } = require('../services/savedLibrary');

// ---------------------------------------------------------------- Search, filters and sort (pure)

const items = [
  { name: 'Maan Farms', meta: 'Abbotsford · Fall', season: 'Fall', savedAt: 3 },
  { name: 'Café Lookout', meta: 'North Vancouver', own: true, savedAt: 5 },
  { name: 'Buntzen Lake', meta: 'Anmore · Summer', season: 'Summer', savedAt: 1 },
  { name: 'Aldor Family Farm', meta: 'Langley · Fall', season: 'Fall' },
];
const names = list => list.map(item => item.name);

test('saved: newest first by default, with undated saves last and by name', () => {
  assert.deepEqual(names(filterSaved(items)), ['Café Lookout', 'Maan Farms', 'Buntzen Lake', 'Aldor Family Farm']);
  assert.deepEqual(names(filterSaved(items, { sort: 'name' })), ['Aldor Family Farm', 'Buntzen Lake', 'Café Lookout', 'Maan Farms']);
  assert.deepEqual(names(filterSaved(items, { sort: 'season' })), ['Aldor Family Farm', 'Maan Farms', 'Buntzen Lake', 'Café Lookout'],
    'Fall to Summer, then spots without a season');
});

test('saved: search matches every word against the name, place and season, ignoring case and accents', () => {
  assert.deepEqual(names(filterSaved(items, { query: 'cafe' })), ['Café Lookout']);
  assert.deepEqual(names(filterSaved(items, { query: 'langley fall' })), ['Aldor Family Farm']);
  assert.deepEqual(names(filterSaved(items, { query: '  summer ' })), ['Buntzen Lake']);
  assert.deepEqual(filterSaved(items, { query: 'nowhere' }), []);
});

test('saved: seasons and spot type narrow the list; a season leaves out spots of your own', () => {
  assert.deepEqual(names(filterSaved(items, { seasons: ['Fall'], sort: 'name' })), ['Aldor Family Farm', 'Maan Farms']);
  assert.deepEqual(names(filterSaved(items, { type: 'own' })), ['Café Lookout']);
  assert.deepEqual(names(filterSaved(items, { type: 'sznluv', sort: 'name' })), ['Aldor Family Farm', 'Buntzen Lake', 'Maan Farms']);
  assert.ok(isDefaultFilters(DEFAULT_SAVED_FILTERS));
  assert.ok(!isDefaultFilters({ ...DEFAULT_SAVED_FILTERS, seasons: ['Fall'] }));
});

// ---------------------------------------------------------------- The page

const many = Object.fromEntries(['Aldor Family Farm', 'Eagle Acres Dairy', 'Laity Pumpkin Patch', 'Richmond Country Farms',
  'Westham Island Herb Farm', 'Hazelmere Pumpkin Patch', 'Maan Farms'].map((name, index) => [name, {
  isFavourite: true, season: 'Fall', location: '', savedAt: 100 - index,
}]));
const libraryDocs = () => ({
  'users/audit': { username: 'audit' },
  'favourites/audit': { listsMigratedAt: 1, ...many },
  'users/audit/savedCollections/vancouver-fall': { collectionId: 'vancouver-fall', cityId: 'vancouver', savedAt: 1 },
});
const type = async (screen, label, value) => {
  const input = screen.all('TextInput').find(node => node.props.accessibilityLabel === label);
  assert.ok(input, `no field "${label}"`);
  await act(async () => input.props.onChangeText(value));
};

test('saved page: a preview of five spots, with "View all" for the rest', async () => {
  const h = createHarness({ documents: libraryDocs() });
  const screen = await mount(h, 'screens/Favourites.js');
  const texts = screen.texts();
  assert.ok(texts.includes('7 spots') && texts.includes('1 collection'), texts.join(' | '));
  assert.ok(texts.includes('Aldor Family Farm') && texts.includes('Westham Island Herb Farm'));
  assert.ok(!texts.includes('Hazelmere Pumpkin Patch') && !texts.includes('Maan Farms'), 'only the five most recent are previewed');
  assert.ok(texts.includes('See all 7 spots'));
  // The Saved colour, with the same 16-point gap between cards as list and collection pages.
  const { colors } = h.load('components/theme.js');
  const cards = screen.all('View').map(node => Object.assign({}, ...[node.props.style].flat(Infinity)))
    .filter(style => style.backgroundColor === colors.savedCard && style.borderRadius === 14);
  assert.equal(cards.length, 5);
  assert.ok(cards.every(style => style.marginBottom === 16));

  await screen.press('View all 7 saved spots');
  assert.deepEqual(h.navigations.at(-1), ['SavedSpots']);
  await screen.press('See all 7 spots');
  assert.deepEqual(h.navigations.at(-1), ['SavedSpots']);
});

test('saved page: search narrows the collections and the spots together', async () => {
  const h = createHarness({ documents: libraryDocs() });
  const screen = await mount(h, 'screens/Favourites.js');
  await type(screen, 'Search your saved', 'maan');
  let texts = screen.texts();
  assert.ok(texts.includes('Maan Farms'), texts.join(' | '));
  assert.ok(!texts.includes('Aldor Family Farm'));
  assert.ok(texts.includes('No collections match.'));
  assert.ok(texts.includes('1 match'));

  await type(screen, 'Search your saved', 'fall');
  texts = screen.texts();
  assert.ok(screen.all('TouchableOpacity').some(node => /^Fall, Vancouver · \d+ spots$/.test(node.props.accessibilityLabel ?? '')),
    'the Fall collection matches its season');
  assert.ok(texts.includes('7 matches'));
});

test('saved spots page: every spot, Add Your Own Spot, and the sort', async () => {
  const h = createHarness({ documents: libraryDocs() });
  const screen = await mount(h, 'screens/SavedSpotsScreen.js');
  const texts = screen.texts();
  assert.ok(texts.includes('Saved Spots') && texts.includes('7 spots'), texts.join(' | '));
  assert.ok(texts.includes('Maan Farms'), 'the full list, not a preview');
  assert.ok(texts.indexOf('Aldor Family Farm') < texts.indexOf('Maan Farms'), 'most recently saved first');
  assert.ok(screen.button('Sort: Recently saved'));
  await screen.press('Add Your Own Spot');
  assert.deepEqual(h.navigations.at(-1), ['OwnSpotScreen', { from: 'saved' }]);

  await type(screen, 'Search your saved spots', 'pumpkin');
  assert.ok(screen.texts().includes('2 of 7 spots'));
  await type(screen, 'Search your saved spots', 'nowhere');
  assert.ok(screen.texts().includes('No spots match'));
  await screen.press('Clear search');
  assert.ok(screen.texts().includes('7 spots'));
});

test('saved collections page: a grid of every kept collection that opens and can be let go', async () => {
  const h = createHarness({ documents: libraryDocs() });
  const screen = await mount(h, 'screens/SavedCollectionsScreen.js');
  assert.ok(screen.texts().includes('Saved Collections') && screen.texts().includes('1 collection'), screen.texts().join(' | '));
  const tile = screen.all('TouchableOpacity').find(node => /^Fall, Vancouver · \d+ spots$/.test(node.props.accessibilityLabel ?? ''));
  await act(async () => tile.props.onPress());
  assert.deepEqual(h.navigations.at(-1), ['FallDatesScreen']);
  await screen.press('Remove Fall collection from Saved');
  assert.equal(h.documents.get('users/audit/savedCollections/vancouver-fall'), undefined);
  assert.ok(screen.button('Save Fall collection'), 'it stays until the page is left');
});
